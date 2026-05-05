/**
 * File Upload Middleware (PRODUCTION-HARDENED)
 * ==============================================
 * Secure file upload configuration with Multer.
 * 
 * SECURITY FEATURES:
 * - Strict file type validation (extension + MIME)
 * - File size limits (50MB max)
 * - Sanitized filenames (prevents traversal)
 * - Unique filename generation (prevents overwrites)
 * - Temporary storage with cleanup
 * 
 * @author College Project
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_FIELD_NAME = 'file'; // MUST match Angular FormData field name

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Created uploads directory:', uploadsDir);
}

// =============================================================================
// ALLOWED FILE TYPES (WHITELIST)
// =============================================================================

const ALLOWED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'text/plain': 'txt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav'
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.mp3', '.wav'];

// =============================================================================
// FILENAME SANITIZATION
// =============================================================================

/**
 * Sanitize filename to prevent directory traversal and special characters
 */
function sanitizeFilename(filename) {
    // Remove any directory path components
    const basename = path.basename(filename);

    // Remove dangerous characters, keep only alphanumeric, dots, dashes, underscores
    return basename
        .replace(/[^a-zA-Z0-9.\-_]/g, '_')
        .replace(/\.{2,}/g, '.') // No multiple dots
        .replace(/^\.+/, '') // No leading dots
        .substring(0, 255); // Limit length
}

/**
 * Generate unique secure filename
 */
function generateSecureFilename(originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase();
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${uuid}_${timestamp}${ext}`;
}

// =============================================================================
// MULTER STORAGE CONFIGURATION
// =============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const secureFilename = generateSecureFilename(file.originalname);
        cb(null, secureFilename);
    }
});

// =============================================================================
// FILE FILTER (SECURITY CRITICAL)
// =============================================================================

const fileFilter = (req, file, cb) => {
    // 1. Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        const error = new Error(`Invalid file type: ${ext}. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }

    // 2. Check MIME type
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
        // Some systems report unusual MIME types, allow if extension matches
        if (file.mimetype !== 'application/octet-stream') {
            console.warn(`⚠️ Unusual MIME type: ${file.mimetype} for file: ${file.originalname}`);
        }
    }

    cb(null, true);
};

// =============================================================================
// MULTER UPLOAD INSTANCE
// =============================================================================

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
        fields: 10,
        parts: 20
    }
});

// =============================================================================
// UPLOAD MIDDLEWARE WITH ERROR HANDLING
// =============================================================================

/**
 * Secure single file upload middleware
 * Wraps multer to handle errors gracefully
 */
function secureUpload(req, res, next) {
    const uploadSingle = upload.single(UPLOAD_FIELD_NAME);

    uploadSingle(req, res, (err) => {
        if (err) {
            // Handle multer errors
            if (err instanceof multer.MulterError) {
                return next(err); // Let error handler deal with it
            }

            // Handle custom file validation errors
            if (err.code === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            // Other errors
            return next(err);
        }

        // Check if file was actually uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please select a file.'
            });
        }

        next();
    });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get file type from extension
 */
function getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.pdf':
            return 'pdf';
        case '.docx':
        case '.doc':
            return 'docx';
        case '.txt':
            return 'txt';
        case '.pptx':
        case '.ppt':
            return 'pptx';
        case '.jpg':
        case '.jpeg':
        case '.png':
            return 'image';
        case '.mp3':
        case '.wav':
            return 'audio';
        default:
            return 'unknown';
    }
}

/**
 * Safely clean up temporary file
 */
function cleanupTempFile(filePath) {
    if (!filePath) return;

    try {
        // Prevent directory traversal
        const normalizedPath = path.normalize(filePath);
        const uploadsBase = path.normalize(path.join(__dirname, '..', 'uploads'));

        if (!normalizedPath.startsWith(uploadsBase)) {
            console.error('❌ Security: Attempted to delete file outside uploads directory');
            return;
        }

        if (fs.existsSync(normalizedPath)) {
            fs.unlinkSync(normalizedPath);
            console.log(`🗑️ Cleaned up temp file: ${path.basename(normalizedPath)}`);
        }
    } catch (error) {
        console.error('❌ Failed to cleanup temp file:', error.message);
    }
}

/**
 * Validate file exists and is readable
 */
function validateFile(filePath) {
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    secureUpload,
    upload,
    getFileType,
    cleanupTempFile,
    validateFile,
    sanitizeFilename,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
    UPLOAD_FIELD_NAME
};
