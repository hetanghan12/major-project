const express = require('express');
const router = express.Router();
const { getUserNotifications, markAsRead } = require('../services/notification.service');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * Get user notifications
 * GET /api/notifications
 */
router.get('/', verifyFirebaseToken, asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    console.log(`[NOTIFS] Fetching for user: ${userId}`);
    const notifications = await getUserNotifications(userId);
    console.log(`[NOTIFS] Found ${notifications.length} notifications`);
    
    res.json({
        success: true,
        notifications
    });
}));

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
router.patch('/:id/read', verifyFirebaseToken, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const success = await markAsRead(id, req.user.uid);

    if (!success) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    }
    
    res.json({
        success: true,
        message: 'Notification marked as read'
    });
}));

module.exports = router;
