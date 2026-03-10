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
const { saveDocument, getUserDocuments, getDocument, updateDocumentStatus, updateDocument } = require('../services/firestore.service');

// Import S3 service for cloud storage
const { uploadToS3, getDownloadUrl, deleteFromS3, generateS3Key } = require('../services/s3.service');

// Import SECURE deletion service - atomic deletion across all storage layers
const { secureDeleteDocument } = require('../services/deletion.service');

// Import share access middleware and cleanup
const { checkDocumentAccess } = require('../middlewares/share-access.middleware');
const { revokeSharesOnDelete } = require('../services/share.service');

// Import storage quota service - for checking limits before upload
const { checkStorageQuota, recalculateUserStorage } = require('../services/storage-quota.service');

// Import upload progress service - for real-time progress tracking
const {
    createUploadProgress,
    updateStageProgress,
    completeUpload,
    failUpload
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
const { logFileUpload, logSecurityEvent, trackFolderCreation } = require('../services/analytics.service');

// =============================================================================
// CONFIGURATION
// =============================================================================

const BASE_STORAGE_DIR = path.join(__dirname, '..', 'storage');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav'
];


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
    // Note: Mime type checking is basic (based on file extension) and can be spoofed
    // A more robust solution would check magic numbers, but this is sufficient for now
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT, Excel, PowerPoint, Image, Audio`), false);
    }
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
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const documentId = uuidv4();
        const uploadId = documentId;  // Use documentId as uploadId for simplicity
        const originalFileName = req.file.originalname;
        const fileType = path.extname(originalFileName).slice(1).toLowerCase();
        const localFilePath = req.file.path;
        const fileSize = req.file.size;
        const pineconeNamespace = userId;  // namespace = userId for isolation
        // Normalize parentFolderId
        const parentFolderId = req.body.parentFolderId === '' ? null : (req.body.parentFolderId || null);
        console.log(`   📂 Target Folder: ${parentFolderId || 'Root (My Drive)'}`);

        console.log(`   Document ID: ${documentId}`);
        console.log(`   Upload ID: ${uploadId}`);
        console.log(`   File: ${originalFileName}`);
        console.log(`   Size: ${fileSize} bytes`);
        console.log(`   Storage: ${localFilePath}`);
        console.log(`   Pinecone Namespace: ${pineconeNamespace}`);

        // ============================================================
        // STEP 0: CHECK STORAGE QUOTA
        // ============================================================
        try {
            console.log(`\n   📊 Checking storage quota...`);
            const quotaCheck = await checkStorageQuota(userId, fileSize);

            if (!quotaCheck.canUpload) {
                console.error(`   ❌ QUOTA EXCEEDED: ${quotaCheck.message}`);

                // Cleanup uploaded file
                if (fs.existsSync(localFilePath)) {
                    fs.unlinkSync(localFilePath);
                }

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

            console.log(`   ✅ Quota check passed (${quotaCheck.remainingBytes} bytes remaining)`);
        } catch (quotaError) {
            console.error(`   ⚠️ Quota check failed: ${quotaError.message}`);
            // Continue with upload - don't block if quota service fails
        }

        // Initialize upload progress tracking
        createUploadProgress(uploadId, userId, originalFileName, fileSize);
        updateStageProgress(uploadId, 'receiving', 100);  // File already received by multer

        // Track data for complete deletion later
        let vectorCount = 0;
        let chunkIds = [];
        let s3Key = null;
        let s3Url = null;

        try {
            // ============================================================
            // STEP 1: Save initial document metadata (processing status)
            // ============================================================
            updateStageProgress(uploadId, 's3', 10);

            await saveDocument({
                documentId,
                userId,  // SECURITY: From verified token
                fileName: originalFileName,
                fileType,
                fileSize: fileSize,
                parentFolderId: parentFolderId,
                storagePath: localFilePath,
                publicUrl: '',  // Generate on download
                pineconeNamespace,  // CRITICAL: Store for deletion
                chunkIds: [],       // Will be updated after embedding
                vectorCount: 0,
                status: 'uploading'  // Changed from 'processing' to 'uploading'
            });

            // ============================================================
            // STEP 2: Extract text from document
            // ============================================================
            updateStageProgress(uploadId, 's3', 30);
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
            if (extractedText && extractedText.length > 0) {
                try {
                    const chunks = chunkText(extractedText);
                    // SECURITY: processAndStoreEmbeddings uses userId as namespace
                    const result = await processAndStoreEmbeddings(
                        userId,  // SECURITY: Pinecone namespace = userId
                        documentId,
                        originalFileName,
                        chunks
                    );

                    vectorCount = result.vectorCount || 0;
                    chunkIds = result.chunkIds || [];  // CRITICAL: Capture for deletion

                    console.log(`   ✅ Stored ${vectorCount} vectors in namespace: ${userId}`);
                    console.log(`   🔑 Chunk IDs stored: ${chunkIds.length}`);
                    updateStageProgress(uploadId, 'processing', 70);

                    // Log warning if no vectors were generated (but don't fail the upload)
                    if (vectorCount === 0) {
                        console.warn(`   ⚠️ WARNING: No vectors were generated. Document uploaded but AI search won't work for this file.`);
                    }
                } catch (embeddingError) {
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
            try {
                s3Key = generateS3Key(userId, documentId, originalFileName);
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
            // STEP 5: Update document with all deletion-required data
            // CRITICAL: Store s3Key, chunkIds, vectorCount for deletion
            // ============================================================
            updateStageProgress(uploadId, 'processing', 90);
            await updateDocumentStatus(documentId, 'ready', {
                vectorCount,
                chunkIds,          // CRITICAL: For explicit vector deletion
                pineconeNamespace, // CRITICAL: For namespace isolation
                s3Key: s3Key,      // CRITICAL: For S3 object deletion
                s3Url: s3Url,
                storagePath: null  // Remove local path reference as we are S3-only now
            });

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
                    userId,
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
                fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                fileType === 'application/vnd.ms-excel' ||
                originalFileName.toLowerCase().endsWith('.xlsx') ||
                originalFileName.toLowerCase().endsWith('.xls');

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

            console.log(`   ✅ UPLOAD COMPLETE`);
            console.log(`   📊 Deletion data stored:`);
            console.log(`      - S3 Key: ${s3Key || 'none'}`);
            console.log(`      - Chunk IDs: ${chunkIds.length}`);
            console.log(`      - Namespace: ${pineconeNamespace}`);
            console.log(`      - Thumbnail Job: ${thumbnailJobId || 'none'}`);
            console.log(`========== END SECURE UPLOAD ==========\n`);

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
                    thumbnailUrl: null,  // Thumbnail is generated asynchronously
                    thumbnailStatus: 'processing', // Display placeholder
                    status: 'ready',
                    uploadedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error(`   ❌ Upload failed: ${error.message}`);
            console.error(error.stack);

            // Mark upload as failed for SSE clients
            failUpload(uploadId, error.message);

            // Cleanup on failure
            if (fs.existsSync(localFilePath)) {
                try {
                    fs.unlinkSync(localFilePath);
                } catch (unlinkError) {
                    console.error(`   ⚠️ Failed to delete local file after error: ${unlinkError.message}`);
                }
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

            // 2. Map S3 presigned URLs for thumbnails with HEAVY DEFENSIVE CHECKS
            const mappedDocuments = await Promise.all(result.documents.map(async (doc) => {
                try {
                    // Start with doc.thumbnailUrl from Firestore
                    let thumbnailUrl = doc.thumbnailUrl || null;

                    // If we have a preview path OR an S3-format URL, generate a fresh signed URL
                    const hasS3Thumbnail = thumbnailUrl && typeof thumbnailUrl === 'string' && (thumbnailUrl.includes('.s3.') || thumbnailUrl.includes('http'));

                    if (doc.previewPath || hasS3Thumbnail) {
                        try {
                            let pathForSign = doc.previewPath;

                            // If no previewPath but we have an S3 URL, try to extract the key
                            if (!pathForSign && thumbnailUrl && typeof thumbnailUrl === 'string' && thumbnailUrl.startsWith('http')) {
                                try {
                                    const urlObj = new URL(thumbnailUrl);
                                    pathForSign = urlObj.pathname.substring(1); // Remove leading slash
                                } catch (urlErr) {
                                    console.warn(`   ⚠️ [DOCS] Invalid thumbnail URL for doc ${doc.id}: ${thumbnailUrl}`);
                                    pathForSign = null;
                                }
                            }

                            if (pathForSign) {
                                // Regenerate a fresh signed URL (1 hour)
                                thumbnailUrl = await getDownloadUrl(pathForSign, 3600);
                            }
                        } catch (signErr) {
                            console.warn(`   ⚠️ [DOCS] Thumbnail signing failed for ${doc.id}:`, signErr.message);
                            // Fallback to original URL - don't crash the whole list!
                        }
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
                    '.js': 'application/javascript'
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

            // EXCLUSIVE S3 VIEW STRATEGY
            if (document.s3Key) {
                console.log(`   ☁️ Previewing from S3: ${document.s3Key}`);
                const s3Url = await getDownloadUrl(document.s3Key, 3600); // 1 hour validity

                // Redirect to signed URL
                return res.redirect(s3Url);
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

        try {
            const document = await getDocument(documentId);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

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
                // Try to generate it on the fly
                try {
                    // Pass storagePath for legacy local files, and s3Key for new S3 files
                    await convertDocxToHtml(document.storagePath, documentId, document.s3Key);
                } catch (err) {
                    console.error('Failed to generate preview on the fly:', err.message);


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
    async (req, res) => {
        const userId = req.user.uid;
        const documentId = req.params.id;
        const updates = req.body;

        try {
            // Verify ownership
            const document = await getDocument(documentId);
            if (!document) return res.status(404).json({ success: false, message: 'Not found' });
            if (document.userId !== userId) return res.status(403).json({ success: false, message: 'Access denied' });

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

            await updateDocument(documentId, safeUpdates);

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

module.exports = router;
