/**
 * Document Controller (PRODUCTION-HARDENED)
 * ==========================================
 * Handles document upload, listing, download, and deletion.
 * 
 * ============================================================================
 * SECURITY: USER NAMESPACE ISOLATION
 * ============================================================================
 * 
 * CRITICAL SECURITY RULES:
 * 1. userId is ALWAYS extracted from req.user.uid (verified Firebase token)
 * 2. userId is NEVER accepted from req.body, req.params, or req.query
 * 3. All Pinecone upserts use namespace = userId (verified server-side)
 * 4. All document operations verify ownership (document.userId === req.user.uid)
 * 5. Cross-user data access is IMPOSSIBLE by design
 * 
 * SECURITY FEATURES:
 * - User isolation (documents scoped to authenticated user)
 * - Ownership verification before any operation
 * - Input validation
 * - Safe error responses
 * - Proper cleanup on failures
 * 
 * @author College Project
 */

const { v4: uuidv4 } = require('uuid');

const { uploadFile, getSignedDownloadUrl, deleteFile } = require('../services/storage.service');
const { saveDocument, updateDocumentStatus, getUserDocuments, getDocument, deleteDocument } = require('../services/firestore.service');
const { extractText, chunkText } = require('../services/textExtraction.service');
const { processAndStoreEmbeddings, deleteDocumentEmbeddings } = require('../services/embedding.service');
const { cleanupTempFile, getFileType } = require('../middlewares/upload.middleware');
const { asyncHandler, ApiError, badRequest, notFound, forbidden } = require('../middlewares/error.middleware');

// =============================================================================
// UPLOAD DOCUMENT
// =============================================================================

/**
 * Upload a document
 * POST /api/documents/upload
 * 
 * SECURITY: userId is extracted from verified Firebase token (req.user.uid)
 * Embeddings are stored in Pinecone namespace = userId (user-isolated)
 */
const uploadDocument = asyncHandler(async (req, res) => {
    // SECURITY: Extract userId from VERIFIED auth token only
    // This userId will be used as the Pinecone namespace for isolation
    const { uid: userId } = req.user;
    const file = req.file;

    // File presence is validated by secureUpload middleware
    // But double-check for safety
    if (!file) {
        throw badRequest('No file uploaded. Please select a file.');
    }

    const documentId = uuidv4();
    const originalFileName = file.originalname;
    const fileType = getFileType(originalFileName);
    const localFilePath = file.path;

    console.log(`📤 Processing upload for user: ${userId} (from verified token)`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   File: ${originalFileName} (${fileType})`);
    console.log(`   Size: ${file.size} bytes`);

    try {
        // Step 1: Save initial document metadata (status: uploading)
        await saveDocument({
            documentId,
            userId,
            fileName: originalFileName,
            fileType,
            fileSize: file.size,
            storagePath: '',
            publicUrl: '',
            vectorCount: 0,
            status: 'uploading'
        });

        // Step 2: Upload file to Firebase Storage
        console.log(`   📦 Uploading to Firebase Storage...`);
        const uploadResult = await uploadFile(userId, documentId, localFilePath, originalFileName);

        // Update status to processing
        await updateDocumentStatus(documentId, 'processing', {
            storagePath: uploadResult.storagePath,
            publicUrl: uploadResult.publicUrl
        });

        // Step 3: Extract text from document
        let extractedText = '';
        try {
            console.log(`   📄 Extracting text...`);
            extractedText = await extractText(localFilePath, fileType);
            console.log(`   ✅ Extracted ${extractedText.length} characters`);
        } catch (extractError) {
            console.error('   ⚠️ Text extraction failed:', extractError.message);
            // Continue without text extraction - document still usable
        }

        // Step 4: Chunk text and generate embeddings (OPTIONAL - won't fail upload)
        let vectorCount = 0;
        let embeddingError = null;
        if (extractedText && extractedText.length > 0) {
            try {
                // Check if OpenAI API key is configured
                if (!process.env.OPENAI_API_KEY) {
                    console.log('   ⚠️ OpenAI API key not configured - skipping embeddings');
                } else if (!process.env.PINECONE_API_KEY) {
                    console.log('   ⚠️ Pinecone API key not configured - skipping embeddings');
                } else {
                    console.log(`   🧠 Generating embeddings...`);
                    const chunks = chunkText(extractedText);
                    const embeddingResult = await processAndStoreEmbeddings(userId, documentId, originalFileName, chunks);
                    vectorCount = embeddingResult.vectorCount;
                    console.log(`   ✅ Created ${vectorCount} vectors`);
                }
            } catch (err) {
                embeddingError = err.message;
                console.error('   ⚠️ Embedding generation failed:', err.message);
                console.error('   ⚠️ Document will be saved without AI search capability');
                // Continue without embeddings - document still usable for download
            }
        }

        // Step 5: Update document status to ready
        await updateDocumentStatus(documentId, 'ready', {
            vectorCount
        });

        // Clean up temp file
        cleanupTempFile(localFilePath);

        console.log(`   ✅ Upload complete: ${documentId}`);

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            document: {
                documentId,
                fileName: originalFileName,
                fileType,
                fileSize: file.size,
                storagePath: uploadResult.storagePath,
                publicUrl: uploadResult.publicUrl,
                vectorCount,
                status: 'ready',
                uploadedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        // Clean up on error
        cleanupTempFile(localFilePath);

        // Update document status to failed
        try {
            await updateDocumentStatus(documentId, 'failed', {
                error: error.message
            });
        } catch (updateError) {
            console.error('   Failed to update document status:', updateError.message);
        }

        console.error(`   ❌ Upload failed: ${error.message}`);
        throw error;
    }
});

// =============================================================================
// LIST DOCUMENTS
// =============================================================================

/**
 * List user's documents
 * GET /api/documents
 */
const listDocuments = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100

    console.log(`📋 Listing documents for user: ${userId}`);

    const documents = await getUserDocuments(userId, { limit });

    res.json({
        success: true,
        count: documents.length,
        documents
    });
});

// =============================================================================
// GET DOCUMENT BY ID
// =============================================================================

/**
 * Get document details
 * GET /api/documents/:id
 */
const getDocumentById = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { id: documentId } = req.params;

    // Validate document ID format
    if (!documentId || documentId.length < 10) {
        throw badRequest('Invalid document ID');
    }

    const document = await getDocument(documentId);

    if (!document) {
        throw notFound('Document not found');
    }

    // Security: Ensure document belongs to requesting user
    if (document.userId !== userId) {
        throw forbidden('Access denied');
    }

    res.json({
        success: true,
        document
    });
});

// =============================================================================
// DOWNLOAD DOCUMENT
// =============================================================================

/**
 * Get download URL for a document
 * GET /api/documents/:id/download
 */
const downloadDocument = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { id: documentId } = req.params;

    // Validate document ID format
    if (!documentId || documentId.length < 10) {
        throw badRequest('Invalid document ID');
    }

    const document = await getDocument(documentId);

    if (!document) {
        throw notFound('Document not found');
    }

    // Security: Ensure document belongs to requesting user
    if (document.userId !== userId) {
        throw forbidden('Access denied');
    }

    // Check if storage path exists
    if (!document.storagePath) {
        throw notFound('Document file not available');
    }

    // Generate signed download URL (expires in 60 minutes)
    const downloadUrl = await getSignedDownloadUrl(document.storagePath, 60);

    res.json({
        success: true,
        fileName: document.fileName,
        downloadUrl,
        expiresIn: '60 minutes'
    });
});

// =============================================================================
// DELETE DOCUMENT
// =============================================================================

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
const deleteDocumentById = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { id: documentId } = req.params;

    // Validate document ID format
    if (!documentId || documentId.length < 10) {
        throw badRequest('Invalid document ID');
    }

    const document = await getDocument(documentId);

    if (!document) {
        throw notFound('Document not found');
    }

    // Security: Ensure document belongs to requesting user
    if (document.userId !== userId) {
        throw forbidden('Access denied');
    }

    console.log(`🗑️ Deleting document: ${documentId} for user: ${userId}`);

    // Delete from Firebase Storage
    if (document.storagePath) {
        try {
            await deleteFile(document.storagePath);
        } catch (storageError) {
            console.error('   Failed to delete from storage:', storageError.message);
            // Continue with other deletions
        }
    }

    // Delete embeddings from Pinecone
    try {
        await deleteDocumentEmbeddings(userId, documentId);
    } catch (embeddingError) {
        console.error('   Failed to delete embeddings:', embeddingError.message);
        // Continue with Firestore deletion
    }

    // Delete document metadata from Firestore
    await deleteDocument(documentId);

    console.log(`   ✅ Document deleted: ${documentId}`);

    res.json({
        success: true,
        message: 'Document deleted successfully'
    });
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    uploadDocument,
    listDocuments,
    getDocumentById,
    downloadDocument,
    deleteDocumentById
};
