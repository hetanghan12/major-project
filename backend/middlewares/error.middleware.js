/**
 * Global Error Handler Middleware (PRODUCTION-HARDENED)
 * =======================================================
 * Centralized error handling - NEVER exposes stack traces.
 * 
 * SECURITY FEATURES:
 * - No stack traces in production
 * - Safe JSON responses only
 * - Proper HTTP status codes
 * - Multer error handling
 * - Firebase error handling
 * 
 * @author College Project
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Create standardized error response
 */
function createErrorResponse(statusCode, message, details = null) {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString()
    };

    if (details && process.env.NODE_ENV === 'development') {
        response.details = details;
    }

    return response;
}

/**
 * Global error handler middleware
 * NEVER crashes the server, ALWAYS returns JSON
 */
function errorHandler(err, req, res, next) {
    // Log error internally (never expose to client)
    console.error('❌ Error occurred:');
    console.error('   Path:', req.originalUrl);
    console.error('   Method:', req.method);
    console.error('   Message:', err.message);

    // Only log stack in development
    if (process.env.NODE_ENV === 'development') {
        console.error('   Stack:', err.stack);
    }

    // Default error values
    let statusCode = 500;
    let message = 'Internal Server Error';
    let details = null;

    // Handle known error types
    if (err.isOperational) {
        // Custom API errors
        statusCode = err.statusCode || 500;
        message = err.message;
        details = err.details;
    } else if (err.name === 'ValidationError') {
        // Validation errors
        statusCode = 400;
        message = 'Validation Error';
        details = err.errors;
    } else if (err.name === 'MulterError') {
        // Multer (file upload) errors - ALWAYS 400
        statusCode = 400;
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'File too large. Maximum allowed size is 50MB.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'Too many files. Only one file allowed per upload.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected field name. Use "file" as the field name.';
                break;
            case 'LIMIT_PART_COUNT':
                message = 'Too many parts in the request.';
                break;
            case 'LIMIT_FIELD_KEY':
                message = 'Field name too long.';
                break;
            case 'LIMIT_FIELD_VALUE':
                message = 'Field value too long.';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields.';
                break;
            default:
                message = 'File upload error: ' + err.message;
        }
    } else if (err.code && typeof err.code === 'string' && err.code.startsWith('auth/')) {
        // Firebase Auth errors
        statusCode = 401;
        message = getFirebaseAuthErrorMessage(err.code);
    } else if (err.message === 'Not allowed by CORS') {
        // CORS errors
        statusCode = 403;
        message = 'Cross-Origin Request Blocked';
    } else if (err.type === 'entity.parse.failed') {
        // JSON parsing errors
        statusCode = 400;
        message = 'Invalid JSON in request body';
    } else if (err.type === 'entity.too.large') {
        // Payload too large
        statusCode = 413;
        message = 'Request payload too large';
    } else if (err.code === 'ENOENT') {
        // File not found
        statusCode = 404;
        message = 'Requested resource not found';
    } else if (err.statusCode) {
        // HTTP errors
        statusCode = err.statusCode;
        message = err.message || message;
    }

    // Ensure we always return JSON, never crash
    try {
        res.status(statusCode).json(createErrorResponse(statusCode, message, details));
    } catch (responseError) {
        // Last resort if response fails
        console.error('❌ Failed to send error response:', responseError);
        res.status(500).end();
    }
}

/**
 * Get user-friendly Firebase Auth error messages
 */
function getFirebaseAuthErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'No user found with this email',
        'auth/wrong-password': 'Invalid password',
        'auth/email-already-exists': 'Email is already registered',
        'auth/invalid-email': 'Invalid email format',
        'auth/weak-password': 'Password is too weak',
        'auth/id-token-expired': 'Session expired. Please login again.',
        'auth/id-token-revoked': 'Session has been revoked. Please login again.',
        'auth/invalid-id-token': 'Invalid authentication token',
        'auth/operation-not-allowed': 'Email/Password sign-in is not enabled',
        'auth/too-many-requests': 'Too many requests. Try again later.'
    };

    return messages[code] || 'Authentication error';
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * Prevents unhandled promise rejections from crashing the server
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Create a 400 Bad Request error
 */
function badRequest(message, details = null) {
    return new ApiError(400, message, details);
}

/**
 * Create a 401 Unauthorized error
 */
function unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
}

/**
 * Create a 403 Forbidden error
 */
function forbidden(message = 'Access denied') {
    return new ApiError(403, message);
}

/**
 * Create a 404 Not Found error
 */
function notFound(message = 'Resource not found') {
    return new ApiError(404, message);
}

/**
 * Create a 500 Internal Server Error
 */
function serverError(message = 'Internal server error') {
    return new ApiError(500, message);
}

module.exports = {
    ApiError,
    errorHandler,
    asyncHandler,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    serverError
};
