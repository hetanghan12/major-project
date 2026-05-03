/**
 * Dashboard Stats Aggregation Service — IMPROVED
 * ============================================
 * Maintains pre-computed counters in Firestore to eliminate scans.
 * Supports type distribution (images, videos, etc.)
 */

const { getFirestore, admin } = require('../config/firebase.config');

const FieldValue = admin.firestore.FieldValue;

// Cache settings
let cachedGlobalStats = null;
let cachedGlobalStatsTimestamp = 0;
const GLOBAL_CACHE_TTL = 30000; // 30 seconds for admin

let cachedDailyStats = {};
let cachedDailyStatsTimestamp = 0;
const DAILY_CACHE_TTL = 60000; // 1 minute

// User requested Unified Cache
let cachedUnifiedDashboard = null;
let cachedUnifiedTimestamp = 0;
const UNIFIED_CACHE_TTL = 60000; // 60 seconds

/**
 * Get category from file type string or filename
 */
function getCategory(fileType, fileName) {
    const mime = (fileType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();

    if (mime.includes('image/') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'media';
    if (mime.includes('video/') || name.match(/\.(mp4|avi|mov|mkv)$/)) return 'media';
    if (mime.includes('audio/') || name.match(/\.(mp3|wav|ogg)$/)) return 'media';
    if (mime.includes('pdf') || mime.includes('document') || mime.includes('text/') || mime.includes('msword') || mime.includes('presentation') || mime.includes('spreadsheet') || 
        name.match(/\.(pdf|doc|docx|txt|rtf|xls|xlsx|csv|tsv|ppt|pptx|pot|potx|md|json|xml)$/)) return 'documents';
    return 'others';
}

/**
 * Increment global stats with type distribution
 */
async function incrementGlobalStats(updates = {}) {
    try {
        const db = getFirestore();
        const ref = db.collection('analytics').doc('global_stats');

        const incrementData = { lastUpdated: FieldValue.serverTimestamp() };

        if (updates.totalUsers) incrementData.totalUsers = FieldValue.increment(updates.totalUsers);
        if (updates.totalFiles) incrementData.totalFiles = FieldValue.increment(updates.totalFiles);
        if (updates.totalDocuments) incrementData.totalDocuments = FieldValue.increment(updates.totalDocuments);
        if (updates.totalStorageUsed) incrementData.totalStorageUsed = FieldValue.increment(updates.totalStorageUsed);
        if (updates.uploadsToday) incrementData.uploadsToday = FieldValue.increment(updates.uploadsToday);
        if (updates.aiRequestsToday) incrementData.aiRequestsToday = FieldValue.increment(updates.aiRequestsToday);
        if (updates.totalTokens) incrementData.totalTokens = FieldValue.increment(updates.totalTokens);
        if (updates.estimatedCost) incrementData.estimatedCost = FieldValue.increment(updates.estimatedCost);

        // Handle Type Distribution Increments
        if (updates.type) {
            const category = updates.type; // documents, media, others
            const size = updates.totalStorageUsed || 0;
            incrementData[`typeDistribution.${category}.count`] = FieldValue.increment(1);
            if (size) incrementData[`typeDistribution.${category}.bytes`] = FieldValue.increment(size);
        }

        await ref.set(incrementData, { merge: true });
        cachedGlobalStats = null;
        console.log('📊 [STATS] Global stats updated:', updates.type || 'counters');
    } catch (error) {
        console.error('📊 [STATS] Global sync failed:', error.message);
    }
}

/**
 * Increment daily stats for charts
 */
async function incrementDailyStats(updates = {}) {
    try {
        const db = getFirestore();
        const dateStr = new Date().toISOString().split('T')[0];
        const ref = db.collection('upload_activity_daily').doc(dateStr);

        const incrementData = { date: dateStr, lastUpdated: FieldValue.serverTimestamp() };

        if (updates.uploads) incrementData.uploads = FieldValue.increment(updates.uploads);
        if (updates.aiRequests) incrementData.aiRequests = FieldValue.increment(updates.aiRequests);
        if (updates.newUsers) incrementData.newUsers = FieldValue.increment(updates.newUsers);
        if (updates.storageUsed) incrementData.storageUsed = FieldValue.increment(updates.storageUsed);
        if (updates.tokens) incrementData.tokens = FieldValue.increment(updates.tokens);
        if (updates.cost) incrementData.cost = FieldValue.increment(updates.cost);

        await ref.set(incrementData, { merge: true });
        cachedDailyStats = {};
        console.log(`📊 [STATS] Daily stats/${dateStr} updated`);
    } catch (error) {
        console.error('📊 [STATS] Daily sync failed:', error.message);
    }
}

/**
 * Get Global Stats with Cache
 */
async function getGlobalStats() {
    const now = Date.now();
    if (cachedGlobalStats && (now - cachedGlobalStatsTimestamp < GLOBAL_CACHE_TTL)) return cachedGlobalStats;

    try {
        const db = getFirestore();
        const doc = await db.collection('analytics').doc('global_stats').get();
        if (doc.exists) {
            cachedGlobalStats = doc.data();
        } else {
            cachedGlobalStats = {
                totalUsers: 0, totalFiles: 0, totalDocuments: 0, totalStorageUsed: 0,
                uploadsToday: 0, aiRequestsToday: 0, totalTokens: 0, estimatedCost: 0,
                typeDistribution: {
                    documents: { count: 0, bytes: 0 },
                    media: { count: 0, bytes: 0 },
                    others: { count: 0, bytes: 0 }
                }
            };
        }
        cachedGlobalStatsTimestamp = now;
        return cachedGlobalStats;
    } catch (error) {
        return cachedGlobalStats || { totalUsers: 0, typeDistribution: {} };
    }
}

/**
 * Get last 7 days for charts
 */
async function getDailyStats(days = 7) {
    const now = Date.now();
    const cacheKey = `daily_${days}`;
    if (cachedDailyStats[cacheKey] && (now - cachedDailyStatsTimestamp < DAILY_CACHE_TTL)) return cachedDailyStats[cacheKey];

    try {
        const db = getFirestore();
        const dateKeys = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dateKeys.push(d.toISOString().split('T')[0]);
        }

        const snap = await db.collection('upload_activity_daily').orderBy('date', 'desc').limit(days).get();
        const dbData = {};
        snap.forEach(doc => { dbData[doc.id] = doc.data(); });

        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const result = dateKeys.map(dateStr => {
            const d = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = daysMap[d.getDay()];
            const data = dbData[dateStr] || {};
            return {
                date: dateStr, day: dayOfWeek,
                uploads: data.uploads || 0, aiRequests: data.aiRequests || 0,
                newUsers: data.newUsers || 0, storageUsed: data.storageUsed || 0
            };
        });

        cachedDailyStats[cacheKey] = result;
        cachedDailyStatsTimestamp = now;
        return result;
    } catch (error) {
        return [];
    }
}

/**
 * Invalidate Unified Cache
 */
function invalidateUnifiedCache() {
    cachedUnifiedDashboard = null;
    cachedUnifiedTimestamp = 0;
}

/**
 * Get Unified Dashboard Data (One big call for the frontend)
 * Minimizes reads by fetching only summary documents.
 */
async function getUnifiedDashboard() {
    const now = Date.now();
    if (cachedUnifiedDashboard && (now - cachedUnifiedTimestamp < UNIFIED_CACHE_TTL)) {
        console.log('⚡ [CACHE] Serving unified dashboard from cache');
        return cachedUnifiedDashboard;
    }

    try {
        console.log('🔄 [STATS] Fetching fresh unified dashboard data...');
        const db = getFirestore();

        // 1. COMPUTE REAL STATS from actual documents collection
        let totalFiles = 0;
        let totalStorageBytes = 0;
        const typeDistribution = {
            documents: { count: 0, bytes: 0 },
            media: { count: 0, bytes: 0 },
            others: { count: 0, bytes: 0 }
        };

        try {
            const [filesSnap, docsSnap] = await Promise.all([
                db.collection('files').get(),
                db.collection('documents').get()
            ]);

            // DEDUPLICATION: Prevent double counting across collections
            const uniqueFiles = new Map();

            const collectUniqueFiles = (snap) => {
                snap.forEach(doc => {
                    const data = doc.data();
                    const docId = data.documentId || data.fileId || doc.id;

                    // Skip analytics-only ghost records
                    if (!data.documentId && !data.uploadId && data.storageProvider) return;

                    if (!uniqueFiles.has(docId)) {
                        uniqueFiles.set(docId, data);
                    } else if (data.status === 'completed') {
                        uniqueFiles.set(docId, data);
                    }
                });
            };

            collectUniqueFiles(filesSnap);
            collectUniqueFiles(docsSnap);

            uniqueFiles.forEach((data) => {
                if (data.isFolder) return;

                const size = data.fileSize || 0;
                totalFiles++;
                totalStorageBytes += size;

                const category = getCategory(data.fileType, data.fileName);
                if (typeDistribution[category]) {
                    typeDistribution[category].count++;
                    typeDistribution[category].bytes += size;
                } else {
                    typeDistribution.others.count++;
                    typeDistribution.others.bytes += size;
                }
            });
        } catch (docsErr) {
            console.error('Documents scan failed:', docsErr.message);
        }

        // 2. Get Users from Auth
        let totalUsers = 0;
        try {
            const auth = require('../config/firebase.config').getAuth();
            const usersResult = await auth.listUsers(1000);
            totalUsers = usersResult.users.length;
        } catch (e) {
            console.warn('Auth list failed:', e.message);
        }

        // 3. Get Daily Activity (Last 7 days)
        const activity = await getDailyStats(7);

        // 4. Get Recent Activity (limited)
        const activitySnap = await db.collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const recentActivity = [];
        activitySnap.forEach(doc => {
            const data = doc.data();
            recentActivity.push({
                id: doc.id,
                event: data.action || data.eventType,
                user: data.email || 'System',
                timestamp: data.timestamp,
                status: data.status || 'Success'
            });
        });

        const result = {
            stats: {
                totalUsers,
                totalFiles,
                totalStorageBytes,
                totalAiRequests: 0
            },
            storageActivity: activity.map(d => ({
                label: d.day,
                value: (d.storageUsed / (1024 * 1024)).toFixed(2), // MB
                uploads: d.uploads,
                date: d.date
            })),
            typeDistribution,
            recentActivity
        };

        cachedUnifiedDashboard = result;
        cachedUnifiedTimestamp = now;
        return result;
    } catch (error) {
        console.error('Unified Dashboard Error:', error.message);
        throw error;
    }
}

/**
 * Seed data from existing collections to solve the 0-display issue
 */
async function seedDashboardStats() {
    try {
        const db = getFirestore();
        const auth = require('../config/firebase.config').getAuth();

        console.log('🌱 [SEED] Re-calibrating dashboard stats...');

        // 1. Get Users
        const usersResult = await auth.listUsers(1000);
        const totalUsers = usersResult.users.length;

        // 2. Scan BOTH Collections for storage and distribution (Migration Support)
        const [filesSnap, documentsOldSnap] = await Promise.all([
            db.collection('files').get(),
            db.collection('documents').get()
        ]);
        
        let totalDocs = 0;
        let totalStorage = 0;
        let typeDistribution = {
            documents: { count: 0, bytes: 0 },
            media: { count: 0, bytes: 0 },
            others: { count: 0, bytes: 0 }
        };

        const dailyStatsMap = {}; // To populate chart history

        // DEDUPLICATION: Prevent double counting across collections
        const uniqueFiles = new Map();

        const collectItems = (snap) => {
            snap.forEach(doc => {
                const data = doc.data();
                const docId = data.documentId || data.fileId || doc.id;

                // Skip analytics-only ghost records
                if (!data.documentId && !data.uploadId && data.storageProvider) return;

                if (!uniqueFiles.has(docId)) {
                    uniqueFiles.set(docId, data);
                } else if (data.status === 'completed') {
                    uniqueFiles.set(docId, data);
                }
            });
        };

        collectItems(filesSnap);
        collectItems(documentsOldSnap);

        uniqueFiles.forEach((data) => {
            if (data.isFolder) return;

            const size = data.fileSize || 0;
            totalDocs++;
            totalStorage += size;

            // Type Dist
            const cat = getCategory(data.fileType, data.fileName);
            typeDistribution[cat].count++;
            typeDistribution[cat].bytes += size;

            // Daily Stats for last 7 days
            if (data.uploadedAt || data.createdAt) {
                const dateStr = (data.uploadedAt || data.createdAt).split('T')[0];
                if (!dailyStatsMap[dateStr]) dailyStatsMap[dateStr] = { uploads: 0, storageUsed: 0 };
                dailyStatsMap[dateStr].uploads++;
                dailyStatsMap[dateStr].storageUsed += size;
            }
        });

        // 3. Write Daily Stats
        const batch = db.batch();
        Object.keys(dailyStatsMap).forEach(dateStr => {
            const ref = db.collection('upload_activity_daily').doc(dateStr);
            batch.set(ref, {
                date: dateStr,
                uploads: dailyStatsMap[dateStr].uploads,
                storageUsed: dailyStatsMap[dateStr].storageUsed,
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });
        });
        await batch.commit();

        // 4. Write Global Doc
        await db.collection('analytics').doc('global_stats').set({
            totalUsers,
            totalFiles: totalDocs,
            totalDocuments: totalDocs,
            totalStorageUsed: totalStorage,
            typeDistribution,
            lastUpdated: FieldValue.serverTimestamp(),
            seededAt: new Date().toISOString()
        });

        console.log(`✅ [SEED] Success! Storage: ${totalStorage} bytes across ${totalDocs} files.`);
        return { totalUsers, totalDocs, totalStorage, typeDistribution };
    } catch (error) {
        console.error('❌ [SEED] Failed:', error.message);
        throw error;
    }
}

module.exports = {
    getCategory,
    incrementGlobalStats,
    incrementDailyStats,
    getGlobalStats,
    getDailyStats,
    seedDashboardStats,
    getUnifiedDashboard,
    invalidateUnifiedCache
};
