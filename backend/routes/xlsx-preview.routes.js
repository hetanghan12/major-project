/**
 * XLSX Preview Routes - Serve Spreadsheet Previews
 * =================================================
 * 
 * API endpoints for:
 * - Serving HTML previews
 * - Getting sheet data as JSON
 * - Regenerating previews
 * 
 * @author CloudAI Spreadsheet Engine
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { parseXlsxFile, CONFIG } = require('../services/xlsx-parser.service');

// =============================================================================
// GET PREVIEW HTML
// =============================================================================

/**
 * GET /api/xlsx/preview/:documentId
 * 
 * Serves the interactive HTML preview for a spreadsheet
 */
router.get('/preview/:documentId', (req, res) => {
    const { documentId } = req.params;

    console.log(`📊 Serving XLSX preview: ${documentId}`);

    const previewPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.html`);

    if (!fs.existsSync(previewPath)) {
        console.log(`   ⚠️ Preview not found: ${previewPath}`);
        return res.status(404).json({
            success: false,
            error: 'Preview not found. File may still be processing.'
        });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(previewPath);
});

// =============================================================================
// GET SHEET DATA (JSON)
// =============================================================================

/**
 * GET /api/xlsx/sheets/:documentId
 * 
 * Returns sheet data as JSON for custom rendering
 */
router.get('/sheets/:documentId', (req, res) => {
    const { documentId } = req.params;

    console.log(`📊 Serving XLSX sheet data: ${documentId}`);

    const sheetsPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.json`);

    if (!fs.existsSync(sheetsPath)) {
        return res.status(404).json({
            success: false,
            error: 'Sheet data not found'
        });
    }

    try {
        const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
        res.json({
            success: true,
            ...data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to read sheet data'
        });
    }
});

// =============================================================================
// GET SINGLE SHEET
// =============================================================================

/**
 * GET /api/xlsx/sheet/:documentId/:sheetIndex
 * 
 * Returns data for a specific sheet (for lazy loading)
 */
router.get('/sheet/:documentId/:sheetIndex', (req, res) => {
    const { documentId, sheetIndex } = req.params;
    const index = parseInt(sheetIndex, 10);

    const sheetsPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.json`);

    if (!fs.existsSync(sheetsPath)) {
        return res.status(404).json({
            success: false,
            error: 'Sheet data not found'
        });
    }

    try {
        const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
        const sheet = data.sheets[index];

        if (!sheet) {
            return res.status(404).json({
                success: false,
                error: 'Sheet not found'
            });
        }

        res.json({
            success: true,
            sheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to read sheet data'
        });
    }
});

// =============================================================================
// REGENERATE PREVIEW
// =============================================================================

/**
 * POST /api/xlsx/regenerate/:documentId
 * 
 * Regenerates the preview for a specific document
 */
router.post('/regenerate/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({
            success: false,
            error: 'filePath is required'
        });
    }

    try {
        const result = await parseXlsxFile(filePath, documentId);
        res.json({
            success: true,
            message: 'Preview regenerated',
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// CHECK PREVIEW STATUS (with auto-generate option)
// =============================================================================

/**
 * GET /api/xlsx/status/:documentId
 * GET /api/xlsx/status/:documentId?generate=true
 * 
 * Check if preview exists for a document
 * If generate=true and preview doesn't exist, tries to generate it
 */
router.get('/status/:documentId', async (req, res) => {
    const { documentId } = req.params;
    const shouldGenerate = req.query.generate === 'true';

    const previewPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.html`);
    const sheetsPath = path.join(CONFIG.PREVIEW_DIR, `${documentId}.json`);

    let hasPreview = fs.existsSync(previewPath);
    let hasSheets = fs.existsSync(sheetsPath);

    // If preview doesn't exist and auto-generate is requested
    if (!hasPreview && shouldGenerate) {
        try {
            console.log(`📊 Auto-generating XLSX preview for: ${documentId}`);

            // Import Firestore to look up the document
            const { getFirestore } = require('../config/firebase.config');
            const db = getFirestore();

            // Find the document in Firestore
            const docRef = await db.collection('documents').doc(documentId).get();

            if (docRef.exists) {
                const docData = docRef.data();
                const filePath = docData.storagePath;

                if (filePath && fs.existsSync(filePath)) {
                    // Generate the preview
                    await parseXlsxFile(filePath, documentId);
                    hasPreview = fs.existsSync(previewPath);
                    hasSheets = fs.existsSync(sheetsPath);
                    console.log(`   ✅ XLSX preview generated successfully`);
                } else {
                    console.log(`   ⚠️ File not found at: ${filePath}`);
                }
            } else {
                console.log(`   ⚠️ Document not found in Firestore: ${documentId}`);
            }
        } catch (genError) {
            console.error(`   ❌ Auto-generate failed: ${genError.message}`);
        }
    }

    let metadata = null;
    if (hasSheets) {
        try {
            const data = JSON.parse(fs.readFileSync(sheetsPath, 'utf-8'));
            metadata = {
                sheetCount: data.sheets?.length || 0,
                sheetNames: data.sheets?.map(s => s.name) || []
            };
        } catch { }
    }

    res.json({
        success: true,
        documentId,
        hasPreview,
        hasSheets,
        ready: hasPreview && hasSheets,
        metadata
    });
});

module.exports = router;
