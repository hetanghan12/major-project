/**
 * Backend Utilities
 * ==================
 * Common utility functions for the backend.
 * 
 * @author College Project
 */

/**
 * Delay execution for specified milliseconds
 * @param {number} ms - Milliseconds to delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            console.log(`⚠️  Retry ${i + 1}/${maxRetries} after error: ${error.message}`);

            if (i < maxRetries - 1) {
                await delay(baseDelay * Math.pow(2, i));
            }
        }
    }

    throw lastError;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize filename for storage
 * @param {string} filename - Original filename
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-_]/g, '_')
        .replace(/__+/g, '_');
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 */
function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
    delay,
    retryWithBackoff,
    isValidEmail,
    sanitizeFilename,
    formatFileSize,
    truncateText
};
