/**
 * SECURE Document Routes
 * =======================
 * Production-grade, multi-tenant document management API.
 * 
 * ============================================================================
 * SECURITY: MULTI-TENANT ISOLATION
 * ============================================================================
 * 
 * CRITICAL SECURITY RULES (NON-NEGOTIABLE):
 * 1. ALL endpoints require Firebase token authentication
 * 2. userId is ALWAYS extracted from verified token (req.user.uid)
 * 3. userId is NEVER accepted from frontend input
 * 4. All queries are filtered by userId
 * 5. All files are stored in user-scoped directories
 * 6. All Pinecone operations use namespace = userId
 * 
 * ATTACK PREVENTION:
 * ❌ User A cannot see User B's documents
 * ❌ User A cannot delete User B's documents  
 * ❌ User A cannot query User B's vectors
 * ❌ No unauthenticated access
 * 
 * @author Security Review - Production Fix
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Import auth middleware - REQUIRED for all routes
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// Import services
const { extractText, chunkText } = require('../services/textExtraction.service');
const { processAndStoreEmbeddings, deleteDocumentEmbeddings } = require('../services/embedding.service');
const { saveDocument, getUserDocuments, getDocument, updateDocumentStatus, updateDocument, deleteDocument, getDocumentStatus, resolveDoc } = require('../services/firestore.service');
const { recordAuditLog, getFileAuditLogs } = require('../services/audit.service');

// Import S3 service for cloud storage
const { uploadToS3, getDownloadUrl, getDownloadStream, deleteFromS3, generateS3Key } = require('../services/s3.service');

// Import SECURE deletion service - atomic deletion across all storage layers
const { secureDeleteDocument } = require('../services/deletion.service');

// Import share access middleware and cleanup
const { checkDocumentAccess } = require('../middlewares/share-access.middleware');
const { revokeSharesOnDelete } = require('../services/share.service');

// Import storage quota service - for checking limits before upload
const { checkStorageQuota, checkUploadLimit, recalculateUserStorage, incrementUserStats } = require('../services/storage-quota.service');

// Import upload progress service - for real-time progress tracking
const {
    createUploadProgress,
    updateStageProgress,
    completeUpload,
    failUpload,
    cancelUpload, // Added for cancellation support
    isCancelled   // Added for cancellation support
} = require('../services/upload-progress.service');

// Import DOCX preview service - for HTML preview generation
const {
    convertDocxToHtml,
    hasPreview
} = require('../services/docx-preview.service');

// Import Dashboard Controller
const { getUserDashboardData } = require('../controllers/user-dashboard.controller');

// Import thumbnail queue service - for async Google Drive-style previews
const { queueThumbnailJob } = require('../services/thumbnail-queue.service');

// Import XLSX parser service - for spreadsheet preview generation
const { parseXlsxFile } = require('../services/xlsx-parser.service');

// Import Analytics Service
const { logFileUpload, logSecurityEvent, trackFolderCreation, trackAiRequest, calculateCost } = require('../services/analytics.service');

// Import Notification Service
const { createNotification } = require('../services/notification.service');

// =============================================================================
// CONFIGURATION
// =============================================================================

// Dynamic settings service
const settingsService = require('../services/settings.service');

const BASE_STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Default limits to prevent severe abuse before settings are fetched
const MAX_UPLOAD_LIMIT_MB = 1000;
const MAX_FILE_SIZE = MAX_UPLOAD_LIMIT_MB * 1024 * 1024;



const { ApiError } = require('../middlewares/error.middleware');

/**
 * SECURITY: Get user-isolated storage directory
 * Creates: storage/users/{userId}/documents/
 * 
 * @param {string} userId - From verified Firebase token ONLY
 */
function getUserStorageDir(userId) {
    console.log(`getUserStorageDir called for userId: "${userId}"`);

    // SECURITY: Validate userId format (prevent path traversal)
    // ALLOW: Alphanumeric, hyphens, underscores, periods, @, colons (standard UID chars)
    // BLOCK: Path separators and parent directory references
    if (!userId || typeof userId !== 'string' || userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
        console.error(`🚨 SECURITY VIOLATION: Invalid userId format: "${userId}"`);
        // Throw ApiError (400) so the specific message reaches the client
        throw new ApiError(400, `Invalid User ID format: "${userId}". Please contact support.`);
    }

    // Double check specific strict regex if needed, but allow standard UID chars
    if (!/^[a-zA-Z0-9\-_@.]+$/.test(userId)) {
        console.error(`🚨 SECURITY VIOLATION: UserId contains invalid characters: "${userId}"`);
        throw new ApiError(400, `Invalid characters in User ID: "${userId}"`);
    }

    const userDir = path.join(BASE_STORAGE_DIR, 'users', userId, 'documents');
    console.log(`User directory resolved to: ${userDir}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(userDir)) {
        try {
            console.log(`Creating directory: ${userDir}`);
            fs.mkdirSync(userDir, { recursive: true });
            console.log(`📁 Created user storage directory: ${userDir}`);
        } catch (err) {
            console.error(`❌ Failed to create user directory: ${userDir}`, err);
            throw err;
        }
    }

    return userDir;
}

// =============================================================================
// MULTER CONFIGURATION (User-Isolated Storage)
// =============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // SECURITY: req.user is set by verifyFirebaseToken middleware
        // This ensures user isolation at the filesystem level
        const userId = req.user?.uid;
        console.log(`Multer destination hook called. Authenticated userId: ${userId}`);

        if (!userId) {
            console.error('🚨 SECURITY VIOLATION: Multer destination called without userId (req.user is undefined)');
            return cb(new Error('SECURITY VIOLATION: No authenticated user'), null);
        }

        try {
            const userDir = getUserStorageDir(userId);
            cb(null, userDir);
        } catch (error) {
            console.error(`❌ getUserStorageDir failed for user ${userId}:`, error.message);
            cb(error, null);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        console.log(`Multer filename generated: ${timestamp}-${safeName}`);
        cb(null, `${timestamp}-${safeName}`);
    }
});

const fileFilter = (req, file, cb) => {
    // SECURITY: We now handle specific allowed types inside the route handler
    // to allow for dynamic, admin-controlled file types without restarting the server.
    // Multer's fileFilter is synchronous and doesn't easily support dynamic DB lookups.
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// =============================================================================
// ROUTES - ALL REQUIRE AUTHENTICATION
// =============================================================================

/**
 * Bulk update trash status (SOFT DELETE)
 * POST /api/secure/documents/bulk-update-trash
 */
router.post('/bulk-update-trash',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { fileIds, isTrashed } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        console.log(`\n🗑️  ========== BULK TRASH UPDATE ==========`);
        console.log(`   User: ${userId}`);
        console.log(`   Items: ${fileIds.length}`);
        console.log(`   Status: ${isTrashed ? 'Trash' : 'Restore'}`);

        const results = { success: [], failed: [] };

        try {
            const { getFirestore } = require('../config/firebase.config');
            const db = getFirestore();
            const batch = db.batch();

            for (const fileId of fileIds) {
                try {
                    const { exists, docRef, data } = await resolveDoc(fileId);

                    if (exists) {
                        const ownerId = data.ownerUserId || data.userId;
                        console.log(`      [BULK-TRASH] Item: ${fileId}, Owner: ${ownerId}, TargetUser: ${userId}`);

                        if (ownerId === userId) {
                            batch.update(docRef, {
                                isTrashed,
                                status: isTrashed ? 'trash' : 'completed',
                                updatedAt: new Date().toISOString()
                            });
                            results.success.push(fileId);
                        } else {
                            console.error(`      [BULK-TRASH] 🚨 PERMISSION DENIED for ${fileId}`);
                            results.failed.push({ id: fileId, error: 'Permission denied' });
                        }
                    } else {
                        console.error(`      [BULK-TRASH] 🚨 NOT FOUND: ${fileId}`);
                        results.failed.push({ id: fileId, error: 'Not found' });
                    }
                } catch (itemErr) {
                    console.error(`      [BULK-TRASH] ❌ Error processing item ${fileId}: ${itemErr.message}`);
                    results.failed.push({ id: fileId, error: itemErr.message });
                }
            }

            if (results.success.length > 0) {
                await batch.commit();
                console.log(`   ✅ Committed batch for ${results.success.length} items`);
            }

            // Recalculate stats as trashed files might be handled differently in some views
            await recalculateUserStorage(userId);

            res.json({
                success: true,
                message: `Updated ${results.success.length} items`,
                results
            });

        } catch (error) {
            console.error(`❌ Bulk trash failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Get public system configuration (allowed types, max size)
 * GET /api/secure/documents/config
 */
router.get('/config', verifyFirebaseToken, async (req, res) => {
    try {
        const settings = await settingsService.getSettings();
        res.json({
            success: true,
            config: {
                allowedFileTypes: settings.securitySettings.allowedFileTypes,
                maxFileSizeMB: settings.maxFileSizeMB || 50
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch config' });
    }
});

/**
 * Check if the document processing should continue
 * @param {string} documentId 
 * @returns {Promise<boolean>}
 */
async function isActive(documentId) {
    const status = await getDocumentStatus(documentId);
    if (status === 'cancelled' || status === 'failed') {
        return false;
    }
    return true;
}

/**
 * Upload document (SECURE)
 * POST /api/secure/documents/upload
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Stores file in user-isolated directory
 * - Stores vectors in user namespace
 * - STORES chunk IDs for atomic deletion
 * - No cross-user access possible
 * 
 * FEATURES:
 * - Checks storage quota before upload
 * - Tracks upload progress in real-time
 * - Returns uploadId for SSE progress subscription
 */
router.post('/upload',
    verifyFirebaseToken,  // MANDATORY: Authenticate first
    upload.single('file'),
    async (req, res) => {
        // SECURITY: userId from verified token ONLY
        const userId = req.user.uid;
        const email = req.user.email;

        console.log(`\n📤 ========== SECURE UPLOAD SERVER V2 ==========`);
        console.log(`   User: ${email} (${userId})`);

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // --- DYNAMIC SECURITY CHECKS (Admin Controlled) ---
        try {
            const settings = await settingsService.getSettings();

            // 1. Check Allowed Extensions
            const audioFallback = ["mp3", "wav", "ogg", "m4a", "mp4", "mov"];
            const allowedExts = settings.securitySettings.allowedFileTypes ?? ["pdf", "docx", "txt", "png", "jpg", "xlsx", "pptx", ...audioFallback];
            const ext = req.file.originalname.split('.').pop().toLowerCase();

            if (!allowedExts.includes(ext)) {
                console.warn(`🚨 SECURITY: Blocked unauthorized file type: .${ext} from user ${userId}`);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(403).json({
                    success: false,
                    message: `File type .${ext} is not allowed. Contact administrator.`
                });
            }

            // 2. Check Custom File Size Limit
            const maxMB = settings.maxFileSizeMB || 50;
            const maxBytes = maxMB * 1024 * 1024;
            if (req.file.size > maxBytes) {
                console.warn(`🚨 SECURITY: Blocked oversized file: ${req.file.size} bytes from user ${userId} (Limit: ${maxMB}MB)`);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                return res.status(413).json({
                    success: false,
                    message: `File too large. Maximum allowed size is ${maxMB}MB.`
                });
            }
        } catch (settingsError) {
            console.error('Settings check failed during upload:', settingsError.message);
        }


        const existingDocumentId = req.body.documentId;
        const documentId = existingDocumentId || uuidv4();
        const uploadId = documentId;  // Use documentId as uploadId for simplicity

        // SECURITY: For NEW uploads, the current user is always the owner.
        // As per USER request: Do NOT run permission check during upload.
        // Every upload creates a new record where current user = ownerUserId.
        let targetOwnerId = userId;

        const originalFileName = req.file.originalname;
        const fileType = path.extname(originalFileName).slice(1).toLowerCase();
        const localFilePath = req.file.path;
        const fileSize = req.file.size;

        // SECURITY: Always use the OWNER'S ID for isolation, even if an editor is uploading
        const pineconeNamespace = targetOwnerId;

        // Normalize parentFolderId
        const parentFolderId = req.body.parentFolderId === '' ? null : (req.body.parentFolderId || null);
        console.log(`   📂 Target Folder: ${parentFolderId || 'Root (My Drive)'}`);

        console.log(`   Document ID: ${documentId}`);
        console.log(`   Upload ID: ${uploadId}`);
        console.log(`   File: ${originalFileName}`);
        console.log(`   Size: ${fileSize} bytes`);
        console.log(`   Storage: ${localFilePath}`);
        console.log(`   Pinecone Namespace (Owner): ${pineconeNamespace}`);

        // FLAG: Track completion status for Case 3 (Page Refresh / Disconnect)
        let isUploadFinished = false;

        // ============================================================
        // CASE 3 PROTECTION: Handle client disconnection (Page Refresh)
        // ============================================================
        req.on('close', async () => {
            if (!isUploadFinished) {
                console.log(`\n   ⚠️ CONNECTION CLOSED: Client disconnected or refreshed page for ${uploadId}`);
                console.log(`   ⏹️ Triggering implicit cancellation for ${originalFileName}`);

                // 1. Mark in memory as cancelled
                cancelUpload(uploadId);

                // 2. Mark in Firestore as cancelled (this will trigger isActive checkpoints)
                try {
                    await updateDocumentStatus(documentId, 'cancelled', {
                        error: 'Upload aborted by user (page refresh/disconnect)'
                    });
                } catch (e) {
                    // Silently fail if doc doesn't exist yet
                }
            }
        });

        // ============================================================
        // STEP 0.1: VALIDATE ALLOWED FILE TYPES (Security Settings)
        // ============================================================
        try {
            const { getFirestore } = require('../config/firebase.config');
            const db = getFirestore();
            const data = settingsDoc.exists ? settingsDoc.data() : {};
            const securitySettings = data.securitySettings || {};
            const audioFallback = ["mp3", "wav", "ogg", "m4a", "mp4", "mov"];
            const allowedFileTypes = securitySettings.allowedFileTypes ?? ["pdf", "docx", "txt", "png", "jpg", "xlsx", "pptx", ...audioFallback];

            // Perform strict extension check
            if (!allowedFileTypes.includes(fileType)) {
                console.error(`   ❌ FILE TYPE NOT ALLOWED: ${fileType} (Allowed: ${allowedFileTypes.join(', ')})`);

                // Secure Cleanup: Delete the file that multer already saved to storage
                if (fs.existsSync(localFilePath)) {
                    fs.unlinkSync(localFilePath);
                    console.log(`   🧹 Secure Cleanup: Deleted unauthorized file type: ${localFilePath}`);
                }

                return res.status(403).json({
                    success: false,
                    message: "This file type is not allowed."
                });
            }
            console.log(`   ✅ File type validation passed: ${fileType}`);
        } catch (settingsError) {
            console.error(`   ⚠️ Security settings check failed: ${settingsError.message}`);
            // If settings can't be fetched, we default to the standard safe list as fallback
        }

        // ============================================================
        // STEP 0.2: VALIDATE PLAN LIMITS (Upload Size & Storage Quota)
        // ============================================================
        try {
            console.log(`\n   📊 Validating plan limits...`);

            // A. Individual File Size Limit
            const sizeCheck = await checkUploadLimit(userId, fileSize);
            if (!sizeCheck.canUpload) {
                console.error(`   ❌ UPLOAD LIMIT EXCEEDED: ${sizeCheck.message}`);
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                return res.status(413).json({
                    success: false,
                    message: sizeCheck.message,
                    error: 'UPLOAD_LIMIT_EXCEEDED'
                });
            }

            // B. Total Storage Quota
            const quotaCheck = await checkStorageQuota(userId, fileSize);
            if (!quotaCheck.canUpload) {
                console.error(`   ❌ STORAGE QUOTA EXCEEDED: ${quotaCheck.message}`);
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                return res.status(413).json({
                    success: false,
                    message: quotaCheck.message,
                    error: 'QUOTA_EXCEEDED',
                    storage: {
                        currentUsage: quotaCheck.currentUsage,
                        limit: quotaCheck.limitBytes,
                        fileSize: fileSize,
                        remaining: quotaCheck.remainingBytes
                    }
                });
            }

            console.log(`   ✅ Plan limits passed (${quotaCheck.remainingBytes} bytes remaining)`);
        } catch (validationError) {
            console.error(`   ⚠️ Limit validation failed: ${validationError.message}`);
            // Continue with upload - don't block if service fails
        }

        // Initialize upload progress tracking
        createUploadProgress(uploadId, userId, originalFileName, fileSize, localFilePath);
        updateStageProgress(uploadId, 'receiving', 100);  // File already received by multer

        // Track data for complete deletion later
        let vectorCount = 0;
        let chunkIds = [];
        let s3Key = null;
        let s3Url = null;

        try {
            updateStageProgress(uploadId, 's3', 10);

            // ============================================================
            // SCHEMA FIX: Create document with 'uploading' status
            // ============================================================
            if (isCancelled(uploadId) || !(await isActive(documentId))) {
                console.log(`   ⏹️ Process aborted: Cancellation detected before saveDocument for ${originalFileName}`);
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                return;
            }

            await saveDocument({
                documentId,
                uploadId: documentId, // Added for new schema
                userId: targetOwnerId,  // SECURITY: Preserve/Use the actual OWNER ID
                lastEditedBy: userId,  // TRACKING: The person who is actually performing this edit/upload
                fileName: originalFileName,
                fileType,
                fileSize: fileSize,
                parentFolderId: parentFolderId,
                storagePath: localFilePath,
                publicUrl: '',
                storageUrl: null, // Initial null
                createdAt: new Date(), // Required timestamp
                pineconeNamespace,
                chunkIds: [],
                vectorCount: 0,
                status: 'uploading'  // Rule 1: Starts as uploading
            });

            // ============================================================
            // STEP 2: Extract text from document
            // ============================================
            updateStageProgress(uploadId, 's3', 30);

            if (isCancelled(uploadId) || !(await isActive(documentId))) {
                console.log(`   ⏹️ Process halted: Cancellation/Failure detected before extraction for ${uploadId}`);
                // Complete Cleanup
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                await deleteDocument(documentId);
                return;
            }

            // Rule 2: Change status to 'processing'
            if (!(await updateDocumentStatus(documentId, 'processing'))) {
                console.log(`   ⏹️ Process halted: Could not set status to processing (already cancelled)`);
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                await deleteDocument(documentId);
                return;
            }

            let extractedText = '';
            try {
                const mimeType = req.file.mimetype;
                extractedText = await extractText(localFilePath, mimeType);
                console.log(`   ✅ Extracted ${extractedText.length} characters`);
            } catch (extractError) {
                console.error(`   ⚠️ Text extraction failed: ${extractError.message}`);
            }

            // ============================================================
            // STEP 2.5: Generate DOCX HTML Preview (if DOCX)
            // ============================================================
            const isDocxFile = fileType === 'docx' || fileType === 'doc' ||
                req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                req.file.mimetype === 'application/msword';

            if (isDocxFile) {
                try {
                    console.log(`   📄 Generating DOCX preview...`);
                    const previewResult = await convertDocxToHtml(localFilePath, documentId);
                    console.log(`   ✅ DOCX preview generated: ${previewResult.htmlPath}`);

                    // If text extraction failed earlier, use the preview text
                    if (!extractedText && previewResult.textContent) {
                        extractedText = previewResult.textContent;
                        console.log(`   ✅ Using preview text: ${extractedText.length} characters`);
                    }
                } catch (previewError) {
                    console.error(`   ⚠️ DOCX preview generation failed: ${previewError.message}`);
                    // Don't fail the upload - preview is optional
                }
            }

            // ============================================================
            // STEP 3: Generate embeddings and store in Pinecone
            // CRITICAL: Capture chunk IDs for later deletion
            // ============================================================
            updateStageProgress(uploadId, 'processing', 10);

            if (isCancelled(uploadId) || !(await isActive(documentId))) {
                console.log(`   ⏹️ Process halted: Cancellation/Failure detected before embedding for ${uploadId}`);
                // Complete Cleanup
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                await deleteDocument(documentId);
                return;
            }

            if (extractedText && extractedText.length > 0) {
                try {
                    const chunks = chunkText(extractedText);
                    // SECURITY: processAndStoreEmbeddings uses userId as namespace
                    const result = await processAndStoreEmbeddings(
                        targetOwnerId,  // SECURITY: Pinecone namespace = OWNER ID
                        documentId,
                        originalFileName,
                        chunks,
                        { checkCancellation: async () => isCancelled(uploadId) || !(await isActive(documentId)) }
                    );

                    vectorCount = result.vectorCount || 0;
                    chunkIds = result.chunkIds || [];  // CRITICAL: Capture for deletion

                    // Log AI Usage for Embeddings (Production Fix)
                    if (result.usage && result.usage.total_tokens > 0) {
                        const model = 'text-embedding-3-large';
                        const cost = calculateCost(model, result.usage);
                        trackAiRequest({
                            userId: targetOwnerId,
                            tokens: result.usage.total_tokens,
                            prompt_tokens: result.usage.prompt_tokens,
                            cost: cost,
                            model: model,
                            type: 'DOCUMENT_PROCESSING'
                        }).catch(e => console.error('   ⚠️ Failed to log document processing usage:', e.message));
                    }

                    console.log(`   ✅ Stored ${vectorCount} vectors in namespace: ${userId}`);
                    console.log(`   🔑 Chunk IDs stored: ${chunkIds.length}`);
                    updateStageProgress(uploadId, 'processing', 70);

                    // Log warning if no vectors were generated (but don't fail the upload)
                    if (vectorCount === 0) {
                        console.warn(`   ⚠️ WARNING: No vectors were generated. Document uploaded but AI search won't work for this file.`);
                    }
                } catch (embeddingError) {
                    if (embeddingError.message === 'EMBEDDING_CANCELLED' || isCancelled(uploadId)) {
                        console.log(`   ⏹️ Embedding aborted due to cancellation: ${embeddingError.message}`);
                        throw embeddingError; // Re-throw to trigger cleanup
                    }
                    // Log the error but DON'T fail the upload
                    // Document is still stored, just without AI search capability
                    console.error(`   ⚠️ Embedding failed: ${embeddingError.message}`);
                    console.log(`   📁 Document will be stored without AI search capability`);
                    // Don't throw - allow upload to continue
                }
            } else {
                // No text extracted - this is OK for images, scanned PDFs, etc.
                console.log(`   ⚠️ No text extracted from document (this is normal for images/scanned PDFs)`);
                console.log(`   📁 Document will be stored without AI search capability`);
            }

            // ============================================================
            // STEP 4: UPLOAD TO AWS S3
            // ============================================================
            updateStageProgress(uploadId, 's3', 50);

            if (isCancelled(uploadId) || !(await isActive(documentId))) {
                console.log(`   ⏹️ Process halted: Cancellation/Failure detected before S3 upload for ${uploadId}`);
                // Complete Cleanup
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                await deleteDocument(documentId);
                // SECURITY: Delete any vectors already stored in namespace
                await deleteDocumentEmbeddings(targetOwnerId, documentId);
                return;
            }

            try {
                s3Key = generateS3Key(targetOwnerId, documentId, originalFileName);
                const s3Result = await uploadToS3(localFilePath, s3Key, req.file.mimetype);
                s3Url = s3Result.s3Url;
                console.log(`   ☁️ Uploaded to S3: ${s3Key}`);
                updateStageProgress(uploadId, 's3', 90);
            } catch (s3Error) {
                console.error(`   ⚠️ S3 upload failed: ${s3Error.message}`);
                console.log(`   📁 File stored locally only (S3 unavailable)`);
                s3Key = null;
                // Don't fail the upload - file is still stored locally
            }

            // ============================================================
            // STEP 5: Rule 3 - change status = "completed"
            // ============================================================
            updateStageProgress(uploadId, 'processing', 90);

            if (isCancelled(uploadId) || !(await isActive(documentId))) {
                console.log(`   ⏹️ Process halted: Cancellation/Failure detected before final completion for ${uploadId}`);
                // Complete Cleanup
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                await deleteDocument(documentId);
                if (s3Key) await deleteFromS3(s3Key);
                // SECURITY: Delete any vectors already stored in namespace
                await deleteDocumentEmbeddings(targetOwnerId, documentId);
                return;
            }

            if (!(await updateDocumentStatus(documentId, 'completed', {
                vectorCount,
                chunkIds,
                pineconeNamespace,
                s3Key: s3Key,
                s3Url: s3Url,
                storageUrl: s3Url, // Matching requested schema
                publicUrl: s3Url,
                storagePath: null,
                status: 'completed' // Rule 3: Mark as completed
            }))) {
                console.log(`   ⏹️ Process halted: Could not set status to completed (already cancelled)`);
                if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
                if (s3Key) await deleteFromS3(s3Key);
                await deleteDocumentEmbeddings(userId, documentId);
                await deleteDocument(documentId);
                return;
            }

            // ============================================================
            // STEP 5.1: Update User Storage Statistics (INCREMENT)
            // ============================================================
            try {
                console.log(`   📊 Updating storage stats: +${fileSize} bytes, +1 file`);
                await incrementUserStats(targetOwnerId, fileSize, 1);
            } catch (statsErr) {
                console.warn(`   ⚠️ Storage stats update failed (non-blocking): ${statsErr.message}`);
            }

            // CLEANUP: Delete local file immediately after successful S3 upload
            if (fs.existsSync(localFilePath)) {
                try {
                    fs.unlinkSync(localFilePath);
                    console.log(`   🧹 Local cleanup: Deleted ${localFilePath}`);
                } catch (cleanupError) {
                    console.warn(`   ⚠️ Local cleanup failed: ${cleanupError.message}`);
                }
            }

            // ============================================================
            // STEP 5.5: Log to ANALYTICS and UPLOAD_ACTIVITY
            // ============================================================
            try {
                await logFileUpload({
                    userId: targetOwnerId, // Log against owner or uploader? Usually owner for storage tracking
                    uploaderId: userId,    // Track who actually did it
                    userEmail: email,
                    fileName: originalFileName,
                    fileType,
                    fileSize,
                    s3Key,
                    ipAddress: req.ip || req.connection.remoteAddress
                });
            } catch (analyticsLogErr) {
                console.error(`   ⚠️ Analytics logging failed: ${analyticsLogErr.message}`);
            }

            // ============================================================
            // STEP 6: Queue thumbnail generation (async - Google Drive style)
            // Thumbnail is generated in background and stored in S3
            // ============================================================
            let thumbnailJobId = null;
            try {
                console.log(`   🖼️ Queuing thumbnail generation for S3 Key: ${s3Key}`);
                thumbnailJobId = queueThumbnailJob({
                    filePath: null, // S3 Only - Thumbnail service needs update to handle S3 paths if needed, or disabled for now
                    documentId,
                    userId,
                    fileType,
                    fileName: originalFileName,
                    s3Key: s3Key // Pass S3 Key instead
                });
                console.log(`   ✅ Thumbnail job queued: ${thumbnailJobId}`);
            } catch (thumbError) {
                console.error(`   ⚠️ Thumbnail queue failed: ${thumbError.message}`);
                // Don't fail upload - thumbnail is optional
            }

            // ============================================================
            // STEP 7: Generate XLSX Preview (for spreadsheets)
            // Creates interactive HTML preview like Google Drive
            // ============================================================
            let xlsxPreviewPath = null;
            const isXlsx = fileType === 'xlsx' ||
                fileType === 'xls' ||
                fileType === 'csv' ||
                fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                fileType === 'application/vnd.ms-excel' ||
                fileType === 'text/csv' ||
                originalFileName.toLowerCase().endsWith('.xlsx') ||
                originalFileName.toLowerCase().endsWith('.xls') ||
                originalFileName.toLowerCase().endsWith('.csv');

            if (isXlsx) {
                try {
                    console.log(`   📊 Generating XLSX preview...`);
                    const xlsxResult = await parseXlsxFile(null, documentId, s3Key); // Update service to support S3 stream if possible
                    xlsxPreviewPath = xlsxResult.previewPath;
                    console.log(`   ✅ XLSX preview generated: ${xlsxResult.metadata.sheetCount} sheets`);
                } catch (xlsxError) {
                    console.error(`   ⚠️ XLSX preview failed: ${xlsxError.message}`);
                    // Don't fail upload - preview is optional
                }
            }

            // Mark upload as complete
            completeUpload(uploadId, { documentId, vectorCount, s3Key, thumbnailJobId, xlsxPreviewPath });

            // Trigger notification
            createNotification({
                userId,
                type: 'upload',
                message: `Your document "${originalFileName}" has been uploaded successfully.`,
                fileId: documentId
            }).catch(e => console.error('Failed to create upload notification:', e));

            console.log(`   ✅ UPLOAD COMPLETE`);
            console.log(`   📊 Deletion data stored:`);
            console.log(`      - S3 Key: ${s3Key || 'none'}`);
            console.log(`      - Chunk IDs: ${chunkIds.length}`);
            console.log(`      - Namespace: ${pineconeNamespace}`);
            console.log(`      - Thumbnail Job: ${thumbnailJobId || 'none'}`);
            console.log(`========== END SECURE UPLOAD ==========\n`);

            isUploadFinished = true;
            res.status(201).json({
                success: true,
                message: 'Document uploaded successfully',
                uploadId,  // Return uploadId for progress tracking
                document: {
                    documentId,
                    fileName: originalFileName,
                    fileType,
                    fileSize: fileSize,
                    vectorCount,
                    chunkIdsCount: chunkIds.length,  // Don't expose actual IDs
                    s3Key,
                    s3Url,
                    thumbnailUrl: null,
                    thumbnailStatus: 'processing',
                    status: 'completed',
                    uploadedAt: new Date().toISOString(),
                    createdAt: new Date()
                }
            });

        } catch (error) {
            isUploadFinished = true; // Stop disconnection handler
            console.error(`   ❌ Upload failed: ${error.message}`);
            console.error(error.stack);

            // Mark upload as failed for SSE clients
            failUpload(uploadId, error.message);

            // Cleanup on failure/cancellation
            if (fs.existsSync(localFilePath)) {
                try {
                    fs.unlinkSync(localFilePath);
                } catch (unlinkError) {
                    console.error(`   ⚠️ Failed to delete local file after error: ${unlinkError.message}`);
                }
            }

            // FULL CLEANUP: Delete any partial data from cloud storage
            try {
                if (s3Key) {
                    console.log(`   🧹 Error Cleanup: Deleting partial S3 object ${s3Key}`);
                    await deleteFromS3(s3Key);
                }

                // SECURITY: Delete any vectors already stored in namespace
                console.log(`   🧹 Error Cleanup: Deleting partial Pinecone vectors for ${documentId}`);
                await deleteDocumentEmbeddings(targetOwnerId, documentId);

                // Rule 2 & 5: Cleanup Firestore document if not a "failed" state should be "cancelled"
                if (isCancelled(uploadId)) {
                    await deleteDocument(documentId);
                }
            } catch (cleanupError) {
                console.error(`   ⚠️ Final cleanup failed: ${cleanupError.message}`);
            }

            try {
                await updateDocumentStatus(documentId, 'failed', { error: error.message });
            } catch (e) { }

            res.status(500).json({
                success: false,
                message: 'Upload failed: ' + error.message,
                uploadId
            });
        }
    }
);

// End of upload routes

/**
 * Create a new folder
 * POST /api/secure/documents/folder
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Folder is created with userId from verified token
 */
router.post('/folder', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { name } = req.body;
        // Handle parent folder (normalize '' to null)
        const parentFolderId = req.body.parentFolderId === '' ? null : (req.body.parentFolderId || null);
        console.log(`   📂 Creating Folder in: ${parentFolderId || 'Root (My Drive)'}`);

        if (!name) {
            return res.status(400).json({ success: false, message: 'Folder name is required' });
        }

        const folderId = uuidv4();

        const folderData = {
            documentId: folderId,
            userId,
            fileName: name,
            fileType: 'folder',
            fileSize: 0,
            isFolder: true,
            parentFolderId: parentFolderId || null,
            status: 'ready',
            uploadedAt: new Date().toISOString()
        };

        await saveDocument(folderData);
        
        // Update user stats (Increment folder count)
        await incrementUserStats(userId, 0, 1);

        // Track folder creation for dashboard stats
        trackFolderCreation().catch(err => console.error('Folder track failed:', err.message));

        console.log(`✅ Folder created: ${name} (${folderId}) for user ${userId}`);

        res.status(201).json({
            success: true,
            document: folderData
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
});


/**
 * Unified User Dashboard Data (Optimized)
 * GET /api/secure/documents/dashboard
 */
router.get('/dashboard', verifyFirebaseToken, getUserDashboardData);

/**
 * List user's documents (SECURE)
 * GET /api/secure/documents
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Returns ONLY documents where userId === req.user.uid
 * - No cross-user data leakage possible
 */
router.get('/',
    verifyFirebaseToken,  // MANDATORY
    async (req, res) => {
        const userId = req.user.uid;
        const { limit, lastDocId, filter } = req.query;

        console.log(`📋 [DOCS] Listing documents for user: ${userId} (Filter: ${filter || 'all'})`);

        try {
            // 1. Fetch from Firestore
            console.log(`   🔍 [DOCS] Querying Firestore...`);
            const result = await getUserDocuments(userId, {
                filter: filter || 'all'
            });

            if (!result || !result.documents) {
                console.warn(`   ⚠️ [DOCS] Service returned null/empty result for ${userId}`);
                return res.json({ success: true, count: 0, documents: [], pagination: { hasMore: false } });
            }

            console.log(`   ✅ [DOCS] Found ${result.documents.length} documents`);

            // 2. Map documents - preserve local /api/thumbnails/ URLs, only sign S3 URLs
            const mappedDocuments = await Promise.all(result.documents.map(async (doc) => {
                try {
                    // Start with doc.thumbnailUrl from Firestore
                    let thumbnailUrl = doc.thumbnailUrl || null;

                    // S3-First Thumbnail Strategy (to avoid Ngrok interstitial intercepting <img> tags)
                    // We only use the local thumbnail if S3 thumbnail is unavailable.
                    const docIdForThumb = doc.documentId || doc.id;
                    const localThumbPath = path.join(BASE_STORAGE_DIR, 'thumbnails', `${docIdForThumb}.png`);
                    
                    // Prefer doc.previewUrl (S3 version) if it's available in Firestore
                    let cloudUrl = doc.previewUrl || thumbnailUrl || null;
                    let hasCloudUrl = cloudUrl && typeof cloudUrl === 'string' && (cloudUrl.includes('.s3.') || cloudUrl.startsWith('http'));
                    
                    if (hasCloudUrl) {
                        try {
                            // If it's a cloud URL, we need a fresh signed version (S3 URLs expire)
                            let pathForSign = doc.previewPath;

                            if (!pathForSign && cloudUrl.startsWith('http')) {
                                try {
                                    const urlObj = new URL(cloudUrl);
                                    pathForSign = urlObj.pathname.substring(1);
                                } catch (urlErr) {
                                    pathForSign = null;
                                }
                            }

                            if (pathForSign) {
                                thumbnailUrl = await getDownloadUrl(pathForSign, 3600);
                            } else {
                                // If we can't sign it but it's already a cloud URL, use as is
                                thumbnailUrl = cloudUrl;
                            }
                        } catch (signErr) {
                            console.warn(`   ⚠️ [DOCS] Thumbnail signing failed for ${docIdForThumb}:`, signErr.message);
                            hasCloudUrl = false; // Fallback to local
                        }
                    }

                    // Fallback to local if no cloud URL or cloud URL failed
                    if (!hasCloudUrl && fs.existsSync(localThumbPath)) {
                        thumbnailUrl = `/api/thumbnails/${docIdForThumb}.png`;
                        console.log(`   🖼️  [THUMB] User ${userId}: Using LOCAL for ${docIdForThumb}`);
                    } else if (hasCloudUrl) {
                        console.log(`   ☁️  [THUMB] User ${userId}: Using S3 for ${docIdForThumb} -> ${thumbnailUrl ? thumbnailUrl.substring(0, 50) + '...' : 'NULL'}`);
                    } else {
                        console.log(`   ❌ [THUMB] User ${userId}: NO THUMBNAIL AVAILABLE for ${docIdForThumb}`);
                    }

                    return {
                        ...doc,
                        id: doc.id || doc.documentId,
                        thumbnailUrl: thumbnailUrl,
                        // Ensure critical fields exist
                        fileName: doc.fileName || 'Untitled File',
                        fileType: doc.fileType || 'unknown',
                        fileSize: doc.fileSize || 0,
                        uploadedAt: doc.uploadedAt || doc.createdAt || new Date().toISOString()
                    };
                } catch (mapErr) {
                    console.error(`   ❌ [DOCS] Failed to map document ${doc?.id || 'unknown'}:`, mapErr.message);
                    return doc; // Return raw doc as last resort
                }
            }));

            console.log(`   🚀 [DOCS] Sending ${mappedDocuments.length} mapped documents to client`);

            res.json({
                success: true,
                count: mappedDocuments.length,
                documents: mappedDocuments,
                pagination: {
                    lastDocId: result.lastDocId || null,
                    hasMore: result.hasMore || false
                }
            });

        } catch (error) {
            console.error(`   ❌ [DOCS] GET /api/secure/documents FATAL ERROR:`, error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching documents. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

/**
 * Get document details (SECURE)
 * GET /api/secure/documents/:id
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Verifies document.userId === req.user.uid
 * - Returns 403 if ownership mismatch
 */
router.get('/:id',
    verifyFirebaseToken,  // MANDATORY
    checkDocumentAccess(), // Sharing: owner OR active share
    async (req, res) => {
        const documentId = req.params.id;

        try {
            const document = await getDocument(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            // Generate fresh signed URL if S3 key exists (for direct frontend access)
            if (document.s3Key) {
                try {
                    // Generate a URL valid for 1 hour
                    const ViewUrl = await getDownloadUrl(document.s3Key, 3600);
                    document.signedUrl = ViewUrl;
                    document.downloadUrl = ViewUrl;
                } catch (e) {
                    console.error('Failed to generate signed URL:', e.message);
                }
            }

            // Generate thumbnail signed URL
            if (document.previewPath || (document.thumbnailUrl && typeof document.thumbnailUrl === 'string' && (document.thumbnailUrl.includes('.s3.') || document.thumbnailUrl.startsWith('http')))) {
                try {
                    let pathForSign = document.previewPath;
                    if (!pathForSign && document.thumbnailUrl) {
                        try {
                            if (document.thumbnailUrl.startsWith('http')) {
                                pathForSign = new URL(document.thumbnailUrl).pathname.substring(1);
                            } else {
                                pathForSign = document.thumbnailUrl;
                            }
                        } catch (e) {
                            pathForSign = document.thumbnailUrl;
                        }
                    }
                    if (pathForSign) {
                        document.thumbnailUrl = await getDownloadUrl(pathForSign, 3600);
                    }
                } catch (e) {
                    console.error('Failed to generate thumbnail URL:', e.message);
                }
            }

            // Attach access info for frontend
            document.accessInfo = req.accessInfo;

            res.json({
                success: true,
                document
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * Download/View document (SECURE)
 * GET /api/secure/documents/:id/download
 * GET /api/secure/documents/:id/download?view=true  (for inline preview)
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Verifies ownership before serving file
 */
router.get('/:id/download',
    verifyFirebaseToken,  // MANDATORY
    checkDocumentAccess('download'), // Sharing: requires 'download' permission
    async (req, res) => {
        const documentId = req.params.id;
        const viewMode = req.query.view === 'true';
        const returnJson = req.query.json === 'true';

        try {
            const document = await getDocument(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            // EXCLUSIVE S3 DOWNLOAD STRATEGY
            if (document.s3Key) {
                console.log(`   ☁️ Fetching from S3: ${document.s3Key}`);

                // Get pre-signed URL (1 hour validity)
                // Force download if requested via JSON (which means explicit download action)
                let disposition = null;
                if (returnJson) {
                    // Sanitize filename for header
                    const safeFileName = document.fileName.replace(/"/g, '\\"');
                    disposition = `attachment; filename="${safeFileName}"`;
                }

                const s3Url = await getDownloadUrl(document.s3Key, 3600, disposition);

                if (returnJson) {
                    return res.json({ success: true, downloadUrl: s3Url });
                }

                // Redirect client to S3 directly (Browser handles download)
                return res.redirect(s3Url);
            }

            // If no S3 Key, it's a legacy or failed file that doesn't exist in cloud
            return res.status(404).json({
                success: false,
                message: 'File not found on cloud storage'
            });

        } catch (error) {
            console.error(`Error serving file: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * View document content (SECURE) - Alternative endpoint for preview
 * GET /api/secure/documents/:id/view
 * 
 * Returns file content with appropriate content-type for inline viewing
 */
router.get('/:id/view',
    verifyFirebaseToken,
    checkDocumentAccess(), // Sharing: owner OR active share (view is minimum)
    async (req, res) => {
        const documentId = req.params.id;

        try {
            const document = await getDocument(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            // CHECK 1: Local File
            if (document.storagePath && fs.existsSync(document.storagePath)) {
                // Get MIME type
                const ext = path.extname(document.fileName).toLowerCase();
                const mimeTypes = {
                    '.pdf': 'application/pdf',
                    '.doc': 'application/msword',
                    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    '.txt': 'text/plain; charset=utf-8',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml',
                    '.json': 'application/json',
                    '.csv': 'text/csv',
                    '.xml': 'application/xml',
                    '.html': 'text/html',
                    '.css': 'text/css',
                    '.js': 'application/javascript',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.m4a': 'audio/x-m4a',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mov': 'video/quicktime'
                };

                const contentType = mimeTypes[ext] || 'application/octet-stream';
                const fileStats = fs.statSync(document.storagePath);

                // Set headers for inline viewing
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', fileStats.size);
                res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
                res.setHeader('Accept-Ranges', 'bytes');
                res.setHeader('Cache-Control', 'private, max-age=3600');

                // Stream the file
                const fileStream = fs.createReadStream(document.storagePath);
                fileStream.pipe(res);
                return;
            }

            // STRATEGY 2: Cloud Storage (S3) Stream Proxy (Universal Proxy)
            if (document.s3Key) {
                console.log(`   ☁️ [PROXY] UNIVERSAL STRATEGY for: ${document.s3Key}`);
                
                try {
                    // 1. Generate a signed URL (we know this works locally)
                    const s3Url = await getDownloadUrl(document.s3Key, 600); // 10 min
                    
                    // 2. Head the URL to get metadata (optional but good)
                    // Or just stream directly
                    const https = require('https');
                    
                    console.log(`   🔗 [PROXY] Streaming from signed URL...`);

                    https.get(s3Url, (s3Res) => {
                        if (s3Res.statusCode !== 200) {
                            console.error(`   ❌ [PROXY] S3 Fetch failed with status: ${s3Res.statusCode}`);
                            return res.status(s3Res.statusCode).send('Could not fetch from S3');
                        }

                        // Determine content type
                        let finalContentType = s3Res.headers['content-type'] || 'application/octet-stream';
                        const ext = path.extname(document.fileName).toLowerCase();
                        if (finalContentType === 'application/octet-stream' || finalContentType === 'binary/octet-stream') {
                             const audioTypes = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/x-m4a', '.mp4': 'video/mp4' };
                             if (audioTypes[ext]) finalContentType = audioTypes[ext];
                        }

                        // Proxy headers
                        res.setHeader('Content-Type', finalContentType);
                        if (s3Res.headers['content-length']) res.setHeader('Content-Length', s3Res.headers['content-length']);
                        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
                        res.setHeader('Cache-Control', 'private, max-age=3600');
                        res.setHeader('Accept-Ranges', 'bytes');

                        console.log(`   ✅ [PROXY] Proxy stream active. Type: ${finalContentType}`);

                        s3Res.pipe(res);
                    }).on('error', (err) => {
                        console.error(`   ❌ [PROXY] HTTPS error: ${err.message}`);
                        if (!res.headersSent) res.status(500).send('Proxy error');
                    });

                    return; // Done
                } catch (proxyError) {
                    console.error(`   ❌ [PROXY] Universal Proxy failed: ${proxyError.message}`);
                    return res.status(500).json({ success: false, message: 'Proxy failed' });
                }
            }

            return res.status(404).json({
                success: false,
                message: 'File not found on cloud storage'
            });

        } catch (error) {
            console.error(`Error viewing file: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * Get DOCX HTML Preview (SECURE)
 * GET /api/secure/documents/:id/preview
 * 
 * Returns pre-generated HTML preview for DOCX files.
 * For non-DOCX files, redirects to /view endpoint.
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Verifies ownership before serving preview
 */
router.get('/:id/preview',
    verifyFirebaseToken,
    checkDocumentAccess(), // Sharing: owner OR active share
    async (req, res) => {
        const documentId = req.params.id;
        console.log(`[PREVIEW] Request started for documentId: "${documentId}"`);

        try {
            const document = await getDocument(documentId);

            if (!document) {
                console.error(`[PREVIEW] getDocument(${documentId}) returned null!`);
                return res.status(404).json({
                    success: false,
                    message: 'Preview source document not found'
                });
            }
            console.log(`[PREVIEW] Document found: "${document.fileName}" (${document.fileType})`);

            const fileType = document.fileType?.toLowerCase() || '';
            const isDocx = fileType === 'docx' || fileType === 'doc' ||
                fileType.includes('word') || fileType.includes('document') ||
                fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            if (!isDocx) {
                // For non-DOCX files, redirect to the standard view/download route
                // logic handled by /:id/view which now supports S3
                return res.redirect(`/api/secure/documents/${documentId}/view`);
            }

            // Check if HTML preview exists
            const previewExists = hasPreview(documentId);

            if (!previewExists) {
                console.log(`[PREVIEW] HTML preview not found for ${documentId}. Generating...`);
                // Try to generate it on the fly
                try {
                    // Pass storagePath for legacy local files, and s3Key for new S3 files
                    await convertDocxToHtml(document.storagePath, documentId, document.s3Key);
                    console.log(`[PREVIEW] Regeneration SUCCESS for ${documentId}`);
                } catch (err) {
                    console.error(`[PREVIEW] Regeneration FAILED for ${documentId}: ${err.message}`);


                    // Fallback 1: S3 raw file
                    if (document.s3Key) {
                        try {
                            const s3Url = await getDownloadUrl(document.s3Key, 3600);
                            return res.redirect(s3Url);
                        } catch (s3Err) {
                            console.error('S3 fallback failed:', s3Err.message);
                        }
                    }

                    // Fallback 2: Local file download (for legacy files)
                    if (document.storagePath && fs.existsSync(document.storagePath)) {
                        return res.download(document.storagePath, document.fileName);
                    }

                    // If neither exists, file is lost
                    return res.status(404).json({
                        success: false,
                        message: 'File not found locally or in S3. Cannot generate preview.'
                    });
                }
            }

            // Serve the HTML file (Cached locally for performance)
            const previewPath = path.join(BASE_STORAGE_DIR, 'previews', `${documentId}.html`);
            if (fs.existsSync(previewPath)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                const fileStream = fs.createReadStream(previewPath);
                return fileStream.pipe(res);
            }

            // Should not happen if generation succeeded, but just in case
            if (document.s3Key) {
                const s3Url = await getDownloadUrl(document.s3Key, 3600);
                return res.redirect(s3Url);
            }

            return res.status(404).json({
                success: false,
                message: 'Preview not found'
            });

        } catch (error) {
            console.error(`Error serving preview: ${error.message}`);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * Delete document (SECURE)
 * DELETE /api/secure/documents/:id
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Verifies ownership
 * - ATOMIC DELETE: Database + Filesystem + Pinecone + S3
 */
router.delete('/:id',
    verifyFirebaseToken,  // MANDATORY
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;

        console.log(`🗑️  DELETE REQUEST: Document ${documentId} (User: ${userId})`);

        try {
            // ============================================================
            // STEP 1: VERIFY OWNERSHIP
            // ============================================================
            const document = await getDocument(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            if (document.userId !== userId) {
                console.error(`🚨 SECURITY: User ${userId} tried to delete document owned by ${document.userId}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            // ============================================================
            // STEP 2: PERFORM SECURE ATOMIC DELETION
            // ============================================================
            const result = await secureDeleteDocument(userId, documentId);

            // ============================================================
            // STEP 3: REVOKE ALL SHARES FOR THIS DOCUMENT
            // ============================================================
            try {
                await revokeSharesOnDelete(documentId);
            } catch (shareErr) {
                console.error(`   ⚠️ Share cleanup failed (non-blocking): ${shareErr.message}`);
            }

            // ============================================================
            // STEP 4: UPDATE STORAGE QUOTA
            // ============================================================
            // Re-calculate storage just to be safe
            await recalculateUserStorage(userId);

            // Audit: Log the delete action
            await recordAuditLog({
                userId,
                fileId: documentId,
                action: 'delete',
                details: { fileName: document.fileName }
            });

            res.json({
                success: true,
                message: 'Document deleted successfully',
                details: result
            });

        } catch (error) {
            console.error(`❌ Delete failed: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to delete document: ' + error.message
            });
        }
    }
);

/**
 * Update document metadata (SECURE)
 * PATCH /api/secure/documents/:id
 * 
 * Used for: Starring, Trashing, Renaming
 */
router.patch('/:id',
    verifyFirebaseToken,
    checkDocumentAccess('edit'), // Sharing: owner OR active share with 'edit' permission
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;
        const updates = req.body;

        try {
            // Document is already fetched by checkDocumentAccess middleware and attached to req.accessInfo if needed
            // But we still need the document data to return in the response
            const document = await getDocument(documentId);
            if (!document) return res.status(404).json({ success: false, message: 'Not found' });

            // Whitelist allowed fields
            const allowedUpdates = ['isStarred', 'isTrashed', 'fileName', 'parentFolderId'];
            const safeUpdates = {};

            Object.keys(updates).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    safeUpdates[key] = updates[key];
                }
            });

            if (Object.keys(safeUpdates).length === 0) {
                return res.status(400).json({ success: false, message: 'No valid fields provided' });
            }

            // Handle special recursive trash update if needed
            if (safeUpdates.hasOwnProperty('isTrashed')) {
                await performTrashUpdate(userId, documentId, safeUpdates.isTrashed);
                // If there are other updates (like rename), apply them too
                const otherUpdates = { ...safeUpdates };
                delete otherUpdates.isTrashed;
                if (Object.keys(otherUpdates).length > 0) {
                    await updateDocument(documentId, otherUpdates);
                }
            } else {
                await updateDocument(documentId, safeUpdates);
            }

            // Audit: Determine action type and log
            let auditAction = 'update';
            if (safeUpdates.fileName && safeUpdates.fileName !== document.fileName) {
                auditAction = 'rename';
            } else if (safeUpdates.isTrashed === true) {
                auditAction = 'trash';
            } else if (safeUpdates.isTrashed === false) {
                auditAction = 'restore';
            }

            const auditDetails = { updates: Object.keys(safeUpdates) };
            if (safeUpdates.fileName !== undefined) {
                auditDetails.oldName = document.fileName;
                auditDetails.newName = safeUpdates.fileName;
            }

            await recordAuditLog({
                userId,
                fileId: documentId,
                action: auditAction,
                details: auditDetails
            });

            res.json({
                success: true,
                message: 'Document updated',
                document: { ...document, ...safeUpdates }
            });
        } catch (error) {
            console.error(`❌ Update failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Save direct content edits to a document (SECURE)
 * POST /api/secure/documents/:id/save
 * 
 * Used for direct text content updates after permission check.
 */
router.post('/:id/save',
    verifyFirebaseToken,
    checkDocumentAccess('edit'), // Sharing: owner OR active share with 'edit' permission
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;
        const { content } = req.body;

        try {
            // Verify original document exists
            const document = await getDocument(documentId);
            if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

            // Prepare updates
            const updates = {
                content: content || '',
                lastEditedBy: userId,
                updatedAt: new Date().toISOString()
            };

            // Update original resource
            await updateDocument(documentId, updates);

            // Audit: Log the edit action
            await recordAuditLog({
                userId,
                fileId: documentId,
                action: 'edit',
                details: {
                    contentLength: content?.length || 0,
                    source: 'web_editor'
                }
            });

            console.log(`✅ Edits saved for ${documentId} by ${userId}`);

            res.json({
                success: true,
                message: 'Changes saved successfully',
                lastEditedBy: userId,
                updatedAt: updates.updatedAt
            });

        } catch (error) {
            console.error(`❌ Save failed: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to save changes: ' + error.message });
        }
    }
);

/**
 * Get audit logs for a document (SECURE)
 * GET /api/secure/documents/:id/audit
 */
router.get('/:id/audit',
    verifyFirebaseToken,
    checkDocumentAccess(),
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;

        try {
            const document = await getDocument(documentId);
            if (!document) return res.status(404).json({ success: false, message: 'Not found' });

            // Only owner can see audit logs for privacy
            if (document.userId !== userId) {
                return res.status(403).json({ success: false, message: 'Only the owner can view audit logs' });
            }

            const logs = await getFileAuditLogs(documentId);
            res.json({ success: true, logs });
        } catch (error) {
            console.error(`❌ Audit fetch failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Cancel an ongoing upload
 * POST /api/secure/documents/:id/cancel
 */
router.post('/:id/cancel',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;

        console.log(`⏹️  CANCEL REQUEST: Document ${documentId} (User: ${userId})`);

        try {
            // 1. Mark in memory as cancelled (if active)
            cancelUpload(documentId);

            // 2. Update Firestore status ONLY if it's not already terminal
            try {
                await updateDocumentStatus(documentId, 'cancelled');
            } catch (fsError) {
                console.warn(`[Cleanup] Firestore status update failed: ${fsError.message}`);
            }

            // 3. Document might already have some data in S3 or Pinecone
            const document = await getDocument(documentId);
            if (document && document.userId === userId) {
                // Perform atomic deletion of any partial data
                await secureDeleteDocument(userId, documentId);
            }

            res.json({
                success: true,
                message: 'Upload cancelled successfully'
            });

        } catch (error) {
            console.error(`❌ Cancel failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Make a copy of a document
 * POST /api/secure/documents/:id/copy
 */
router.post('/:id/copy',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const sourceDocId = req.params.id;

        try {
            // 1. Get original doc
            const sourceDoc = await getDocument(sourceDocId);
            if (!sourceDoc) return res.status(404).json({ success: false, message: 'Source not found' });
            if (sourceDoc.userId !== userId) return res.status(403).json({ success: false, message: 'Access denied' });

            // 2. Generate new ID
            const { v4: uuidv4 } = require('uuid');
            const newDocumentId = uuidv4();

            // 3. Create file copy if NOT a folder
            let newStoragePath = sourceDoc.storagePath;
            if (!sourceDoc.isFolder) {
                const fs = require('fs');
                const path = require('path');

                // Get the physical path
                const userStorageDir = getUserStorageDir(userId);

                // We don't have the original extension reliably except by trying to extract it from the path or filename
                const originalFileExt = path.extname(sourceDoc.fileName);
                const sourcePhysicalPath = path.join(userStorageDir, `${sourceDocId}${originalFileExt}`);
                const targetPhysicalPath = path.join(userStorageDir, `${newDocumentId}${originalFileExt}`);

                // Check if physical file exists (might exist without extension for some reason, try both)
                let actualSourcePath = sourcePhysicalPath;
                if (!fs.existsSync(actualSourcePath)) {
                    // Try without ext
                    actualSourcePath = path.join(userStorageDir, sourceDocId);
                }

                if (fs.existsSync(actualSourcePath)) {
                    // It exists, let's copy it
                    fs.copyFileSync(actualSourcePath, targetPhysicalPath);
                    newStoragePath = `storage/users/${userId}/documents/${newDocumentId}${originalFileExt}`;
                } else {
                    console.warn(`WARNING: Source file ${actualSourcePath} not found physically. Cannot copy physical file.`);
                    // Fallback to storing original path (not ideal but won't crash)
                }
            }

            // 4. Save new document in Firestore
            let newFileName = sourceDoc.fileName;
            if (newFileName.includes('.')) {
                // If contains extension "report.pdf", make it "report (Copy).pdf"
                const parts = newFileName.split('.');
                const ext = parts.pop();
                newFileName = `${parts.join('.')} (Copy).${ext}`;
            } else {
                newFileName = `${newFileName} (Copy)`;
            }

            const targetFolderId = req.body.targetFolderId !== undefined ? req.body.targetFolderId : sourceDoc.parentFolderId;

            const newDocData = {
                ...sourceDoc,
                documentId: newDocumentId,
                fileName: newFileName,
                storagePath: newStoragePath,
                uploadedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                vectorCount: 0, // Assuming we don't copy embeddings immediately
                isStarred: false,
                isTrashed: false,
                parentFolderId: targetFolderId
            };

            // Remove 'id' if there is one (Firestore id)
            delete newDocData.id;

            await saveDocument(newDocData);

            // Track copy for dashboard stats
            if (sourceDoc.isFolder) {
                trackFolderCreation().catch(e => console.error('Copy folder track failed:', e.message));
            } else {
                trackFolderCreation().catch(e => console.error('Copy file track failed:', e.message));
                // Note: Copying doesn't upload a NEW file to S3 usually in this logic, 
                // but counts as a new metadata entry.
            }

            res.json({
                success: true,
                message: 'Document copied successfully',
                document: newDocData
            });

        } catch (error) {
            console.error(`❌ Copy failed: ${error.message}`);
            res.status(500).json({ success: false, message: 'Failed to copy document: ' + error.message });
        }
    }
);

/**
 * Bulk delete documents (SECURE)
 * POST /api/secure/documents/bulk-delete
 * 
 * SECURITY:
 * - Requires valid Firebase token
 * - Verifies ownership for each document
 * - ATOMIC DELETE: Database + Filesystem + Pinecone + S3
 */
router.post('/bulk-delete',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { fileIds } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No file IDs provided' });
        }

        console.log(`\n🗑️  ========== BULK DELETE REQUEST ==========`);
        console.log(`   User: ${userId}`);
        console.log(`   Items: ${fileIds.length}`);

        const results = {
            success: [],
            failed: []
        };

        try {
            for (const fileId of fileIds) {
                try {
                    // 1. Verify ownership (Double check each one because bulk is dangerous)
                    const document = await getDocument(fileId);

                    if (!document) {
                        results.failed.push({ id: fileId, error: 'Document not found' });
                        continue;
                    }

                    // SECURITY: Match ownerUserId OR userId (uploader)
                    const ownerId = document.ownerUserId || document.userId;
                    if (ownerId !== userId) {
                        console.error(`🚨 SECURITY: User ${userId} tried to bulk-delete doc owned by ${ownerId}`);
                        results.failed.push({ id: fileId, error: 'Access denied' });
                        continue;
                    }

                    // 2. Secure atomic deletion
                    const deleteResult = await secureDeleteDocument(userId, fileId);

                    if (!deleteResult.success) {
                        results.failed.push({ id: fileId, error: deleteResult.error || 'Deletion semi-failed' });
                        // If it semi-failed (e.g. metadata delete failed), we shouldn't count it as success
                        if (!deleteResult.steps.metadata.success) continue;
                    }

                    // 3. Revoke all shares
                    try {
                        await revokeSharesOnDelete(fileId);
                    } catch (shareErr) {
                        console.error(`   ⚠️ Share cleanup failed for ${fileId}: ${shareErr.message}`);
                    }

                    // 4. Audit: Log the delete action
                    await recordAuditLog({
                        userId,
                        fileId: fileId,
                        action: 'delete',
                        details: { fileName: document.fileName, bulk: true }
                    });

                    results.success.push(fileId);
                    console.log(`   ✅ Successful Delete: ${document.fileName} (${fileId})`);

                } catch (itemError) {
                    console.error(`   ❌ Failed to delete ${fileId}: ${itemError.message}`);
                    results.failed.push({ id: fileId, error: itemError.message });
                }
            }

            // ============================================================
            // STEP 4: UPDATE STORAGE QUOTA (ONCE at end)
            // ============================================================
            await recalculateUserStorage(userId);

            res.json({
                success: true,
                message: `Processed ${fileIds.length} items`,
                results
            });

        } catch (error) {
            console.error(`❌ Bulk delete internal error: ${error.message}`);
            res.status(500).json({
                success: false,
                message: 'Failed to process bulk delete: ' + error.message
            });
        }
    }
);

/**
 * Bulk update trash status (SOFT DELETE / RESTORE)
 * POST /api/secure/documents/bulk-update-trash
 * 
 * Logic:
 * - Update isTrashed status for multiple items
 * - Recursively update children if it's a folder
 */
router.post('/bulk-update-trash',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { fileIds, isTrashed } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No file IDs provided' });
        }

        console.log(`\n🗑️  ========== BULK TRASH UPDATE ==========`);
        console.log(`   User: ${userId}`);
        console.log(`   Items: ${fileIds.length}`);
        console.log(`   Action: ${isTrashed ? 'Move to Trash' : 'Restore'}`);

        const results = { success: [], failed: [] };

        try {
            for (const fileId of fileIds) {
                try {
                    // 1. Verify ownership
                    const document = await getDocument(fileId);
                    if (!document || document.userId !== userId) {
                        results.failed.push({ id: fileId, error: 'Access denied' });
                        continue;
                    }

                    // 2. Perform trash update (recursive for folders)
                    await performTrashUpdate(userId, fileId, isTrashed);

                    // 3. Audit
                    await recordAuditLog({
                        userId,
                        fileId: fileId,
                        action: isTrashed ? 'trash' : 'restore',
                        details: { fileName: document.fileName, bulk: true }
                    });

                    results.success.push(fileId);
                } catch (itemError) {
                    results.failed.push({ id: fileId, error: itemError.message });
                }
            }

            res.json({
                success: true,
                message: `Processed ${fileIds.length} items`,
                results
            });

        } catch (error) {
            console.error(`❌ Bulk trash failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Recursive Trash Update Helper
 */
async function performTrashUpdate(userId, resourceId, isTrashed) {
    const doc = await getDocument(resourceId);
    if (!doc || doc.userId !== userId) return;

    // Update the item itself
    await updateDocument(resourceId, { isTrashed });

    // If it's a folder, recursively update all children
    if (doc.isFolder) {
        const { getFirestore } = require('../config/firebase.config');
        const db = getFirestore();
        const children = await db.collection('files')
            .where('userId', '==', userId)
            .where('parentFolderId', '==', resourceId)
            .get();

        const childPromises = children.docs.map(childDoc =>
            performTrashUpdate(userId, childDoc.id, isTrashed)
        );
        await Promise.all(childPromises);
    }
}

/**
 * Bulk move documents (SECURE)
 * POST /api/secure/documents/bulk-move
 * 
 * Logic:
 * - Update parent folder reference
 * - Prevent moving into same folder
 * - Prevent circular moves (folder inside itself)
 */
router.post('/bulk-move',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { fileIds, destinationFolderId } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No file IDs provided' });
        }

        console.log(`\n📦 ========== BULK MOVE REQUEST ==========`);
        console.log(`   User: ${userId}`);
        console.log(`   Items: ${fileIds.length}`);
        console.log(`   Destination: ${destinationFolderId || 'Root'}`);

        const results = {
            success: [],
            failed: []
        };

        try {
            // 1. Verify destination folder ownership if provided
            if (destinationFolderId) {
                const destinationFolder = await getDocument(destinationFolderId);
                if (!destinationFolder || destinationFolder.userId !== userId) {
                    return res.status(403).json({ success: false, message: 'Destination folder not found or access denied' });
                }
                if (!destinationFolder.isFolder) {
                    return res.status(400).json({ success: false, message: 'Destination must be a folder' });
                }
            }

            for (const fileId of fileIds) {
                try {
                    // Verify ownership
                    const document = await getDocument(fileId);
                    if (!document || document.userId !== userId) {
                        results.failed.push({ id: fileId, error: 'Not found or access denied' });
                        continue;
                    }

                    // Prevent moving into itself
                    if (fileId === destinationFolderId) {
                        results.failed.push({ id: fileId, error: 'Cannot move a folder into itself' });
                        continue;
                    }

                    // Prevent redundant move
                    if (document.parentFolderId === destinationFolderId) {
                        results.success.push(fileId);
                        continue;
                    }

                    // Circularity check (if folder)
                    if (document.isFolder && destinationFolderId) {
                        const isDescendant = await checkIsDescendant(fileId, destinationFolderId);
                        if (isDescendant) {
                            results.failed.push({ id: fileId, error: 'Cannot move a folder into its own descendant' });
                            continue;
                        }
                    }

                    // Update parentFolderId
                    await updateDocument(fileId, { parentFolderId: destinationFolderId });

                    // Audit
                    await recordAuditLog({
                        userId,
                        fileId: fileId,
                        action: 'move',
                        details: {
                            fileName: document.fileName,
                            from: document.parentFolderId,
                            to: destinationFolderId,
                            bulk: true
                        }
                    });

                    results.success.push(fileId);
                } catch (itemError) {
                    results.failed.push({ id: fileId, error: itemError.message });
                }
            }

            res.json({
                success: true,
                message: `Processed ${fileIds.length} items`,
                results
            });

        } catch (error) {
            console.error(`❌ Bulk move failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Circularity check helper
 */
async function checkIsDescendant(folderId, targetId) {
    if (!targetId) return false;
    let currentId = targetId;
    while (currentId) {
        if (currentId === folderId) return true;
        const parent = await getDocument(currentId);
        currentId = parent?.parentFolderId || null;
    }
    return false;
}

/**
 * Bulk copy documents (SECURE)
 * POST /api/secure/documents/bulk-copy
 */
router.post('/bulk-copy',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { fileIds, destinationFolderId } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No file IDs provided' });
        }

        console.log(`\n👯 ========== BULK COPY REQUEST ==========`);
        console.log(`   User: ${userId}`);
        console.log(`   Items: ${fileIds.length}`);
        console.log(`   Target: ${destinationFolderId || 'Root'}`);

        const results = { success: [], failed: [] };

        try {
            // Validate destination
            if (destinationFolderId) {
                const dest = await getDocument(destinationFolderId);
                if (!dest || dest.userId !== userId) {
                    return res.status(403).json({ success: false, message: 'Invalid destination' });
                }
                if (!dest.isFolder) {
                    return res.status(400).json({ success: false, message: 'Target must be a folder' });
                }
            }

            for (const fileId of fileIds) {
                try {
                    const newId = await performRecursiveCopy(userId, fileId, destinationFolderId, true);
                    results.success.push({ originalId: fileId, newId });
                } catch (err) {
                    console.error(`   ❌ Copy failed for ${fileId}:`, err.message);
                    results.failed.push({ id: fileId, error: err.message });
                }
            }

            // Update user stats
            await recalculateUserStorage(userId);

            res.json({
                success: true,
                message: `Successfully duplicated ${results.success.length} items`,
                results
            });

        } catch (error) {
            console.error(`❌ Bulk copy failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Recursive Copy Helper
 */
async function performRecursiveCopy(userId, sourceId, targetFolderId, isRoot = false) {
    const sourceDoc = await getDocument(sourceId);
    if (!sourceDoc || sourceDoc.userId !== userId) throw new Error('Source not found or access denied');

    const newId = uuidv4();
    let newFileName = sourceDoc.fileName;

    // Rule: Append (Copy) to root items
    if (isRoot) {
        if (newFileName.includes('.')) {
            const parts = newFileName.split('.');
            const ext = parts.pop();
            newFileName = `${parts.join('.')} (Copy).${ext}`;
        } else {
            newFileName = `${newFileName} (Copy)`;
        }
    }

    let newS3Key = sourceDoc.s3Key || null;
    let newS3Url = sourceDoc.s3Url || sourceDoc.publicUrl || null;

    // Handle physical file duplication for NON-folders
    if (!sourceDoc.isFolder && sourceDoc.s3Key) {
        try {
            const targetKey = generateS3Key(userId, newId, newFileName);
            const s3Result = await copyS3Object(sourceDoc.s3Key, targetKey);
            newS3Key = s3Result.s3Key;
            newS3Url = s3Result.s3Url;
        } catch (s3Err) {
            console.warn(`      ⚠️ S3 Physical copy failed for ${sourceId}: ${s3Err.message}. Metadata will link to original.`);
        }
    }

    // Save metadata record
    const newDocData = {
        ...sourceDoc,
        documentId: newId,
        fileName: newFileName,
        parentFolderId: targetFolderId,
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date(),
        vectorCount: 0, // AI chunks not copied by default
        chunkIds: [],
        s3Key: newS3Key,
        s3Url: newS3Url,
        publicUrl: newS3Url, // Matching requested schema
        isStarred: false,
        isTrashed: false
    };
    delete newDocData.id;
    await saveDocument(newDocData);

    // Recursive step for folders
    if (sourceDoc.isFolder) {
        const { getFirestore } = require('../config/firebase.config');
        const db = getFirestore();
        const children = await db.collection('files')
            .where('userId', '==', userId)
            .where('parentFolderId', '==', sourceId)
            .get();

        console.log(`      📁 Folder Copy: Found ${children.size} children in ${sourceDoc.fileName}`);

        for (const childDoc of children.docs) {
            await performRecursiveCopy(userId, childDoc.id, newId, false);
        }
    }

    return newId;
}

/**
 * Retry thumbnail generation for a specific document
 * POST /api/secure/documents/:id/retry-thumbnail
 */
router.post('/:id/retry-thumbnail',
    verifyFirebaseToken,
    checkDocumentAccess(),
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;

        try {
            const document = await getDocument(documentId);
            if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

            // Queue the job
            queueThumbnailJob({
                filePath: document.storagePath,
                documentId,
                userId: document.userId || userId,
                fileType: document.fileType,
                fileName: document.fileName,
                s3Key: document.s3Key
            });

            // Update status to processing
            await updateDocumentStatus(documentId, 'processing', {
                thumbnailStatus: 'processing',
                thumbnailError: null
            });

            res.json({ success: true, message: 'Thumbnail generation queued' });
        } catch (error) {
            console.error(`❌ Retry thumbnail failed: ${error.message}`);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);


module.exports = router;

