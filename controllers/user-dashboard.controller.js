/**
 * User Dashboard Controller
 * ==========================
 * Provides a unified response for the User Dashboard.
 * Minimizes Firestore reads by using atomic counters and limited queries.
 */

const { getFirestore } = require('../config/firebase.config');
const { getUserStorageStats, PLANS } = require('../services/storage-quota.service');
const { getSharedByMe, getSharedWithMe } = require('../services/share.service');
const { asyncHandler } = require('../middlewares/error.middleware');

/**
 * GET /api/secure/documents/dashboard
 * Unified User Dashboard Data
 */
const getUserDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user.uid;
    const db = getFirestore();

    try {
        // 1. Get Storage Stats (Reliable, single-doc read)
        let storageStats;
        try {
            storageStats = await getUserStorageStats(userId);
        } catch (sError) {
            console.error('Storage Stats Error:', sError.message);
            const freeLimit = (PLANS.free.storageLimitGB || 5) * 1024 * 1024 * 1024;
            storageStats = { fileCount: 0, storageUsedBytes: 0, storageLimitBytes: freeLimit, percentUsed: 0 };
        }

        // 2. Fetch RECENT documents only (Cheaper than fetching everything)
        let rawRecentDocs = [];
        try {
            const [fs1, fs2, ds1, ds2] = await Promise.all([
                db.collection('files').where('userId', '==', userId).limit(15).get(),
                db.collection('files').where('ownerUserId', '==', userId).limit(15).get(),
                db.collection('documents').where('userId', '==', userId).limit(15).get(),
                db.collection('documents').where('ownerUserId', '==', userId).limit(15).get()
            ]);

            const docMap = new Map();
            const process = (snap) => snap.forEach(doc => {
                const data = doc.data();
                if (!data.isTrashed && data.status !== 'trash') {
                    // CRITICAL DEDUPLICATION: Use documentId field for uniqueness
                    const uniqueId = data.documentId || data.fileId || doc.id;

                    // Normalize date for frontend (handle Firestore Timestamps)
                    let uploadedAt = data.uploadedAt;
                    if (uploadedAt && typeof uploadedAt.toDate === 'function') {
                        uploadedAt = uploadedAt.toDate().toISOString();
                    } else if (uploadedAt && uploadedAt._seconds) {
                        uploadedAt = new Date(uploadedAt._seconds * 1000).toISOString();
                    }
                    
                    docMap.set(uniqueId, { id: uniqueId, ...data, uploadedAt });
                }
            });
            [fs1, fs2, ds1, ds2].forEach(process);
            rawRecentDocs = Array.from(docMap.values());
        } catch (e) {
            console.warn('Dashboard query fallback (index missing):', e.message);
            const fs1 = await db.collection('files').where('userId', '==', userId).limit(30).get();
            fs1.forEach(doc => {
                const data = doc.data();
                let uploadedAt = data.uploadedAt;
                if (uploadedAt && typeof uploadedAt.toDate === 'function') {
                    uploadedAt = uploadedAt.toDate().toISOString();
                }
                rawRecentDocs.push({ id: doc.id, ...data, uploadedAt });
            });
        }

        // Final sort and STRICT limit to 5 items to keep UI clean
        const recentDocuments = rawRecentDocs
            .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
            .slice(0, 5);

        // ==========================================
        // SELF-HEALING: Sync mismatch (Production Fix)
        // If we found more recent documents than the total count suggests, 
        // or if the counts don't match for a small number of files, trigger recalibration.
        // ==========================================
        const foundCount = recentDocuments.length;
        const recordedCount = storageStats.fileCount;
        
        // Trigger if:
        // 1. We found more files in the "recent" query than the record says (Definite error)
        // 2. The record is small (<10) and doesn't match what we just found (Likely error)
        const needsHealing = (foundCount > recordedCount) || (recordedCount < 10 && foundCount !== recordedCount);

        if (needsHealing) {
            console.log(`🔄 [Self-Healing] Detected stats mismatch for ${userId} (Found ${foundCount} recent docs, record says ${recordedCount}). Syncing...`);
            const { recalibrateUserStats } = require('../services/storage-quota.service');
            const realStats = await recalibrateUserStats(userId);
            
            // Update the local storageStats object for the response
            storageStats.fileCount = realStats.fileCount;
            storageStats.storageUsedBytes = realStats.storageUsed;
            
            // Recalculate percent used
            const limit = storageStats.storageLimitBytes || (5 * 1024 * 1024 * 1024);
            storageStats.percentUsed = limit > 0 ? Math.min(Math.round((storageStats.storageUsedBytes / limit) * 100), 100) : 0;
        }

        // 3. Count Starred
        let starredCount = 0;
        try {
            const [s1, s2] = await Promise.all([
                db.collection('files').where('userId', '==', userId).where('isStarred', '==', true).get(),
                db.collection('documents').where('userId', '==', userId).where('isStarred', '==', true).get()
            ]);
            starredCount = s1.size + s2.size;
        } catch (e) {
            console.warn('Starred count failed:', e.message);
        }

        // 5. Build Shared count
        let sharedCount = 0;
        try {
            const sharedByMe = await getSharedByMe(userId);
            const sharedWithMe = await getSharedWithMe(userId);
            sharedCount = sharedByMe.length + sharedWithMe.length;
        } catch (err) {
            console.error('Failed to get shared count:', err);
        }

        // 6. Get User Data for AI Stats (Priority to NEW granular tracking)
        let aiRequestsUsed = 0;
        let aiRequestsLimit = 50; // Default fallback
        let aiRequestsRemaining = 50;
        
        try {
            const { getEffectivePlan } = require('../services/storage-quota.service');
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            const planName = await getEffectivePlan(userId, userData);
            const planConfig = PLANS[planName] || PLANS.free;
            aiRequestsLimit = planConfig.aiRequestsPerMonth;

            // Attempt to load granular usage document (NEW requirement)
            const aiUsageDoc = await db.collection('users').doc(userId).collection('usage').doc('ai').get();
            
            if (aiUsageDoc.exists) {
                const aiData = aiUsageDoc.data();
                aiRequestsUsed = aiData.usedQueries || 0;
                // Use the limit from the document if it exists, otherwise use plan limit
                aiRequestsLimit = aiData.monthlyLimit || aiRequestsLimit;
                aiRequestsRemaining = aiData.remainingQueries !== undefined ? aiData.remainingQueries : Math.max(0, aiRequestsLimit - aiRequestsUsed);
            } else {
                // Initial migration/fallback
                aiRequestsUsed = userData.aiRequestsUsed || 0;
                aiRequestsRemaining = Math.max(0, aiRequestsLimit - aiRequestsUsed);
                
                // Proactively initialize if missing to ensure future accuracy
                const { initializeAiUsage } = require('../services/ai-usage.service');
                initializeAiUsage(userId, planName).catch(() => {});
            }
        } catch (aiErr) {
            console.error('Failed to get AI stats:', aiErr);
            aiRequestsRemaining = Math.max(0, aiRequestsLimit - aiRequestsUsed);
        }

        const responseData = {
            success: true,
            stats: {
                totalFiles: storageStats.fileCount,
                totalStorageUsed: storageStats.storageUsedBytes,
                storageLimit: storageStats.storageLimitBytes,
                percentUsed: storageStats.percentUsed,
                starredCount: starredCount,
                sharedCount: sharedCount,
                aiTasksCount: aiRequestsUsed,
                aiTasksLimit: aiRequestsLimit,
                aiTasksRemaining: aiRequestsRemaining
            },
            recentDocuments,
            typeDistribution: storageStats.typeDistribution || {
                documents: { count: storageStats.fileCount, bytes: storageStats.storageUsedBytes },
                media: { count: 0, bytes: 0 },
                others: { count: 0, bytes: 0 }
            }
        };

        res.json(responseData);
    } catch (error) {
        console.error('❌ [DashboardController] FATAL ERROR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch dashboard data',
            debug: error.message 
        });
    }
});

module.exports = {
    getUserDashboardData
};
