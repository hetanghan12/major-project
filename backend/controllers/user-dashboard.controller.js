/**
 * User Dashboard Controller
 * ==========================
 * Provides a unified response for the User Dashboard.
 * Minimizes Firestore reads by using atomic counters and limited queries.
 */

const { getFirestore } = require('../config/firebase.config');
const { getUserStorageStats } = require('../services/storage-quota.service');
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
            storageStats = { fileCount: 0, storageUsedBytes: 0, storageLimitBytes: 5 * 1024 * 1024 * 1024, percentUsed: 0 };
        }

        // 2. Get ALL user docs with a simple single-field query (NO composite index needed)
        let allUserDocs = [];
        try {
            const snap = await db.collection('documents')
                .where('userId', '==', userId)
                .limit(200)
                .get();
            snap.forEach(doc => allUserDocs.push({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.warn('User docs query failed:', e.message);
        }

        // 3. Filter in memory for recent (not trashed, sorted by date, top 5)
        const recentDocuments = allUserDocs
            .filter(d => !d.isTrashed && d.status !== 'trash')
            .sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0))
            .slice(0, 5);

        // 4. Count starred in memory
        const starredCount = allUserDocs.filter(d => d.isStarred && !d.isTrashed).length;

        // 5. Build Shared count
        let sharedCount = 0;
        try {
            const sharedByMe = await getSharedByMe(userId);
            const sharedWithMe = await getSharedWithMe(userId);
            sharedCount = sharedByMe.length + sharedWithMe.length;
        } catch (err) {
            console.error('Failed to get shared count:', err);
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
                aiTasksCount: 24  // Demo placeholder
            },
            recentDocuments,
            typeDistribution: {
                documents: { count: storageStats.fileCount, bytes: storageStats.storageUsedBytes },
                media: { count: 0, bytes: 0 },
                others: { count: 0, bytes: 0 }
            }
        };

        res.json(responseData);
    } catch (error) {
        console.error('Global User Dashboard Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
});

module.exports = {
    getUserDashboardData
};
