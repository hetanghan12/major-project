const { getAuth, getFirestore, getStorage } = require('../config/firebase.config');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getGlobalStats, getDailyStats, getUnifiedDashboard } = require('../services/dashboard-stats.service');
require('dotenv').config();

// S3 Client Setup
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;

// In-memory cache for system settings
let cachedSystemSettings = null;
let cachedSettingsTimestamp = 0;
const SETTINGS_CACHE_TTL = 600000; // 10 minutes

// In-memory cache for unified dashboard
let cachedUnifiedDashboard = null;
let cachedUnifiedTimestamp = 0;
const UNIFIED_CACHE_TTL = 30000; // 30 seconds for admin dash

// Helper to log audit events
const logAuditEvent = async (event, userEmail, userId, req, status, details = {}) => {
    try {
        const firestore = getFirestore();
        await firestore.collection('audit_logs').add({
            event,
            user: userEmail,
            userId: userId || null,
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString(),
            status,
            details
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

// --- 1. Dashboard & Analytics --- (OPTIMIZED: Unified Response + Caching)

exports.getUnifiedDashboard = async (req, res) => {
    const now = Date.now();
    if (cachedUnifiedDashboard && (now - cachedUnifiedTimestamp < UNIFIED_CACHE_TTL)) {
        console.log('⚡ [CACHE] Serving unified dashboard from cache');
        return res.status(200).json({ success: true, data: cachedUnifiedDashboard, fromCache: true });
    }

    try {
        const firestore = getFirestore();
        const { getCategory } = require('../services/dashboard-stats.service');
        const dailyStats = await getDailyStats(7);

        // ============================================================
        // 1. COMPUTE REAL STATS from actual documents collection
        // ============================================================
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
            const [filesSnap, documentsSnap] = await Promise.all([
                firestore.collection('files').get(),
                firestore.collection('documents').get()
            ]);

            // DEDUPLICATION: Use a Map keyed by documentId to prevent counting
            // the same file twice across 'files' and 'documents' collections.
            // Also skip ghost/analytics-only records that lack a proper documentId.
            const uniqueFiles = new Map();

            const collectUniqueFiles = (snap) => {
                snap.forEach(doc => {
                    const data = doc.data();
                    const docId = data.documentId || data.fileId || doc.id;

                    // Skip analytics-only ghost records (created by old logFileUpload bug)
                    // These records lack a documentId field and have storageProvider set
                    if (!data.documentId && !data.uploadId && data.storageProvider) {
                        return;
                    }

                    // Use documentId as unique key to avoid double counting
                    // If we've already seen this doc, keep the one with more data (higher status priority)
                    if (!uniqueFiles.has(docId)) {
                        uniqueFiles.set(docId, data);
                    } else {
                        // Keep the record with completed status or more metadata
                        const existing = uniqueFiles.get(docId);
                        if (data.status === 'completed' && existing.status !== 'completed') {
                            uniqueFiles.set(docId, data);
                        }
                    }
                });
            };

            collectUniqueFiles(filesSnap);
            collectUniqueFiles(documentsSnap);

            // Now count from deduplicated records
            uniqueFiles.forEach((data, docId) => {
                const isFolder = data.isFolder || data.fileType === 'folder';

                const size = data.fileSize || data.size || 0;
                const name = data.fileName || data.name || 'Untitled';
                const type = data.fileType || 'unknown';

                if (!isFolder) {
                    totalFiles++;
                    totalStorageBytes += size;

                    const category = getCategory(type, name);
                    if (typeDistribution[category]) {
                        typeDistribution[category].count++;
                        typeDistribution[category].bytes += size;
                    } else {
                        typeDistribution.other.count++;
                        typeDistribution.other.bytes += size;
                    }

                    const uploadDate = (data.uploadedAt || data.createdAt || '').toString().split('T')[0];
                    if (uploadDate === todayStr) {
                        uploadsToday++;
                    }
                }
            });
            
            console.log(`📊 [ADMIN] Real stats (Deduplicated): ${totalFiles} files, ${totalStorageBytes} bytes`);
        } catch (docsErr) {
            console.error('Documents scan failed:', docsErr.message);
        }

        // ============================================================
        // 2. Get Users & Active Users from Firebase Auth
        // ============================================================
        const auth = getAuth();
        let totalUsers = 0;
        let activeUsers24h = 0;
        try {
            const listUsersResult = await auth.listUsers(1000);
            totalUsers = listUsersResult.users.length;
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            listUsersResult.users.forEach(u => {
                if (u.metadata.lastSignInTime && new Date(u.metadata.lastSignInTime).getTime() > oneDayAgo) {
                    activeUsers24h++;
                }
            });
        } catch (e) { console.warn('Auth list failed:', e.message); }

        // ============================================================
        // 3. Recent Audit Logs (limit 10)
        // ============================================================
        let recentActivity = [];
        try {
            const auditSnap = await firestore.collection('audit_logs')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            auditSnap.forEach(doc => {
                const d = doc.data();
                recentActivity.push({ id: doc.id, event: d.event, user: d.user, timestamp: d.timestamp });
            });
        } catch (e) { console.warn('Audit fetch failed:', e.message); }

        // ============================================================
        // 4. Sync back to analytics/global_stats (keep it updated)
        // ============================================================
        let globalData = {};
        try {
            const globalDoc = await firestore.collection('analytics').doc('global_stats').get();
            globalData = globalDoc.exists ? globalDoc.data() : {};

            await firestore.collection('analytics').doc('global_stats').set({
                totalUsers,
                totalFiles,
                totalDocuments: totalFiles,
                totalStorageUsed: totalStorageBytes,
                uploadsToday,
                typeDistribution,
                aiRequestsToday: globalData.aiRequestsToday || 0,
                totalTokens: globalData.totalTokens || 0,
                estimatedCost: globalData.estimatedCost || 0,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                syncedAt: new Date().toISOString()
            });
            console.log('📊 [ADMIN] Synced global_stats from real data');
        } catch (syncErr) {
            console.warn('Global stats sync failed:', syncErr.message);
        }

        const responseData = {
            stats: {
                totalUsers,
                activeUsers24h: activeUsers24h || 1,
                totalFiles,
                totalStorageBytes,
                uploadsToday,
                aiRequestsToday: globalData.aiRequestsToday || 0,
                totalTokens: globalData.totalTokens || 0,
                estimatedCost: globalData.estimatedCost || 0
            },
            storageActivity: dailyStats.map(d => ({ label: d.day, value: (d.storageUsed / (1024 * 1024)).toFixed(2) })),
            typeDistribution,
            recentActivity,
            lastSynced: new Date().toISOString()
        };

        cachedUnifiedDashboard = responseData;
        cachedUnifiedTimestamp = now;

        return res.status(200).json({ success: true, data: responseData });
    } catch (error) {
        console.error('Unified Dashboard Error:', error.message);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    // Legacy support or fallback
    return exports.getUnifiedDashboard(req, res);
};

// OPTIMIZED: reads 7 daily_stats documents instead of scanning entire docs collection
exports.getAnalytics = async (req, res) => {
    try {
        // Max 7 Firestore reads
        const dailyData = await getDailyStats(7);

        const maxBytes = Math.max(...dailyData.map(d => d.storageUsed), 1);
        const chartData = dailyData.map(d => ({
            day: d.day.toUpperCase(),
            bytes: d.storageUsed || 0,
            percentage: maxBytes > 0 ? Math.round(((d.storageUsed || 0) / maxBytes) * 100) : 0
        }));

        return res.status(200).json({
            success: true,
            data: { storageActivity: chartData }
        });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            return res.status(200).json({
                success: true,
                data: {
                    storageActivity: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => ({ day: d, bytes: 0, percentage: 0 })),
                    quotaExceeded: true
                }
            });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
    }
};

// --- 2. User Management ---
exports.getUsers = async (req, res) => {
    try {
        const auth = getAuth();
        const firestore = getFirestore();

        // Fetch all Firebase Auth users
        const listUsersResult = await auth.listUsers(1000);

        // Fetch all Firestore profiles
        const profilesSnapshot = await firestore.collection('users').get();
        const profilesMap = {};
        profilesSnapshot.forEach(doc => { profilesMap[doc.id] = doc.data(); });

        // Fetch all login_locks
        const locksSnapshot = await firestore.collection('login_locks').get();
        const locksMap = {};
        locksSnapshot.forEach(doc => { locksMap[doc.data().email] = doc.data(); });

        let users = listUsersResult.users.map(u => {
            const profile = profilesMap[u.uid] || {};
            const lock = locksMap[u.email] || {};
            return {
                uid: u.uid,
                email: u.email,
                displayName: profile.displayName || u.displayName || null,
                role: profile.role || 'User',
                status: profile.status || (u.disabled ? 'Suspended' : 'Active'),
                createdAt: profile.createdAt || u.metadata.creationTime,
                lastLoginAt: u.metadata.lastSignInTime,
                storageUsed: profile.storageUsed || 0,
                isLocked: !!lock.lockedUntil && new Date(lock.lockedUntil).getTime() > Date.now(),
                lockDetails: lock
            };
        });

        // Filters
        if (req.query.role) {
            users = users.filter(u => u.role === req.query.role);
        }
        if (req.query.status) {
            users = users.filter(u => u.status === req.query.status);
        }

        return res.status(200).json({ success: true, data: users });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn('⚠️  [QUOTA] Exceeded for getUsers. Returning empty array to prevent UI crash.');
            return res.status(200).json({ success: true, data: [], quotaExceeded: true });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, status, displayName } = req.body;
        const auth = getAuth();
        const firestore = getFirestore();

        // Update Auth
        if (status) {
            await auth.updateUser(userId, { disabled: status === 'Suspended' });
        }
        if (displayName) {
            await auth.updateUser(userId, { displayName });
        }

        // Update Firestore
        const updateData = { updatedAt: new Date().toISOString() };
        if (role) updateData.role = role;
        if (status) updateData.status = status;
        if (displayName) updateData.displayName = displayName;

        await firestore.collection('users').doc(userId).set(updateData, { merge: true });

        await logAuditEvent('USER_UPDATE', req.user.email, req.user.uid, req, 'Success', { updatedUser: userId, updates: updateData });

        return res.status(200).json({ success: true, message: 'User updated successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const auth = getAuth();
        const firestore = getFirestore();

        await auth.deleteUser(userId);
        await firestore.collection('users').doc(userId).delete();

        await logAuditEvent('USER_DELETE', req.user.email, req.user.uid, req, 'Success', { deletedUser: userId });

        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
};

exports.unlockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const auth = getAuth();
        const firestore = getFirestore();

        const userRecord = await auth.getUser(userId);

        // Delete from login_locks
        const locksRef = firestore.collection('login_locks');
        const querySnapshot = await locksRef.where('email', '==', userRecord.email).get();

        const batch = firestore.batch();
        querySnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        await logAuditEvent('USER_UNLOCK', req.user.email, req.user.uid, req, 'Success', { unlockedUser: userId });

        return res.status(200).json({ success: true, message: 'User unlocked successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to unlock user', error: error.message });
    }
};

// --- 3. Configuration & Auditing ---
// OPTIMIZED: limit(25) per collection instead of full collection scan
exports.getAuditLogs = async (req, res) => {
    try {
        const firestore = getFirestore();

        // Fetch only recent 25 from each (50 reads max instead of thousands)
        const [auditSnap, securitySnap] = await Promise.all([
            firestore.collection('audit_logs').orderBy('timestamp', 'desc').limit(25).get(),
            firestore.collection('security_logs').orderBy('timestamp', 'desc').limit(25).get()
        ]);

        let logs = [];

        auditSnap.forEach(doc => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                event: data.event || 'Unknown',
                user: data.user || 'System',
                timestamp: data.timestamp,
                status: data.status || 'Success'
            });
        });

        securitySnap.forEach(doc => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                event: data.eventType || 'SECURITY_EVENT',
                user: data.email || 'System',
                timestamp: data.timestamp,
                status: data.status || 'SUCCESS'
            });
        });

        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        logs = logs.slice(0, 50);

        return res.status(200).json({ success: true, data: logs });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            return res.status(200).json({ success: true, data: [], quotaExceeded: true });
        }
        console.error('Audit Log Fetch Error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch audit logs', error: error.message });
    }
};

const settingsService = require('../services/settings.service');

exports.getSettings = async (req, res) => {
    try {
        const settings = await settingsService.getSettings();
        return res.status(200).json({ success: true, data: settings });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = req.body;
        const updated = await settingsService.updateSettings(settings);

        await logAuditEvent('SETTINGS_UPDATE', req.user.email, req.user.uid, req, 'Success', updated);

        return res.status(200).json({ success: true, message: 'Settings updated' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
    }
};

// --- 4. Subscriptions & AI Usage ---
const DEFAULT_PLANS = [
    { id: 'starter', name: "Starter", description: "Basic features", price: 0, features: ["5GB Storage"], limits: { storage: 5 * 1024 * 1024 * 1024 }, isPopular: false },
    { id: 'pro', name: "Professional", description: "For power users", price: 19, features: ["100GB Storage"], limits: { storage: 100 * 1024 * 1024 * 1024 }, isPopular: true },
    { id: 'enterprise', name: "Enterprise", description: "For teams", price: 99, features: ["Unlimited Storage"], limits: { storage: -1 }, isPopular: false }
];

exports.getSubscriptions = async (req, res) => {
    try {
        const firestore = getFirestore();
        const snapshot = await firestore.collection('subscription_plans').get();

        if (snapshot.empty) {
            return res.status(200).json({ success: true, data: DEFAULT_PLANS });
        }

        const plans = [];
        snapshot.forEach(doc => { plans.push({ id: doc.id, ...doc.data() }); });
        return res.status(200).json({ success: true, data: plans });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn('⚠️  [QUOTA] Exceeded for getSubscriptions. Returning default plans.');
            return res.status(200).json({ success: true, data: DEFAULT_PLANS, quotaExceeded: true });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch subscriptions', error: error.message });
    }
};

exports.updateSubscription = async (req, res) => {
    try {
        const { planId } = req.params;
        const firestore = getFirestore();

        const data = { ...req.body, updatedAt: new Date().toISOString() };
        await firestore.collection('subscription_plans').doc(planId).set(data, { merge: true });

        return res.status(200).json({ success: true, message: 'Subscription updated' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update subscription', error: error.message });
    }
};

// OPTIMIZED: limit(100) instead of scanning entire ai_usage collection
exports.getAiUsageMetrics = async (req, res) => {
    try {
        const firestore = getFirestore();
        // Only read last 100 AI usage entries (not all)
        const usageSnapshot = await firestore.collection('ai_usage')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();

        let totalChatTokens = 0;
        let totalEmbedTokens = 0;
        let totalCost = 0;
        let totalCalls = 0;
        const modelsStats = {};

        usageSnapshot.forEach(doc => {
            const data = doc.data();
            totalCost += (data.cost || 0);
            totalCalls++;

            const tokens = data.usage?.total_tokens || 0;
            const modelName = data.model || (data.type === 'CHAT' ? 'gpt-3.5-turbo' : 'text-embedding-3-small');

            if (!modelsStats[modelName]) {
                modelsStats[modelName] = { calls: 0, tokens: 0, cost: 0 };
            }
            modelsStats[modelName].calls++;
            modelsStats[modelName].tokens += tokens;
            modelsStats[modelName].cost += (data.cost || 0);

            if (data.type === 'CHAT') totalChatTokens += tokens;
            else if (data.type === 'EMBEDDING' || data.type === 'DOCUMENT_PROCESSING') totalEmbedTokens += tokens;
        });

        const activeModels = Object.keys(modelsStats).map(modelKey => ({
            name: modelKey, calls: modelsStats[modelKey].calls,
            tokens: modelsStats[modelKey].tokens, estimatedCost: modelsStats[modelKey].cost,
            status: 'HEALTHY'
        }));

        return res.status(200).json({
            success: true,
            data: {
                totalCalls, totalChatTokens, totalEmbedTokens,
                totalTokens: totalChatTokens + totalEmbedTokens,
                totalCostUSD: totalCost.toFixed(4), activeModels
            }
        });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            return res.status(200).json({ success: true, data: { totalCalls: 0, totalTokens: 0, totalCostUSD: "0.00", activeModels: [] }, quotaExceeded: true });
        }
        return res.status(500).json({ success: false, message: 'Failed to fetch AI metrics', error: error.message });
    }
};
// --- 5. Admin Notifications ---
exports.getNotifications = async (req, res) => {
    try {
        const { getAdminNotifications } = require('../services/notification.service');
        const notifications = await getAdminNotifications(20);
        return res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch admin notifications', error: error.message });
    }
};

exports.markNotificationsRead = async (req, res) => {
    try {
        const { markAllAdminRead } = require('../services/notification.service');
        await markAllAdminRead();
        return res.status(200).json({ success: true, message: 'All admin notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to mark notifications as read', error: error.message });
    }
};
