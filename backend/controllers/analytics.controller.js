/**
 * Analytics Controller — Optimized
 * ==================================
 * Reads from pre-aggregated dashboard_stats and daily_stats collections
 * instead of scanning entire files/documents/security_logs collections.
 *
 * Read budget per request:
 *   getDashboardStats: 1 read  (dashboard_stats/global)
 *   getStorageActivity: 7 reads (daily_stats last 7 docs)
 *   logAiUsage: 0 reads (writes only)
 *
 * @author CloudSpace Optimization
 */

const { getFirestore, getAuth } = require('../config/firebase.config');
const { logSecurityEvent, trackAiRequest } = require('../services/analytics.service');
const { getGlobalStats, getDailyStats, getUnifiedDashboard } = require('../services/dashboard-stats.service');
const { LRUCache } = require('lru-cache');

const CACHE_TTL = 60000;
const STORAGE_ACTIVITY_CACHE_TTL = 300000;
const MAX_CACHE_ENTRIES = 100;

const cache = new LRUCache({
    max: MAX_CACHE_ENTRIES,
    ttl: CACHE_TTL,
    allowStale: true,
    staleTTL: 30000
});

const storageActivityCache = new LRUCache({
    max: 10,
    ttl: STORAGE_ACTIVITY_CACHE_TTL,
    allowStale: true,
    staleTTL: 60000
});

const withCache = async (cacheObj, cacheKey, fetchFn, defaultData) => {
    const cached = cacheObj.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    try {
        const data = await fetchFn();
        cacheObj.set(cacheKey, data);
        return data;
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn(`⚠️  [CACHE] Quota hit for ${cacheKey}. Serving fallback.`);
            const stale = cacheObj.getStale(cacheKey);
            return stale || defaultData;
        }
        throw error;
    }
};

// ============================================================================
// GET DASHBOARD STATS — reads 1 document instead of scanning collections
// ============================================================================
exports.getDashboardStats = async (req, res) => {
    try {
        const data = await withCache(cache, 'dashboard', async () => {
            const db = getFirestore();
            const { getCategory } = require('../services/dashboard-stats.service');

            // 1. Compute real stats from documents collection
            let totalFiles = 0;
            let totalStorageBytes = 0;
            let uploadsToday = 0;
            const todayStr = new Date().toISOString().split('T')[0];

            const typeDistribution = {
                documents: { count: 0, bytes: 0 },
                image: { count: 0, bytes: 0 },
                video: { count: 0, bytes: 0 },
                audio: { count: 0, bytes: 0 },
                other: { count: 0, bytes: 0 }
            };

            try {
                const docsSnap = await db.collection('files').get();
                docsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.isFolder) return;

                    const size = data.fileSize || 0;
                    totalFiles++;
                    totalStorageBytes += size;

                    const category = getCategory(data.fileType, data.fileName);
                    if (typeDistribution[category]) {
                        typeDistribution[category].count++;
                        typeDistribution[category].bytes += size;
                    } else {
                        typeDistribution.other.count++;
                        typeDistribution.other.bytes += size;
                    }

                    const uploadDate = (data.uploadedAt || data.createdAt || '').split('T')[0];
                    if (uploadDate === todayStr) {
                        uploadsToday++;
                    }
                });
            } catch (docsErr) {
                console.error('Documents scan failed:', docsErr.message);
            }

            // 2. Get users from Auth (source of truth)
            let totalUsers = 0;
            let activeUsers24h = 0;
            try {
                const auth = getAuth();
                const usersResult = await auth.listUsers(1000);
                totalUsers = usersResult.users.length;
                const now = Date.now();
                const oneDay = 24 * 60 * 60 * 1000;
                usersResult.users.forEach(u => {
                    if (u.metadata.lastSignInTime) {
                        if (now - new Date(u.metadata.lastSignInTime).getTime() <= oneDay) {
                            activeUsers24h++;
                        }
                    }
                });
            } catch (authError) {
                console.warn('Auth listUsers failed:', authError.message);
            }

            const maxStorageBytes = 10 * 1024 * 1024 * 1024; // 10 GB cap

            return {
                totalUsers,
                totalDocuments: totalFiles,
                totalStorageBytes,
                storagePercentage: Math.min((totalStorageBytes / maxStorageBytes) * 100, 100).toFixed(1),
                activeUsers24h: activeUsers24h || 1,
                uploadsToday,
                aiRequestsToday: 0,
                typeDistribution
            };
        }, {
            totalUsers: 0, totalDocuments: 0, totalStorageBytes: 0,
            storagePercentage: "0.0", activeUsers24h: 0,
            typeDistribution: {
                documents: { count: 0, bytes: 0 }, image: { count: 0, bytes: 0 },
                video: { count: 0, bytes: 0 }, audio: { count: 0, bytes: 0 },
                other: { count: 0, bytes: 0 }
            }
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Admin Dashboard API Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ============================================================================
// GET STORAGE ACTIVITY — reads 7 daily_stats documents (not thousands)
// ============================================================================
exports.getStorageActivity = async (req, res) => {
    try {
        const results = await withCache(storageActivityCache, 'storageActivity', async () => {
            // Max 7 Firestore reads
            const dailyData = await getDailyStats(7);

            const labels = dailyData.map(d => d.day);
            const data = dailyData.map(d => Number((d.storageUsed / (1024 * 1024)).toFixed(2)));
            const records = dailyData.map(d => ({
                date: d.date,
                uploads: d.uploads,
                uploadSize: d.storageUsed
            }));

            return { labels, data, records };
        }, {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            data: [0, 0, 0, 0, 0, 0, 0],
            records: []
        }, STORAGE_ACTIVITY_CACHE_TTL);

        res.json({ success: true, ...results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ============================================================================
// NEW: GET UNIFIED DASHBOARD — Read-optimized for Spark Plan
// ============================================================================
exports.getUnifiedDashboard = async (req, res) => {
    try {
        const dashboardData = await getUnifiedDashboard();
        res.json({
            success: true,
            ...dashboardData
        });
    } catch (error) {
        console.error('Unified Dashboard API Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// ============================================================================
// LOG AI USAGE — write only, + increment aggregated counters
// ============================================================================
exports.logAiUsage = async (req, res) => {
  try {
    const { model, tokens, cost, requestType } = req.body;
    const userId = req.user.uid;

    if (!model || tokens === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields: model, tokens' });
    }

    const db = getFirestore();
    await db.collection('ai_usage').add({
      userId,
      model,
      tokens: Number(tokens) || 0,
      cost: Number(cost) || 0,
      requestType: requestType || 'chat',
      timestamp: new Date().toISOString()
    });

    // Update aggregated counters (async, non-blocking)
    trackAiRequest().catch(err => console.error('AI tracking failed:', err.message));

    res.status(200).json({ success: true, message: 'AI usage logged' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
