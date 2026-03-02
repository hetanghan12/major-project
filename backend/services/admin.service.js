/**
 * Admin Service
 * =============
 * Handles data aggregation and administrative operations.
 * 
 * @author College Project
 */

const { getFirestore } = require('../config/firebase.config');

// Collection names
const USERS_COLLECTION = 'users';
const DOCUMENTS_COLLECTION = 'documents';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const SETTINGS_COLLECTION = 'system_settings';

/**
 * Get dashboard overview statistics
 */
async function getDashboardStats() {
    try {
        const db = getFirestore();
        const { getAuth } = require('../config/firebase.config');

        // 1. Total Users — use Firebase Auth as source of truth
        // This includes ALL users even if they haven't synced to Firestore yet
        let totalUsers = 0;
        try {
            const authList = await getAuth().listUsers(1000);
            totalUsers = authList.users.length;

            // Auto-sync any Firebase Auth users missing from Firestore
            const { createOrUpdateUser } = require('./firestore.service');
            for (const authUser of authList.users) {
                const firestoreDoc = await db.collection(USERS_COLLECTION).doc(authUser.uid).get();
                if (!firestoreDoc.exists) {
                    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';
                    await createOrUpdateUser(authUser.uid, {
                        email: authUser.email,
                        displayName: authUser.displayName || authUser.email?.split('@')[0],
                        photoURL: authUser.photoURL || null,
                        role: authUser.email === adminEmail ? 'Admin' : 'User'
                    });
                    console.log(`✅ Auto-synced missing user: ${authUser.email}`);
                }
            }
        } catch (authErr) {
            // Fallback to Firestore collection count if Auth SDK fails
            console.warn('⚠️ Auth.listUsers failed, falling back to Firestore count:', authErr.message);
            const userSnapshot = await db.collection(USERS_COLLECTION).count().get();
            totalUsers = userSnapshot.data().count;
        }
        console.log(`📊 Admin Stats: Found ${totalUsers} total users`);

        // 2. Total Storage & Documents
        const documentSnapshot = await db.collection(DOCUMENTS_COLLECTION).get();
        console.log(`📊 Admin Stats: Found ${documentSnapshot.size} total documents`);

        let totalStorageUsed = 0;
        let documentCount = 0;
        let publicLinksCount = 0;

        const storageBreakdown = {
            documents: { size: 0, count: 0 },
            images: { size: 0, count: 0 },
            videos: { size: 0, count: 0 },
            audio: { size: 0, count: 0 },
            other: { size: 0, count: 0 }
        };

        const recentFiles = [];
        const now = new Date();
        const growthData = new Array(7).fill(0);

        const docsList = [];
        documentSnapshot.forEach(doc => {
            docsList.push({ id: doc.id, ...doc.data() });
        });

        // Sort by uploadedAt descending in-memory (safest for dev)
        docsList.sort((a, b) => {
            const dateA = new Date(a.uploadedAt || 0);
            const dateB = new Date(b.uploadedAt || 0);
            return dateB - dateA;
        });

        const uniqueFiles = new Set();
        docsList.forEach(data => {
            // Skip failed uploads if they shouldn't count
            if (data.status === 'failed') return;

            const fileSize = data.fileSize || 0;
            const fileKey = `${data.userId}_${data.fileName}_${fileSize}`;
            
            // For the total storage, we count everything (since it might take S3 space)
            totalStorageUsed += fileSize;

            // For the document count, we only count UNIQUE files to match user expectations
            if (!uniqueFiles.has(fileKey)) {
                uniqueFiles.add(fileKey);
                documentCount++;
            }
            
            if (data.isPublic) publicLinksCount++;

            // Recent files (last 10)
            if (recentFiles.length < 10) {
                recentFiles.push({
                    id: data.id,
                    fileName: data.fileName,
                    fileType: data.fileType,
                    fileSize: data.fileSize,
                    userEmail: data.userEmail || data.userId || 'Unknown',
                    uploadedAt: data.uploadedAt
                });
            }

            // Breakdown by type
            const type = (data.fileType || '').toLowerCase();
            let cat = 'other';
            if (type.includes('image')) cat = 'images';
            else if (type.includes('video')) cat = 'videos';
            else if (type.includes('audio')) cat = 'audio';
            else if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('officedocument')) cat = 'documents';

            storageBreakdown[cat].size += fileSize;
            
            // Increment count only if it's the first time we see this unique file
            // We use a separate set for category uniqueness to be safe
            const catKey = `${cat}_${fileKey}`;
            if (!uniqueFiles.has(catKey)) {
                uniqueFiles.add(catKey);
                storageBreakdown[cat].count++;
            }

            // Growth calculation
            if (data.uploadedAt) {
                const uploadedDate = new Date(data.uploadedAt);
                const diffDays = Math.floor((now - uploadedDate) / (1000 * 60 * 60 * 24));
                if (diffDays < 7) {
                    growthData[6 - diffDays] += fileSize;
                }
            }
        });

        // 3. Recent Activity & Active Requests (Last 24h)
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
        const logsSnapshot = await db.collection(AUDIT_LOGS_COLLECTION).limit(100).get();
        
        const allLogs = [];
        logsSnapshot.forEach(doc => {
            allLogs.push({ id: doc.id, ...doc.data() });
        });

        allLogs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

        const recentActivity = [];
        allLogs.forEach(data => {
            if (recentActivity.length < 15) {
                recentActivity.push(data);
            }
        });

        // 4. Active Users (24h) — count users whose lastSignInTime is within 24h
        //    Uses Firebase Auth metadata so it's always accurate after any login
        let activeRequestsCount = 0;
        let newUsersToday = 0;
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        try {
            // authList was already fetched above; reuse it
            const authListForActive = await getAuth().listUsers(1000);
            authListForActive.users.forEach(u => {
                const lastSignIn = u.metadata?.lastSignInTime;
                if (lastSignIn && new Date(lastSignIn) >= new Date(oneDayAgo)) {
                    activeRequestsCount++;
                }
                const createdAt = u.metadata?.creationTime;
                if (createdAt && new Date(createdAt) >= startOfToday) {
                    newUsersToday++;
                }
            });
        } catch (authErr) {
            // Fallback: count audit log entries
            allLogs.forEach(data => {
                if (data.timestamp > oneDayAgo) activeRequestsCount++;
            });
        }

        const userTrend = newUsersToday > 0 ? `+${newUsersToday}` : '+0';
        console.log(`📊 Active users (24h via Firebase Auth): ${activeRequestsCount}, New today: ${newUsersToday}`);

        const limit = 10 * 1024 * 1024 * 1024; // 10GB
        const storagePercent = Math.min(Math.round((totalStorageUsed / limit) * 100), 100);

        const stats = {
            totalUsers,
            totalStorageUsed,
            documentCount,
            publicLinksCount,
            activeRequests: activeRequestsCount,
            storagePercent,
            growth: growthData,
            storageBreakdown,
            recentActivity,
            recentFiles,
            systemCapacity: limit,
            userTrend
        };

        console.log(`✅ Admin Stats generated: ${documentCount} files, ${totalStorageUsed} bytes`);
        return stats;
    } catch (error) {
        console.error('❌ Error in getDashboardStats:', error);
        return {
            totalUsers: 0,
            totalStorageUsed: 0,
            documentCount: 0,
            publicLinksCount: 0,
            activeRequests: 0,
            storagePercent: 0,
            growth: [0, 0, 0, 0, 0, 0, 0],
            storageBreakdown: { documents: { size: 0, count: 0 }, images: { size: 0, count: 0 }, videos: { size: 0, count: 0 }, audio: { size: 0, count: 0 }, other: { size: 0, count: 0 } },
            recentActivity: [],
            recentFiles: [],
            systemCapacity: 10 * 1024 * 1024 * 1024,
            userTrend: '+0',
            error: error.message
        };
    }
}

/**
 * Get detailed analytics statistics
 */
async function getAnalyticsStats() {
    try {
        const db = getFirestore();
        const now = new Date();

        // 1. User Growth (Last 7 Days)
        const userSnapshot = await db.collection(USERS_COLLECTION).get();
        const userGrowth = new Array(7).fill(0);
        const totalUsers = userSnapshot.size;

        userSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt) {
                const createdDate = new Date(data.createdAt);
                const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays < 7) {
                    userGrowth[6 - diffDays]++;
                }
            }
        });

        // 2. File Activity (Last 7 Days)
        const documentSnapshot = await db.collection(DOCUMENTS_COLLECTION).get();
        const fileActivity = new Array(7).fill(0);
        const totalFiles = documentSnapshot.size;
        let totalStorage = 0;

        const typeDistribution = {
            images: 0,
            videos: 0,
            documents: 0,
            audio: 0,
            other: 0
        };

        documentSnapshot.forEach(doc => {
            const data = doc.data();
            totalStorage += (data.fileSize || 0);

            if (data.uploadedAt) {
                const uploadedDate = new Date(data.uploadedAt);
                const diffDays = Math.floor((now - uploadedDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays < 7) {
                    fileActivity[6 - diffDays]++;
                }
            }

            // Type distribution
            const type = (data.fileType || '').toLowerCase();
            if (type.includes('image')) typeDistribution.images++;
            else if (type.includes('video')) typeDistribution.videos++;
            else if (type.includes('audio')) typeDistribution.audio++;
            else if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('officedocument')) typeDistribution.documents++;
            else typeDistribution.other++;
        });

        // 3. Activity from Audit Logs
        const logsSnapshot = await db.collection(AUDIT_LOGS_COLLECTION).get();
        const activeUsersCount = new Set();
        const eventsByDay = new Array(7).fill(0);

        logsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.timestamp) {
                const logDate = new Date(data.timestamp);
                const diffDays = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) { // Last 24h active users
                    if (data.userId) activeUsersCount.add(data.userId);
                }

                if (diffDays >= 0 && diffDays < 7) {
                    eventsByDay[6 - diffDays]++;
                }
            }
        });

        return {
            totalUsers,
            totalFiles,
            totalStorage,
            userGrowth,
            fileActivity,
            typeDistribution,
            dau: activeUsersCount.size,
            weeklyEvents: eventsByDay,
            lastUpdate: now.toISOString()
        };
    } catch (error) {
        console.error('❌ Error in getAnalyticsStats:', error);
        return {
            totalUsers: 0,
            totalFiles: 0,
            totalStorage: 0,
            userGrowth: [0, 0, 0, 0, 0, 0, 0],
            fileActivity: [0, 0, 0, 0, 0, 0, 0],
            dau: 0
        };
    }
}

/**
 * Get all users with filtering and pagination
 */
async function getAllUsers(options = {}) {
    const db = getFirestore();
    const { getAuth } = require('../config/firebase.config');

    // Step 1: Get all Firebase Auth users (source of truth)
    let authUsers = [];
    try {
        const authList = await getAuth().listUsers(1000);
        authUsers = authList.users;
    } catch (e) {
        console.warn('⚠️ Could not list Firebase Auth users:', e.message);
    }

    // Step 2: Get all Firestore user profiles
    let query = db.collection(USERS_COLLECTION);
    if (options.role)   query = query.where('role', '==', options.role);
    if (options.status) query = query.where('status', '==', options.status);
    const snapshot = await query.get();

    // Build a map of uid -> Firestore data
    const firestoreMap = {};
    snapshot.forEach(doc => {
        firestoreMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // Step 3: Get lockout info
    const locksSnapshot = await db.collection('login_locks').get();
    const locksMap = {};
    locksSnapshot.forEach(doc => {
        locksMap[doc.id] = doc.data();
    });

    // Step 4: Merge — every Firebase Auth user appears, with Firestore data overlaid
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';
    const users = authUsers.map(authUser => {
        const fsData = firestoreMap[authUser.uid] || {};
        const email = authUser.email || fsData.email || '';
        const lockInfo = locksMap[email];

        let isLocked = false;
        if (lockInfo?.lockedUntil && new Date(lockInfo.lockedUntil) > new Date()) {
            isLocked = true;
        }

        return {
            id: authUser.uid,
            email,
            displayName: fsData.displayName || authUser.displayName || email.split('@')[0],
            photoURL: fsData.photoURL || authUser.photoURL || null,
            role: fsData.role || (email === adminEmail ? 'Admin' : 'User'),
            status: fsData.status || 'Active',
            createdAt: fsData.createdAt || authUser.metadata?.creationTime || null,
            lastLogin: fsData.lastLogin || authUser.metadata?.lastSignInTime || null,
            storageUsed: fsData.storageUsed || 0,
            lockout: lockInfo ? { isLocked, failures: lockInfo.failures || 0, lockedUntil: lockInfo.lockedUntil || null } : null
        };
    });

    return users;
}

/**
 * Log an administrative action
 */
async function logAuditAction(actionData) {
    const db = getFirestore();
    try {
        const log = {
            event: actionData.event,
            user: actionData.user || 'System',
            userId: actionData.userId || null,
            ipAddress: actionData.ipAddress || 'unknown',
            timestamp: new Date().toISOString(),
            status: actionData.status || 'Success',
            details: actionData.details || {}
        };

        await db.collection(AUDIT_LOGS_COLLECTION).add(log);
        console.log(`📝 Audit Log: ${log.event} by ${log.user}`);
    } catch (error) {
        console.error('❌ Failed to save audit log:', error.message);
    }
}

/**
 * Get audit logs with pagination
 */
async function getAuditLogs(limit = 50, offset = 0) {
    const db = getFirestore();
    // No orderBy — avoids requiring a Firestore composite index
    // Fetch and sort in-memory instead
    const snapshot = await db.collection(AUDIT_LOGS_COLLECTION)
        .limit(200)
        .get();

    const logs = [];
    snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() });
    });

    // Sort by timestamp descending in memory
    logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return logs.slice(offset, offset + limit);
}

/**
 * Update system settings
 */
async function updateSettings(settings) {
    const db = getFirestore();
    const settingsRef = db.collection(SETTINGS_COLLECTION).doc('global');
    await settingsRef.set({
        ...settings,
        updatedAt: new Date().toISOString()
    }, { merge: true });
    return settings;
}

/**
 * Get system settings
 */
async function getSettings() {
    const db = getFirestore();
    const doc = await db.collection(SETTINGS_COLLECTION).doc('global').get();
    const defaults = {
        systemName: 'Cloud Space',
        adminEmail: 'admin@cloudspace.com',
        maxFileSizeMB: 500,
        registrationOpen: true,
        maintenanceMode: false,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        require2FA: false,
        emailOnNewUser: true,
        emailOnFileUpload: false,
        emailOnError: true,
        weeklyReport: true
    };
    if (!doc.exists) return defaults;
    // Merge saved settings on top of defaults so nothing is missing
    return { ...defaults, ...doc.data() };
}

/**
 * Get subscription plans
 */
async function getSubscriptionPlans() {
    const db = getFirestore();
    const snapshot = await db.collection('subscription_plans').get();
    
    if (snapshot.empty) {
        // Return default plans if none exist in DB
        return [
            {
                id: 'starter',
                name: 'Starter',
                description: 'For individual users',
                price: 0,
                features: ['5 GB Storage', 'Basic AI Assistant'],
                limits: { storage: 5 * 1024 * 1024 * 1024 },
                isPopular: false
            },
            {
                id: 'pro',
                name: 'Professional',
                description: 'For power users',
                price: 19,
                features: ['100 GB Storage', 'Advanced AI Assistant', 'Unlimited Sharing'],
                limits: { storage: 100 * 1024 * 1024 * 1024 },
                isPopular: true
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                description: 'For organizations',
                price: 99,
                features: ['Unlimited Storage', 'Team Collaboration', 'Dedicated Support'],
                limits: { storage: -1 }, // Unlimited
                isPopular: false
            }
        ];
    }

    const plans = [];
    snapshot.forEach(doc => {
        plans.push({ id: doc.id, ...doc.data() });
    });
    return plans;
}

/**
 * Get AI usage metrics
 */
async function getAIUsageMetrics() {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('ai_usage').get();
        
        if (snapshot.empty) {
            return {
                breakdown: [],
                models: [],
                trend: [],
                stats: { totalCalls: 0, totalTokens: 0, totalCost: 0 }
            };
        }

        const modelStats = {};
        const typeStats = {};
        const dailyTrends = new Array(7).fill(0);
        const now = new Date();

        let totalCalls = 0;
        let totalTokens = 0;
        let totalCost = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const model = data.model || 'unknown';
            const type = data.type || 'unknown';
            const tokens = data.usage?.total_tokens || 0;
            const cost = data.cost || 0;
            // Safe timestamp conversion (handles both Firestore Timestamps and ISO strings)
            let timestamp;
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                timestamp = data.createdAt.toDate();
            } else if (data.createdAt) {
                timestamp = new Date(data.createdAt);
            } else if (data.timestamp) {
                timestamp = new Date(data.timestamp);
            } else {
                timestamp = new Date();
            }

            // Model aggregation
            if (!modelStats[model]) {
                modelStats[model] = { name: model, calls: 0, tokens: 0, cost: 0, status: 'HEALTHY', color: 'indigo' };
            }
            modelStats[model].calls++;
            modelStats[model].tokens += tokens;
            modelStats[model].cost += cost;

            // Type/Category aggregation
            if (!typeStats[type]) {
                typeStats[type] = { category: type, value: 0, status: 'Active', color: 'indigo' };
            }
            typeStats[type].value++;

            // Stats
            totalCalls++;
            totalTokens += tokens;
            totalCost += cost;

            // Daily trend (last 7 days)
            const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < 7) {
                dailyTrends[6 - diffDays]++;
            }
        });

        // Format for frontend
        const breakdown = Object.values(typeStats).map(s => ({
            ...s,
            value: Math.round((s.value / totalCalls) * 100)
        }));

        const models = Object.values(modelStats).map(m => ({
            ...m,
            tokens: m.tokens > 1000000 ? (m.tokens / 1000000).toFixed(1) + 'M' : (m.tokens / 1000).toFixed(1) + 'K',
            cost: Number(m.cost.toFixed(2))
        }));

        return {
            breakdown,
            models,
            trend: dailyTrends,
            stats: { 
                totalCalls, 
                totalTokens: totalTokens > 1000000 ? (totalTokens / 1000000).toFixed(1) + 'M' : (totalTokens / 1000).toFixed(1) + 'K',
                totalCost: Number(totalCost.toFixed(2))
            }
        };
    } catch (error) {
        console.error('❌ Error in getAIUsageMetrics:', error);
        return { 
            breakdown: [], 
            models: [], 
            trend: [], 
            stats: { totalCalls: 0, totalTokens: 0, totalCost: 0 },
            error: error.message 
        };
    }
}

/**
 * Increment failed login attempts for an email/IP
 */
async function incrementLoginFailures(email, ip) {
    const db = getFirestore();
    const settings = await getSettings();
    const maxAttempts = settings.maxLoginAttempts || 5;

    const lockRef = db.collection('login_locks').doc(email);
    const doc = await lockRef.get();
    
    let failures = 1;
    if (doc.exists) {
        failures = (doc.data().failures || 0) + 1;
    }

    const payload = {
        email,
        failures,
        lastFailure: new Date().toISOString(),
        ip: ip || 'unknown'
    };

    if (failures >= maxAttempts) {
        payload.lockedUntil = new Date(Date.now() + (settings.sessionTimeout || 60) * 60 * 1000).toISOString();
        console.log(`🔒 Account LOCKED: ${email} (reached ${failures} attempts)`);
    }

    await lockRef.set(payload, { merge: true });
    return payload;
}

/**
 * Reset login failures for an email
 */
async function resetLoginFailures(email) {
    const db = getFirestore();
    await db.collection('login_locks').doc(email).delete();
    console.log(`🔓 Login failures reset for: ${email}`);
}

/**
 * Check if a user is currently locked out
 */
async function getLockoutStatus(email) {
    const db = getFirestore();
    const doc = await db.collection('login_locks').doc(email).get();
    
    if (!doc.exists) return { locked: false, attempts: 0 };
    
    const data = doc.data();
    if (data.lockedUntil) {
        if (new Date(data.lockedUntil) > new Date()) {
            return { 
                locked: true, 
                lockedUntil: data.lockedUntil,
                attempts: data.failures
            };
        } else {
            // Lock expired
            await resetLoginFailures(email);
            return { locked: false, attempts: 0 };
        }
    }
    
    return { locked: false, attempts: data.failures };
}

module.exports = {
    getDashboardStats,
    getAllUsers,
    logAuditAction,
    getAuditLogs,
    updateSettings,
    getSettings,
    getSubscriptionPlans,
    getAIUsageMetrics,
    getAnalyticsStats,
    incrementLoginFailures,
    resetLoginFailures,
    getLockoutStatus
};
