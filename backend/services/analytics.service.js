/**
 * Analytics Service — Optimized
 */

const { getFirestore, admin } = require('../config/firebase.config');
const { incrementGlobalStats, incrementDailyStats, getCategory, invalidateUnifiedCache } = require('./dashboard-stats.service');
const { incrementUserStats } = require('./storage-quota.service');

const logSecurityEvent = async (data) => {
    try {
        const db = getFirestore();
        await db.collection('security_logs').add({
            eventType: data.eventType,
            userId: data.userId || 'SYSTEM',
            email: data.email || 'N/A',
            ipAddress: data.ipAddress || '0.0.0.0',
            action: data.action,
            timestamp: new Date().toISOString(),
            status: data.status || 'SUCCESS'
        });
    } catch (error) {
        console.error('Security Logging Error:', error.message);
    }
};

const logFileUpload = async (fileData) => {
    try {
        const db = getFirestore();
        const batch = db.batch();
        const fileSize = fileData.fileSize || 0;
        const category = getCategory(fileData.fileType, fileData.fileName);

        // 1. Files Collection Entry
        const fileRef = db.collection('files').doc();
        batch.set(fileRef, {
            fileId: fileRef.id,
            userId: fileData.userId,
            fileName: fileData.fileName,
            fileType: fileData.fileType,
            fileSize: fileSize,
            storageProvider: "AWS_S3",
            s3Key: fileData.s3Key,
            uploadDate: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            isDeleted: false
        });

        // 2. Upload Activity Entry (per-user)
        const dateStr = new Date().toISOString().split('T')[0];
        const activityId = `${fileData.userId}_${dateStr}`;
        const activityRef = db.collection('upload_activity').doc(activityId);

        batch.set(activityRef, {
            userId: fileData.userId,
            date: dateStr,
            uploadCount: admin.firestore.FieldValue.increment(1),
            uploadSize: admin.firestore.FieldValue.increment(fileSize),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        await batch.commit();

        // 3. Update aggregated docs (Zero Reads)
        invalidateUnifiedCache();
        incrementGlobalStats({
            totalFiles: 1,
            totalDocuments: 1,
            totalStorageUsed: fileSize,
            uploadsToday: 1,
            type: category  // This handles typeDistribution increments
        }).catch(err => console.error('Global stats failed:', err.message));

        incrementDailyStats({
            uploads: 1,
            storageUsed: fileSize
        }).catch(err => console.error('Daily stats failed:', err.message));

        await logSecurityEvent({
            eventType: 'FILE_UPLOAD',
            userId: fileData.userId,
            email: fileData.userEmail,
            ipAddress: fileData.ipAddress,
            action: `User uploaded ${fileData.fileName}`,
            status: 'SUCCESS'
        });

        // 4. Update individual user stats (Zero Reads)
        await incrementUserStats(fileData.userId, fileSize, 1).catch(e => console.error('User stats update failed:', e.message));

    } catch (error) {
        console.error('File Logging Error:', error.message);
    }
};

const trackNewUser = async () => {
    try {
        invalidateUnifiedCache();
        await incrementGlobalStats({ totalUsers: 1 });
        await incrementDailyStats({ newUsers: 1 });
    } catch (error) {
        console.error('Track new user failed:', error.message);
    }
};

const trackAiRequest = async () => {
    try {
        invalidateUnifiedCache();
        await incrementGlobalStats({ aiRequestsToday: 1 });
        await incrementDailyStats({ aiRequests: 1 });
    } catch (error) {
        console.error('Track AI request failed:', error.message);
    }
};

const trackFileDeletion = async (userId, fileSize = 0, fileType = '', fileName = '') => {
    try {
        const { getCategory } = require('./dashboard-stats.service');
        const category = getCategory(fileType, fileName);

        const db = getFirestore();
        const ref = db.collection('analytics').doc('global_stats');

        // Decrement counters
        const decrements = {
            totalFiles: admin.firestore.FieldValue.increment(-1),
            totalDocuments: admin.firestore.FieldValue.increment(-1),
            totalStorageUsed: admin.firestore.FieldValue.increment(-Math.abs(fileSize)),
            [`typeDistribution.${category}.count`]: admin.firestore.FieldValue.increment(-1),
            [`typeDistribution.${category}.bytes`]: admin.firestore.FieldValue.increment(-Math.abs(fileSize))
        };

        await ref.update(decrements);
        invalidateUnifiedCache();

        // 4. Update individual user stats (Zero Reads)
        await incrementUserStats(userId, -fileSize, -1);
    } catch (error) {
        console.error('Track deletion failed:', error.message);
    }
};

const trackFolderCreation = async () => {
    try {
        await incrementGlobalStats({ totalFiles: 1, totalDocuments: 1 });
    } catch (error) {
        console.error('Track folder creation failed:', error.message);
    }
};

module.exports = {
    logSecurityEvent,
    logFileUpload,
    trackNewUser,
    trackAiRequest,
    trackFileDeletion,
    trackFolderCreation
};
