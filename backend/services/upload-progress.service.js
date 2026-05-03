const path = require('path');
const fs = require('fs');

/**
 * UPLOAD PROGRESS SERVICE
 * ========================
 * Production-grade upload progress tracking with SSE (Server-Sent Events).
 * 
 * ============================================================================
 * HOW IT WORKS
 * ============================================================================
 * 
 * 1. Client initiates upload via POST /api/secure/documents/upload
 * 2. Client opens SSE connection: GET /api/upload/progress/:uploadId
 * 3. Server streams progress events as file uploads to S3
 * 4. Events: { uploaded_bytes, total_bytes, percent, status }
 * 5. Client updates progress bar in real-time
 * 
 * ============================================================================
 * PROGRESS STATES
 * ============================================================================
 * 
 * - pending: Upload initialized, waiting for data
 * - receiving: Receiving bytes from client
 * - uploading: Uploading to S3
 * - processing: Extracting text, generating embeddings
 * - complete: Successfully finished
 * - error: Failed with error message
 * 
 * @author CloudAI Upload System
 * @version 1.0.0
 */

// In-memory progress store (use Redis in production for multi-instance)
const uploadProgressStore = new Map();

// SSE client connections
const sseClients = new Map();

/**
 * Create a new upload progress tracker
 * 
 * @param {string} uploadId - Unique upload ID
 * @param {string} userId - User ID
 * @param {string} fileName - Original file name
 * @param {number} totalBytes - Total file size in bytes
 * @param {string} localFilePath - Path to temporary file on disk (optional)
 * @returns {Object} Progress tracker
 */
function createUploadProgress(uploadId, userId, fileName, totalBytes, localFilePath = null) {
    const progress = {
        uploadId,
        userId,
        fileName,
        totalBytes,
        localFilePath, // Added for cleanup on cancel
        uploadedBytes: 0,
        percent: 0,
        status: 'pending',
        stage: 'initializing',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: null,
        details: {
            receivingProgress: 0,
            s3Progress: 0,
            processingProgress: 0
        }
    };

    uploadProgressStore.set(uploadId, progress);
    console.log(`📤 Upload progress created: ${uploadId} for ${fileName} (${formatBytes(totalBytes)})`);

    return progress;
}

/**
 * Update upload progress
 * 
 * @param {string} uploadId - Upload ID
 * @param {Object} update - Progress update
 */
function updateUploadProgress(uploadId, update) {
    const progress = uploadProgressStore.get(uploadId);
    if (!progress) return null;

    // Update fields
    Object.assign(progress, update, {
        updatedAt: new Date().toISOString()
    });

    // Calculate percent if bytes provided
    if (update.uploadedBytes !== undefined && progress.totalBytes > 0) {
        progress.percent = Math.min(
            Math.round((progress.uploadedBytes / progress.totalBytes) * 100),
            100
        );
    }

    uploadProgressStore.set(uploadId, progress);

    // Broadcast to SSE clients
    broadcastProgress(uploadId, progress);

    return progress;
}

/**
 * Update stage-specific progress
 * 
 * @param {string} uploadId - Upload ID
 * @param {string} stage - Current stage
 * @param {number} stagePercent - Progress within stage (0-100)
 */
function updateStageProgress(uploadId, stage, stagePercent) {
    const progress = uploadProgressStore.get(uploadId);
    if (!progress) return null;

    progress.stage = stage;
    progress.details[`${stage}Progress`] = stagePercent;

    // Calculate overall percent based on stages
    // Stages: receiving (0-40%), s3 (40-70%), processing (70-100%)
    let overallPercent = 0;
    switch (stage) {
        case 'receiving':
            overallPercent = Math.round(stagePercent * 0.4);
            break;
        case 's3':
            overallPercent = 40 + Math.round(stagePercent * 0.3);
            break;
        case 'processing':
            overallPercent = 70 + Math.round(stagePercent * 0.3);
            break;
        default:
            overallPercent = progress.percent;
    }

    progress.percent = Math.min(overallPercent, 100);
    progress.updatedAt = new Date().toISOString();

    uploadProgressStore.set(uploadId, progress);
    broadcastProgress(uploadId, progress);

    return progress;
}

/**
 * Mark upload as complete
 * 
 * @param {string} uploadId - Upload ID
 * @param {Object} result - Upload result
 */
function completeUpload(uploadId, result = {}) {
    const progress = uploadProgressStore.get(uploadId);
    if (!progress) return null;

    progress.status = 'complete';
    progress.stage = 'complete';
    progress.percent = 100;
    progress.completedAt = new Date().toISOString();
    progress.result = result;

    uploadProgressStore.set(uploadId, progress);
    broadcastProgress(uploadId, progress);

    // Clean up after 5 minutes
    setTimeout(() => {
        uploadProgressStore.delete(uploadId);
        sseClients.delete(uploadId);
    }, 5 * 60 * 1000);

    console.log(`✅ Upload complete: ${uploadId} - ${progress.fileName}`);

    return progress;
}

/**
 * Mark upload as failed
 * 
 * @param {string} uploadId - Upload ID
 * @param {string} error - Error message
 */
function failUpload(uploadId, error) {
    const progress = uploadProgressStore.get(uploadId);
    if (!progress) return null;

    progress.status = 'error';
    progress.stage = 'error';
    progress.error = error;
    progress.failedAt = new Date().toISOString();

    uploadProgressStore.set(uploadId, progress);
    broadcastProgress(uploadId, progress);

    console.error(`❌ Upload failed: ${uploadId} - ${error}`);

    // Clean up after 1 minute
    setTimeout(() => {
        uploadProgressStore.delete(uploadId);
        sseClients.delete(uploadId);
    }, 60 * 1000);

    return progress;
}

/**
 * Mark upload as cancelled
 * 
 * @param {string} uploadId - Upload ID
 */
function cancelUpload(uploadId) {
    const progress = uploadProgressStore.get(uploadId);
    if (!progress) return null;

    progress.status = 'cancelled';
    progress.stage = 'cancelled';
    progress.cancelledAt = new Date().toISOString();

    // NEW: Cleanup local temporary file if it exists
    if (progress.localFilePath && fs.existsSync(progress.localFilePath)) {
        try {
            fs.unlinkSync(progress.localFilePath);
            console.log(`   🧹 [Cleanup] Deleted temporary file for cancelled upload: ${progress.localFilePath}`);
        } catch (err) {
            console.error(`   ⚠️ [Cleanup] Failed to delete temporary file: ${err.message}`);
        }
    }

    uploadProgressStore.set(uploadId, progress);
    broadcastProgress(uploadId, progress);

    console.log(`⏹️ Upload cancelled: ${uploadId} - ${progress.fileName}`);

    // Clean up after 1 minute
    setTimeout(() => {
        uploadProgressStore.delete(uploadId);
        sseClients.delete(uploadId);
    }, 60 * 1000);

    return progress;
}

/**
 * Check if upload is cancelled
 * 
 * @param {string} uploadId - Upload ID
 * @returns {boolean} True if cancelled
 */
function isCancelled(uploadId) {
    const progress = uploadProgressStore.get(uploadId);
    return progress ? progress.status === 'cancelled' : false;
}

/**
 * Get upload progress
 * 
 * @param {string} uploadId - Upload ID
 * @returns {Object|null} Progress object or null
 */
function getUploadProgress(uploadId) {
    return uploadProgressStore.get(uploadId) || null;
}

/**
 * Register SSE client for progress updates
 * 
 * @param {string} uploadId - Upload ID
 * @param {Response} res - Express response object
 */
function registerSSEClient(uploadId, res) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Store client
    if (!sseClients.has(uploadId)) {
        sseClients.set(uploadId, []);
    }
    sseClients.get(uploadId).push(res);

    // Send initial progress
    const progress = uploadProgressStore.get(uploadId);
    if (progress) {
        sendSSEEvent(res, 'progress', progress);
    }

    // Handle client disconnect
    res.on('close', () => {
        const clients = sseClients.get(uploadId);
        if (clients) {
            const index = clients.indexOf(res);
            if (index !== -1) {
                clients.splice(index, 1);
            }
        }
    });

    console.log(`📡 SSE client connected for upload: ${uploadId}`);
}

/**
 * Broadcast progress to all SSE clients
 * 
 * @param {string} uploadId - Upload ID
 * @param {Object} progress - Progress data
 */
function broadcastProgress(uploadId, progress) {
    const clients = sseClients.get(uploadId);
    if (!clients || clients.length === 0) return;

    clients.forEach(res => {
        try {
            sendSSEEvent(res, 'progress', progress);
        } catch (error) {
            // Client disconnected
        }
    });
}

/**
 * Send SSE event to client
 * 
 * @param {Response} res - Express response
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
function sendSSEEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Format bytes to human-readable
 * 
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get all active uploads for a user
 * 
 * @param {string} userId - User ID
 * @returns {Array} Active uploads
 */
function getUserActiveUploads(userId) {
    const uploads = [];
    uploadProgressStore.forEach((progress, uploadId) => {
        if (progress.userId === userId && progress.status !== 'complete' && progress.status !== 'error') {
            uploads.push(progress);
        }
    });
    return uploads;
}

/**
 * Create progress middleware for tracking upload bytes
 * 
 * @param {string} uploadId - Upload ID
 * @returns {Function} Middleware function
 */
function createProgressMiddleware(uploadId) {
    let receivedBytes = 0;
    const progress = uploadProgressStore.get(uploadId);
    const totalBytes = progress?.totalBytes || 0;

    return (req, res, next) => {
        req.on('data', (chunk) => {
            receivedBytes += chunk.length;

            if (totalBytes > 0) {
                const percent = Math.round((receivedBytes / totalBytes) * 100);
                updateStageProgress(uploadId, 'receiving', percent);
            }
        });

        req.on('end', () => {
            updateStageProgress(uploadId, 'receiving', 100);
        });

        next();
    };
}

module.exports = {
    createUploadProgress,
    updateUploadProgress,
    updateStageProgress,
    completeUpload,
    failUpload,
    cancelUpload,
    isCancelled,
    getUploadProgress,
    registerSSEClient,
    getUserActiveUploads,
    createProgressMiddleware,
    formatBytes
};
