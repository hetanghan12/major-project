/**
 * XLSX Preview Routes - Serve Spreadsheet Previews
 * ================================================
 *
 * All routes require authentication and document access.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { parseXlsxFile, CONFIG } = require('../services/xlsx-parser.service');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { resolveDoc } = require('../services/firestore.service');
const { checkAccess } = require('../services/share.service');

async function getAccessibleSpreadsheetDocument(userId, documentId) {
    const access = await checkAccess(userId, documentId, null);
    if (!access.allowed) {
        return { status: 403, error: 'Access denied' };
    }

    const resolved = await resolveDoc(documentId);
    if (!resolved.exists || !resolved.data) {
        return { status: 404, error: 'Document not found' };
    }

    return { status: 200, document: resolved.data, access };
}

function getPreviewPaths(documentId) {
    return {
        previewPath: path.join(CONFIG.PREVIEW_DIR, `${documentId}.html`),
        sheetsPath: path.join(CONFIG.PREVIEW_DIR, `${documentId}.json`)
    };
}

async function regeneratePreview(document, documentId) {
    return parseXlsxFile(document.storagePath || null, documentId, document.s3Key || null);
}

router.get('/preview/:documentId', verifyFirebaseToken, async (req, res) => {
    const { documentId } = req.params;
    const accessResult = await getAccessibleSpreadsheetDocument(req.user.uid, documentId);

    if (accessResult.status !== 200) {
        return res.status(accessResult.status).json({ success: false, error: accessResult.error });
    }

    const { previewPath } = getPreviewPaths(documentId);
    if (!fs.existsSync(previewPath)) {
        return res.status(404).json({
            success: false,
            error: 'Preview not found. File may still be processing.'
        });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(previewPath);
});

router.get('/sheets/:documentId', verifyFirebaseToken, async (req, res) => {
    const { documentId } = req.params;
    const accessResult = await getAccessibleSpreadsheetDocument(req.user.uid, documentId);

    if (accessResult.status !== 200) {
        return res.status(accessResult.status).json({ success: false, error: accessResult.error });
    }

    const { sheetsPath } = getPreviewPaths(documentId);
    if (!fs.existsSync(sheetsPath)) {
        return res.status(404).json({ success: false, error: 'Sheet data not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
        return res.json({ success: true, ...data });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to read sheet data' });
    }
});

router.get('/sheet/:documentId/:sheetIndex', verifyFirebaseToken, async (req, res) => {
    const { documentId, sheetIndex } = req.params;
    const index = parseInt(sheetIndex, 10);
    const accessResult = await getAccessibleSpreadsheetDocument(req.user.uid, documentId);

    if (accessResult.status !== 200) {
        return res.status(accessResult.status).json({ success: false, error: accessResult.error });
    }

    const { sheetsPath } = getPreviewPaths(documentId);
    if (!fs.existsSync(sheetsPath)) {
        return res.status(404).json({ success: false, error: 'Sheet data not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
        const sheet = data.sheets[index];

        if (!sheet) {
            return res.status(404).json({ success: false, error: 'Sheet not found' });
        }

        return res.json({ success: true, sheet });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to read sheet data' });
    }
});

router.post('/regenerate/:documentId', verifyFirebaseToken, async (req, res) => {
    const { documentId } = req.params;
    const accessResult = await getAccessibleSpreadsheetDocument(req.user.uid, documentId);

    if (accessResult.status !== 200) {
        return res.status(accessResult.status).json({ success: false, error: accessResult.error });
    }

    const { document, access } = accessResult;
    if (!access.isOwner) {
        return res.status(403).json({ success: false, error: 'Only the owner can regenerate previews' });
    }

    if (!document.s3Key && !document.storagePath) {
        return res.status(400).json({ success: false, error: 'No valid file source found for this spreadsheet' });
    }

    try {
        const result = await regeneratePreview(document, documentId);
        return res.json({
            success: true,
            message: 'Preview regenerated',
            ...result
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

router.get('/status/:documentId', verifyFirebaseToken, async (req, res) => {
    const { documentId } = req.params;
    const shouldGenerate = req.query.generate === 'true';
    const accessResult = await getAccessibleSpreadsheetDocument(req.user.uid, documentId);

    if (accessResult.status !== 200) {
        return res.status(accessResult.status).json({ success: false, error: accessResult.error });
    }

    const { document, access } = accessResult;
    const { previewPath, sheetsPath } = getPreviewPaths(documentId);
    let hasPreview = fs.existsSync(previewPath);
    let hasSheets = fs.existsSync(sheetsPath);

    if (!hasPreview && shouldGenerate) {
        if (!access.isOwner) {
            return res.status(403).json({ success: false, error: 'Only the owner can generate previews' });
        }

        try {
            if (document.s3Key || (document.storagePath && fs.existsSync(document.storagePath))) {
                await regeneratePreview(document, documentId);
                hasPreview = fs.existsSync(previewPath);
                hasSheets = fs.existsSync(sheetsPath);
            }
        } catch (error) {
            console.error(`XLSX preview auto-generation failed for ${documentId}:`, error.message);
        }
    }

    let metadata = null;
    if (hasSheets) {
        try {
            const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
            metadata = {
                sheetCount: data.sheets?.length || 0,
                sheetNames: data.sheets?.map((sheet) => sheet.name) || []
            };
        } catch (error) {
            metadata = null;
        }
    }

    return res.json({
        success: true,
        documentId,
        hasPreview,
        hasSheets,
        ready: hasPreview && hasSheets,
        metadata
    });
});

module.exports = router;
