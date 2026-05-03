/**
 * Notification Service
 * ====================
 * Handles creation and management of user notifications.
 */

const { getFirestore } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new notification for a user
 * 
 * @param {Object} params - { userId, type, message, fileId }
 */
async function createNotification({ userId, type, message, fileId = null }) {
    if (!userId) {
        console.warn('⚠️ Notification attempted without userId');
        return null;
    }

    try {
        const db = getFirestore();
        const notificationId = uuidv4();
        
        const notificationData = {
            id: notificationId,
            userId,
            type, // 'upload', 'ai', 'share'
            message,
            fileId,
            read: false,
            createdAt: new Date().toISOString()
        };

        await db.collection('notifications').doc(notificationId).set(notificationData);
        console.log(`🔔 Notification Created [${type}]: ${userId}`);
        
        return notificationData;
    } catch (error) {
        console.error('❌ Failed to create notification:', error.message);
        return null;
    }
}

/**
 * Create a specialized notification for admins
 */
async function createAdminNotification({ type, message, details = {} }) {
    try {
        const db = getFirestore();
        const notificationId = uuidv4();
        
        const notificationData = {
            id: notificationId,
            userId: 'ADMIN', // Global admin flag
            type, // 'USER_SIGNUP', 'SYSTEM_ALERT', 'SECURITY', 'PLAN_UPGRADE'
            message,
            details,
            read: false,
            createdAt: new Date().toISOString()
        };

        await db.collection('notifications').doc(notificationId).set(notificationData);
        console.log(`📡 Admin Notification Created [${type}]`);
        
        return notificationData;
    } catch (error) {
        console.error('❌ Failed to create admin notification:', error.message);
        return null;
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    try {
        if (!notificationId || !userId) {
            return false;
        }

        const db = getFirestore();
        const notificationRef = db.collection('notifications').doc(notificationId);
        const notificationDoc = await notificationRef.get();

        if (!notificationDoc.exists) {
            return false;
        }

        const notification = notificationDoc.data();
        if (!notification || notification.userId !== userId) {
            console.warn(`⚠️ Notification ownership mismatch for ${notificationId} by ${userId}`);
            return false;
        }

        await notificationRef.update({
            read: true
        });
        return true;
    } catch (error) {
        console.error('❌ Failed to mark notification as read:', error.message);
        return false;
    }
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, limit = 50) {
    try {
        const db = getFirestore();
        console.log(`[NOTIFS-V2] Fetching for ${userId} at ${new Date().toISOString()}`);
        // Simple query - NO orderBy to avoid index errors
        let query = db.collection('notifications')
            .where('userId', '==', userId);
        
        const snapshot = await query.get();

        let notifications = [];
        snapshot.forEach(doc => notifications.push(doc.data()));
        
        // Sort in memory instead (descending by createdAt)
        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Apply limit after sorting
        return notifications.slice(0, limit);
    } catch (error) {
        console.error('❌ [NotificationService] Failed to fetch notifications:', error.message);
        return [];
    }
}

/**
 * Get all admin notifications
 */
async function getAdminNotifications(limit = 50) {
    return getUserNotifications('ADMIN', limit);
}

/**
 * Mark all admin notifications as read
 */
async function markAllAdminRead() {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('notifications')
            .where('userId', '==', 'ADMIN')
            .where('read', '==', false)
            .get();
        
        if (snapshot.empty) return true;

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error('❌ Failed to mark all admin notifications as read:', error.message);
        return false;
    }
}

module.exports = {
    createNotification,
    createAdminNotification,
    markAsRead,
    getUserNotifications,
    getAdminNotifications,
    markAllAdminRead
};
