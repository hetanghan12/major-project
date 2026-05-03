/**
 * Analytics Service — Optimized
 */

const { getFirestore, admin } = require('../config/firebase.config');
const { incrementGlobalStats, incrementDailyStats, getCategory, invalidateUnifiedCache } = require('./dashboard-stats.service');
const { incrementUserStats } = require('./storage-quota.service');
const { admin: firestoreAdmin } = require('../config/firebase.config');

// Pricing per 1k tokens (Consistent with AI Controller)
const PRICING = {
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
    'text-embedding-3-large': 0.00013,
    'default': 0.002
};

const calculateCost = (model, usage) => {
    if (!usage) return 0;
    const modelPricing = PRICING[model] || PRICING.default;

    if (typeof modelPricing === 'object' && usage.prompt_tokens !== undefined) {
        return ((usage.prompt_tokens * modelPricing.prompt) + (usage.completion_tokens * modelPricing.completion)) / 1000;
    }

    const tokens = usage.total_tokens || usage;
    const rate = typeof modelPricing === 'number' ? modelPricing : 0.002;
    return (tokens * rate) / 1000;
};

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
        const fileSize = fileData.fileSize || 0;
        const category = getCategory(fileData.fileType, fileData.fileName);

        // NOTE: The actual file record is already created in the 'files' collection
        // by saveDocument() in firestore.service.js. Do NOT create another record here
        // as that causes ghost/duplicate file counts in the admin dashboard.

        // 1. Upload Activity Entry (per-user) — for tracking daily upload stats
        const dateStr = new Date().toISOString().split('T')[0];
        const activityId = `${fileData.userId}_${dateStr}`;
        const activityRef = db.collection('upload_activity').doc(activityId);

        await activityRef.set({
            userId: fileData.userId,
            date: dateStr,
            uploadCount: admin.firestore.FieldValue.increment(1),
            uploadSize: admin.firestore.FieldValue.increment(fileSize),
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 3. Update aggregated docs (Zero Reads) - SKIP FOLDERS
        const isFolder = fileData.fileType === 'folder' || fileData.isFolder === true;
        
        invalidateUnifiedCache();
        
        if (!isFolder) {
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
        }

        await logSecurityEvent({
            eventType: 'FILE_UPLOAD',
            userId: fileData.userId,
            email: fileData.userEmail,
            ipAddress: fileData.ipAddress,
            action: `User uploaded ${fileData.fileName}`,
            status: 'SUCCESS'
        });

        // 4. Update individual user stats (Zero Reads)
        if (!isFolder) {
            await incrementUserStats(fileData.userId, fileSize, 1, category).catch(e => console.error('User stats update failed:', e.message));
        }

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

const trackAiRequest = async (usageData = {}) => {
    try {
        const { tokens = 0, cost = 0, model = 'gpt-3.5-turbo', type = 'CHAT', userId = 'SYSTEM' } = usageData;

        const db = getFirestore();

        // 1. Log detailed usage for the Admin Panel metrics
        await db.collection('ai_usage').add({
            userId,
            model,
            type,
            usage: {
                total_tokens: tokens,
                prompt_tokens: usageData.prompt_tokens || 0,
                completion_tokens: usageData.completion_tokens || 0
            },
            cost: parseFloat(cost) || 0,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update aggregated stats (Zero Reads)
        invalidateUnifiedCache();
        await incrementGlobalStats({
            aiRequestsToday: 1,
            totalTokens: tokens,
            estimatedCost: cost
        });

        await incrementDailyStats({
            aiRequests: 1,
            tokens: tokens,
            cost: cost
        });

        console.log(`🤖 [ANALYTICS] AI usage logged: ${tokens} tokens, $${cost} cost`);
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

        const isFolder = fileType === 'folder';
        
        if (!isFolder) {
            // Decrement counters
            const decrements = {
                totalFiles: admin.firestore.FieldValue.increment(-1),
                totalDocuments: admin.firestore.FieldValue.increment(-1),
                totalStorageUsed: admin.firestore.FieldValue.increment(-Math.abs(fileSize)),
                [`typeDistribution.${category}.count`]: admin.firestore.FieldValue.increment(-1),
                [`typeDistribution.${category}.bytes`]: admin.firestore.FieldValue.increment(-Math.abs(fileSize))
            };

            await ref.update(decrements);
            
            // 4. Update individual user stats (Zero Reads)
            await incrementUserStats(userId, -fileSize, -1, category);
        }
        
        invalidateUnifiedCache();
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
    trackFolderCreation,
    calculateCost
};
