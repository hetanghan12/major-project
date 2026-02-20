/**
 * Document Routes (PRODUCTION-HARDENED)
 * =======================================
 * Secure document upload, listing, download, and deletion.
 * 
 * SECURITY FEATURES:
 * - Secure file upload with validation
 * - User isolation (documents scoped to user)
 * - Rate limiting on uploads
 * - Proper error handling
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
    uploadDocument,
    listDocuments,
    getDocumentById,
    downloadDocument,
    deleteDocumentById
} = require('../controllers/document.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { secureUpload } = require('../middlewares/upload.middleware');

// =============================================================================
// RATE LIMITING FOR UPLOADS
// =============================================================================

const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour per IP
    message: {
        success: false,
        message: 'Upload limit exceeded. Please try again later.'
    }
});

// =============================================================================
// ALL ROUTES REQUIRE AUTHENTICATION
// =============================================================================

router.use(verifyFirebaseToken);

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document (PDF, DOCX, TXT)
 * @access  Protected
 * 
 * Request: multipart/form-data with field name "file"
 * Response: { success: true, document: { ... } }
 */
router.post('/upload', uploadLimiter, secureUpload, uploadDocument);

/**
 * @route   GET /api/documents
 * @desc    List all documents for the current user
 * @access  Protected
 */
router.get('/', listDocuments);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document details by ID
 * @access  Protected
 */
router.get('/:id', getDocumentById);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Get download URL for a document
 * @access  Protected
 */
router.get('/:id/download', downloadDocument);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete a document
 * @access  Protected
 */
router.delete('/:id', deleteDocumentById);

module.exports = router;
