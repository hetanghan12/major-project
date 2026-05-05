/**
 * STORAGE API ROUTES
 * ===================
 * Production-grade storage management endpoints.
 * 
 * ============================================================================
 * ENDPOINTS
 * ============================================================================
 * 
 * GET  /api/storage/stats        - Get user's storage statistics
 * GET  /api/storage/breakdown    - Get storage breakdown by file type
 * GET  /api/storage/quota/check  - Check if user can upload a file
 * GET  /api/upload/progress/:id  - SSE endpoint for upload progress
 * 
 * ============================================================================
 * SECURITY
 * ============================================================================
 * 
 * All endpoints require Firebase token authentication.
 * User ID is extracted from verified token only.
 * 
 * @author CloudAI Storage System
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// Services
const {
    getUserStorageStats,
    checkStorageQuota,
    getStorageBreakdown,
    initializeUserStorage
} = require('../services/storage-quota.service');

const {
    getUploadProgress,
    registerSSEClient,
    getUserActiveUploads,
    cancelUpload
} = require('../services/upload-progress.service');

const { updateDocumentStatus } = require('../services/firestore.service');

// =============================================================================
// STORAGE STATISTICS
// =============================================================================

/**
 * Get user's storage statistics
 * GET /api/storage/stats
 * 
 * Returns:
 * {
 *   "storageUsedBytes": 1293942784,
 *   "storageLimitBytes": 5368709120,
 *   "storageUsedFormatted": "1.21 GB",
 *   "storageLimitFormatted": "5 GB",
 *   "percentUsed": 24,
 *   "fileCount": 15,
 *   "isNearLimit": false,
 *   "isAtLimit": false,
 *   "availableBytes": 4074766336,
 *   "availableFormatted": "3.79 GB"
 * }
 */
router.get('/storage/stats',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;

        try {
            const stats = await getUserStorageStats(userId);

            res.json({
                success: true,
                storage: stats
            });

        } catch (error) {
            if (error.code === 8 || error.message.includes('Quota')) {
                return res.json({
                    success: true,
                    storage: {
                        storageUsedBytes: 0,
                        storageLimitBytes: 5368709120,
                        storageUsedFormatted: "0 B",
                        storageLimitFormatted: "5 GB",
                        percentUsed: 0,
                        fileCount: 0,
                        isNearLimit: false,
                        isAtLimit: false,
                        availableBytes: 5368709120,
                        availableFormatted: "5 GB"
                    },
                    quotaExceeded: true
                });
            }
            console.error('Failed to get storage stats:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get storage statistics'
            });
        }
    }
);

/**
 * Get storage breakdown by file type
 * GET /api/storage/breakdown
 */
router.get('/storage/breakdown',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;

        try {
            const breakdown = await getStorageBreakdown(userId);

            res.json({
                success: true,
                breakdown
            });

        } catch (error) {
            if (error.code === 8 || error.message.includes('Quota')) {
                return res.json({
                    success: true,
                    breakdown: {
                        documents: { count: 0, bytes: 0 },
                        image: { count: 0, bytes: 0 },
                        video: { count: 0, bytes: 0 },
                        audio: { count: 0, bytes: 0 },
                        other: { count: 0, bytes: 0 }
                    },
                    quotaExceeded: true
                });
            }
            console.error('Failed to get storage breakdown:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get storage breakdown'
            });
        }
    }
);

/**
 * Check if user can upload a file of given size
 * GET /api/storage/quota/check?size=1234567
 */
router.get('/storage/quota/check',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const fileSize = parseInt(req.query.size) || 0;

        if (fileSize <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file size'
            });
        }

        try {
            const result = await checkStorageQuota(userId, fileSize);

            res.json({
                success: true,
                ...result
            });

        } catch (error) {
            console.error('Failed to check quota:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to check storage quota'
            });
        }
    }
);

/**
 * Initialize user storage (called on login)
 * POST /api/storage/initialize
 */
router.post('/storage/initialize',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;

        try {
            await initializeUserStorage(userId);
            const stats = await getUserStorageStats(userId);

            res.json({
                success: true,
                message: 'Storage initialized',
                storage: stats
            });

        } catch (error) {
            console.error('Failed to initialize storage:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to initialize storage'
            });
        }
    }
);

// =============================================================================
// UPLOAD PROGRESS (SSE)
// =============================================================================

/**
 * Get upload progress (SSE stream)
 * GET /api/upload/progress/:uploadId
 * 
 * This is a Server-Sent Events endpoint.
 * Client connects and receives real-time progress updates.
 */
router.get('/upload/progress/:uploadId',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const uploadId = req.params.uploadId;

        // Get progress
        const progress = getUploadProgress(uploadId);

        // Security: Verify ownership
        if (progress && progress.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // If no progress or already complete, return JSON
        if (!progress || progress.status === 'complete' || progress.status === 'error') {
            return res.json({
                success: true,
                progress: progress || null
            });
        }

        // Register SSE client for real-time updates
        registerSSEClient(uploadId, res);
    }
);

/**
 * Get all active uploads for user
 * GET /api/upload/active
 */
router.get('/upload/active',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;

        try {
            const uploads = getUserActiveUploads(userId);

            res.json({
                success: true,
                count: uploads.length,
                uploads
            });

        } catch (error) {
            console.error('Failed to get active uploads:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to get active uploads'
            });
        }
    }
);

/**
 * Cancel an ongoing upload
 * POST /api/uploads/cancel
 */
router.post('/uploads/cancel',
    verifyFirebaseToken,
    async (req, res) => {
        const userId = req.user.uid;
        const { uploadId } = req.body;

        if (!uploadId) {
            return res.status(400).json({
                success: false,
                message: 'uploadId is required'
            });
        }

        try {
            // 1. Verify upload exists and belongs to user
            const progress = getUploadProgress(uploadId);
            if (!progress || progress.userId !== userId) {
                return res.status(404).json({
                    success: false,
                    message: 'Upload not found'
                });
            }

            // 2. Update Firestore status ONLY if it's not already terminal
            try {
                await updateDocumentStatus(uploadId, 'cancelled');
            } catch (fsError) {
                console.warn(`[Cleanup] Firestore status update failed: ${fsError.message}`);
            }

            // 3. Trigger cancellation (includes local file deletion now)
            cancelUpload(uploadId);

            res.json({
                success: true,
                message: 'Upload cancelled'
            });

        } catch (error) {
            console.error('Failed to cancel upload:', error.message);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel upload'
            });
        }
    }
);

module.exports = router;
