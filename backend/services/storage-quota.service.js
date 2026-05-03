/**
 * STORAGE SERVICE - Cloud-Truth Based
 * =====================================
 * Production-grade storage tracking for CloudAI Smart Storage.
 * 
 * ============================================================================
 * DESIGN PRINCIPLE: SINGLE SOURCE OF TRUTH
 * ============================================================================
 * 
 * Storage used = SUM(fileSize) of all documents with status='ready'
 * 
 * This is calculated from the database - NOT cached, NOT estimated.
 * Like Google Drive, Dropbox, OneDrive.
 * 
 * ============================================================================
 * DATA MODEL
 * ============================================================================
 * 
 * User storage info:
 * {
 *   "user_id": "firebase_uid",
 *   "storage_limit_bytes": 5368709120,  // 5 GB default
 *   "storage_used_bytes": 1293942784    // Calculated from ready files
 * }
 * 
 * @author CloudAI Storage System
 * @version 1.0.0
 */

const { getFirestore } = require('../config/firebase.config');
const { getCategory } = require('./dashboard-stats.service');

// Collection names
const USERS_COLLECTION = 'users';
const DOCUMENTS_COLLECTION = 'files';

const { PLANS } = require('../config/plans');

/**
 * Normalizes any plan string (ID, Name, or Key) to our standard 'free', 'professional', or 'pro' keys.
 * Handles cases where Firestore returns raw Document IDs instead of type names.
 */
function normalizePlanName(rawPlan) {
    if (!rawPlan) return 'free';
    const p = String(rawPlan).toLowerCase();

    // Direct matches
    if (PLANS[p]) return p;

    // Fuzzy matching for plan names or IDs that contain keywords
    if (p.includes('pro') && !p.includes('professional')) return 'pro';
    if (p.includes('professional')) return 'professional';
    if (p.includes('premium')) return 'pro';

    return 'free';
}

/**
 * Determines the true plan tier for a user by checking profile data 
 * and falling back to the active subscriptions collection if necessary.
 */
async function getEffectivePlan(userId, userData) {
    const db = getFirestore();
    let rawPlan = userData.plan || userData.planName || userData.currentPlan || 'free';
    let planName = normalizePlanName(rawPlan);

    // Deep Recovery: If unresolved or free, check subscriptions collection
    if (planName === 'free' || !PLANS[planName]) {
        try {
            const subSnap = await db.collection('subscriptions')
                .where('userId', '==', userId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (!subSnap.empty) {
                const subData = subSnap.docs[0].data();
                planName = normalizePlanName(subData.planName || subData.planId || 'free');
            }
        } catch (e) {
            console.warn(`[PlanRecovery] Failed for ${userId}:`, e.message);
        }
    }

    return PLANS[planName] ? planName : 'free';
}

/**
 * Get user's storage statistics
 * Calculates REAL storage from database - not cached/fake values
 * 
 * @param {string} userId - User ID from verified Firebase token
 * @returns {Object} Storage stats
 */
async function getUserStorageStats(userId) {
    const db = getFirestore();
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        const data = userDoc.exists ? userDoc.data() : {};

        const planName = await getEffectivePlan(userId, data);
        const planConfig = PLANS[planName] || PLANS.free;

        console.log(`📊 [Storage] User ${userId} detected as: ${planName} | Limit: ${planConfig.storageLimitGB}GB`);

        // 1 GB = 1024 * 1024 * 1024 bytes
        let storageLimit = planConfig.storageLimitGB * 1024 * 1024 * 1024;

        // Support both legacy and new field names
        let storageUsed = data.totalStorageUsedBytes !== undefined ? data.totalStorageUsedBytes : (data.storageUsed || 0);
        let fileCount = data.totalFilesCount !== undefined ? data.totalFilesCount : 0;
        let typeDistribution = data.typeDistribution || {
            documents: { count: 0, bytes: 0 },
            media: { count: 0, bytes: 0 },
            others: { count: 0, bytes: 0 }
        };

        // Check for cooling period (recalibrate at most once per 6 hours)
        const lastSync = data.statsUpdatedAt ? new Date(data.statsUpdatedAt) : new Date(0);
        const hoursSinceSync = (new Date() - lastSync) / (1000 * 60 * 60);

        // Trigger recalibration ONLY if stats are completely missing OR 
        // they haven't been synced in > 6 hours AND look clearly wrong
        // Trigger recalibration if stats are missing, outdated, or inconsistent
        const isMissing = data.totalFilesCount === undefined || data.totalStorageUsedBytes === undefined;
        // Inconsistent: Count is 0 but bytes > 0, or bytes is 0 but count > 0
        const isInconsistent = (fileCount === 0 && storageUsed > 0) || (fileCount > 0 && storageUsed === 0 && !data.hasFolders);
        // FORCE SYNC: If no distribution data exists yet, or it was hardcoded to zero
        const isMissingDist = !data.typeDistribution || (data.typeDistribution.media?.count === 0 && data.typeDistribution.documents?.bytes === storageUsed && storageUsed > 0);
        
        const needsSync = isMissing || isMissingDist || (hoursSinceSync > 1 && isInconsistent); 

        if (needsSync) {
            console.log(`📊 [RE-CALC] Syncing stats for user: ${userId} (Reason: ${isMissing ? 'Missing' : isMissingDist ? 'NoDist' : 'Inconsistent'})`);
            const realStats = await recalibrateUserStats(userId);
            storageUsed = realStats.storageUsed;
            fileCount = realStats.fileCount;
            typeDistribution = realStats.typeDistribution;
            console.log(`   ✅ Sync Result: ${fileCount} files, ${storageUsed} bytes`);
        }

        const percentUsed = storageLimit > 0 ? Math.min(Math.round((storageUsed / storageLimit) * 100), 100) : 0;

        return {
            storageUsedBytes: storageUsed,
            storageLimitBytes: storageLimit,
            storageUsedFormatted: formatBytes(storageUsed),
            storageLimitFormatted: formatBytes(storageLimit),
            percentUsed,
            fileCount,
            typeDistribution,
            isNearLimit: percentUsed >= 80,
            isAtLimit: percentUsed >= 100,
            availableBytes: Math.max(0, storageLimit - storageUsed)
        };
    } catch (error) {
        console.error(`❌ Storage check failed: ${error.message}`);
        const freeLimit = PLANS.free.storageLimitGB * 1024 * 1024 * 1024;
        return { storageUsedBytes: 0, storageLimitBytes: freeLimit, percentUsed: 0, fileCount: 0 };
    }
}

/**
 * Recalibrate user stats from actual document count (One-time or sync)
 */
async function recalibrateUserStats(userId) {
    const db = getFirestore();
    // Query BOTH collections for complete recalibration
    const [filesSnap, docsSnap] = await Promise.all([
        db.collection('files').where('userId', '==', userId).get(),
        db.collection('documents').where('userId', '==', userId).get()
    ]);

    console.log(`📊 [RECALIBRATE] Starting for user: ${userId}`);
    console.log(`   Snaps: filesSnap=${filesSnap.size}, docsSnap=${docsSnap.size}`);

    let storageUsed = 0;
    let fileCount = 0;
    const uniqueDocs = new Map();
    const fingerprintMap = new Map();

    const getStatusScore = (status, data = {}) => {
        let score = 0;
        switch(status) {
            case 'completed': score = 100; break;
            case 'processing': score = 80; break;
            case 'uploading': score = 60; break;
            default: score = 50;
        }
        if (data.vectorCount > 0) score += 5;
        if (data.thumbnailStatus === 'ready') score += 5;
        return score;
    };

    [filesSnap, docsSnap].forEach(snap => snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'cancelled' || data.status === 'failed') return;
        
        const uniqueId = data.documentId || data.fileId || doc.id;
        const fingerprint = `${data.userId}_${data.fileName}_${data.fileSize}_${data.parentFolderId || 'root'}`;
        const score = getStatusScore(data.status, data);
        
        const existingById = uniqueDocs.get(uniqueId);
        const existingByFingerprint = fingerprintMap.get(fingerprint);
        const existing = existingById || existingByFingerprint;

        if (!existing || score > getStatusScore(existing.status, existing)) {
            uniqueDocs.set(uniqueId, data);
            fingerprintMap.set(fingerprint, data);
            
            if (existing && existing.documentId !== uniqueId) {
                uniqueDocs.delete(existing.documentId);
            }
        }
    }));

    console.log(`   Unique Docs Found: ${uniqueDocs.size}`);

    let typeDistribution = {
        documents: { count: 0, bytes: 0 },
        media: { count: 0, bytes: 0 },
        others: { count: 0, bytes: 0 }
    };

    uniqueDocs.forEach((data, docId) => {
        // Only count documents that are not trashed
        const isTrashStatus = data.status === 'trash';
        const isTrashedField = data.isTrashed === true;

        if (!isTrashStatus && !isTrashedField) {
            const size = (data.fileSize || 0);
            const isFolder = data.fileType === 'folder' || data.isFolder === true;
            
            storageUsed += size;
            if (!isFolder) fileCount++;

            // Track distribution (SKIP FOLDERS)
            if (data.fileType === 'folder' || data.isFolder) {
                // We subtracted the fileCount++ if it's a folder below or just handle it here
                return; 
            }

            const category = getCategory(data.fileType, data.fileName);
            
            if (typeDistribution[category]) {
                typeDistribution[category].count++;
                typeDistribution[category].bytes += size;
            } else {
                typeDistribution.others.count++;
                typeDistribution.others.bytes += size;
            }
        }
    });

    console.log(`   Final: ${fileCount} files, ${storageUsed} bytes`);

    await db.collection(USERS_COLLECTION).doc(userId).set({
        totalStorageUsedBytes: storageUsed,
        totalFilesCount: fileCount,
        typeDistribution: typeDistribution,
        statsUpdatedAt: new Date().toISOString()
    }, { merge: true });

    return { storageUsed, fileCount, typeDistribution };
}

/**
 * Increment user stats (Atomic)
 */
const admin = require('firebase-admin');
async function incrementUserStats(userId, bytesUpdate = 0, countUpdate = 0, type = null) {
    try {
        const db = getFirestore();
        const updates = {
            totalStorageUsedBytes: admin.firestore.FieldValue.increment(bytesUpdate),
            totalFilesCount: admin.firestore.FieldValue.increment(countUpdate)
        };

        if (type) {
            updates[`typeDistribution.${type}.count`] = admin.firestore.FieldValue.increment(countUpdate);
            updates[`typeDistribution.${type}.bytes`] = admin.firestore.FieldValue.increment(bytesUpdate);
        }

        await db.collection(USERS_COLLECTION).doc(userId).update(updates);
    } catch (e) {
        console.warn(`Failed to increment user stats for ${userId}:`, e.message);
    }
}

/**
 * Check if user has sufficient storage for a file
 * 
 * @param {string} userId - User ID
 * @param {number} fileSizeBytes - Size of file to upload
 * @returns {Object} Check result with canUpload flag
 */
async function checkStorageQuota(userId, fileSizeBytes) {
    const stats = await getUserStorageStats(userId);

    const wouldUse = stats.storageUsedBytes + fileSizeBytes;
    const canUpload = wouldUse <= stats.storageLimitBytes;

    return {
        canUpload,
        currentUsage: stats.storageUsedBytes,
        fileSize: fileSizeBytes,
        wouldUseBytes: wouldUse,
        limitBytes: stats.storageLimitBytes,
        remainingBytes: Math.max(0, stats.storageLimitBytes - stats.storageUsedBytes),
        message: canUpload
            ? 'Upload allowed'
            : 'Storage limit reached. Upgrade your plan.'
    };
}

/**
 * Check if a single file exceeds the plan's upload limit
 * 
 * @param {string} userId - User ID
 * @param {number} fileSizeBytes - Size of file to upload
 * @returns {Object} Check result with canUpload flag
 */
async function checkUploadLimit(userId, fileSizeBytes) {
    const db = getFirestore();
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        const data = userDoc.exists ? userDoc.data() : {};

        const planName = await getEffectivePlan(userId, data);
        const planConfig = PLANS[planName] || PLANS.free;

        const uploadLimitMB = planConfig.uploadLimitMB;

        // If uploadLimit is Infinity, always allowed
        if (uploadLimitMB === Infinity) {
            return { canUpload: true };
        }

        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        const canUpload = fileSizeMB <= uploadLimitMB;

        return {
            canUpload,
            message: canUpload
                ? 'File size allowed'
                : 'File exceeds your plan upload limit.'
        };
    } catch (error) {
        console.error(`❌ Upload limit check failed: ${error.message}`);
        // Default to free plan limit on error
        const freeLimitMB = PLANS.free.uploadLimitMB;
        const canUpload = (fileSizeBytes / (1024 * 1024)) <= freeLimitMB;
        return { canUpload, message: canUpload ? 'File size allowed' : 'File exceeds your plan upload limit.' };
    }
}

/**
 * Update user's storage limit (admin/upgrade function)
 * 
 * @param {string} userId - User ID
 * @param {number} newLimitBytes - New storage limit in bytes
 */
async function updateStorageLimit(userId, newLimitBytes) {
    const db = getFirestore();

    await db.collection(USERS_COLLECTION).doc(userId).set({
        storageLimitBytes: newLimitBytes,
        updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ Updated storage limit for ${userId}: ${formatBytes(newLimitBytes)}`);
}

/**
 * Initialize user storage (called on first login)
 * 
 * @param {string} userId - User ID
 */
async function initializeUserStorage(userId) {
    const db = getFirestore();
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (!userDoc.exists || !userDoc.data().plan) {
        await db.collection(USERS_COLLECTION).doc(userId).set({
            plan: 'free',
            storageInitializedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Initialized storage for user ${userId}: PLAN = free`);
    }
}

/**
 * Recalculate and cache storage (for optimization)
 * This doesn't change the source of truth - just pre-computes for faster reads
 * 
 * @param {string} userId - User ID
 */
async function recalculateUserStorage(userId) {
    // FORCE a real-time recalibration for accurate bulk updates
    console.log(`📊 [RECALC] Forcing storage recalibration for user: ${userId}`);
    const stats = await recalibrateUserStats(userId);

    const db = getFirestore();
    await db.collection(USERS_COLLECTION).doc(userId).set({
        cachedStorageUsedBytes: stats.storageUsed,
        cachedStorageUpdatedAt: new Date().toISOString()
    }, { merge: true });

    return stats;
}

/**
 * Check and increment AI request count for a user
 * Uses transactions to prevent race conditions during concurrent requests.
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { allowed: boolean, message: string }
 */
async function checkAiRequestsLimit(userId) {
    const db = getFirestore();
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(userId);
        const usageRef = db.collection(USERS_COLLECTION).doc(userId).collection('usage').doc('ai');

        return await db.runTransaction(async (transaction) => {
            const [userDoc, usageDoc] = await Promise.all([
                transaction.get(userRef),
                transaction.get(usageRef)
            ]);

            if (!userDoc.exists) {
                return { allowed: false, message: 'User not found' };
            }

            const data = userDoc.data();
            const planName = await getEffectivePlan(userId, data);
            const planConfig = PLANS[planName] || PLANS.free;
            const limit = planConfig.aiRequestsPerMonth;

            let usageData = usageDoc.exists ? usageDoc.data() : null;
            const now = new Date();

            // ==========================================
            // 1. AUTOMATIC RESET LOGIC (Requirement)
            // ==========================================
            if (usageData && usageData.nextResetDate) {
                const nextResetThreshold = new Date(usageData.nextResetDate);

                if (now >= nextResetThreshold) {
                    console.log(`🔄 [AI-RESET] Resetting usage for user ${userId}. Cycle ended at ${usageData.nextResetDate}`);

                    const nextMonth = new Date(now);
                    nextMonth.setMonth(now.getMonth() + 1);

                    const resetData = {
                        usedQueries: 0,
                        remainingQueries: limit,
                        lastResetDate: now.toISOString(),
                        nextResetDate: nextMonth.toISOString(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    transaction.set(usageRef, resetData, { merge: true });

                    // Also reset legacy counter in main doc for consistency
                    transaction.update(userRef, { aiRequestsUsed: 0 });

                    return { allowed: true }; // Allowed because we just reset
                }
            }

            // ==========================================
            // 2. VALIDATION LOGIC
            // ==========================================
            if (usageData) {
                const remaining = usageData.remainingQueries !== undefined ? usageData.remainingQueries : (limit - (usageData.usedQueries || 0));

                if (remaining <= 0) {
                    return {
                        allowed: false,
                        message: "You have reached your monthly AI limit. Please upgrade your plan."
                    };
                }
            } else {
                // Fallback for migration/legacy
                const used = data.aiRequestsUsed || 0;
                if (used >= limit) {
                    return {
                        allowed: false,
                        message: "You have reached your monthly AI limit. Please upgrade your plan."
                    };
                }
            }

            return { allowed: true };
        });
    } catch (error) {
        console.error(`❌ AI limit check failed: ${error.message}`);
        return { allowed: false, message: 'Failed to verify AI limits' };
    }
}

/**
 * Increment AI request usage after successful processing
 * Updates both the main user document and the granular tracking document.
 * 
 * @param {string} userId - User ID
 */
async function incrementAiRequestsUsage(userId) {
    const db = getFirestore();
    try {
        const userRef = db.collection(USERS_COLLECTION).doc(userId);
        const usageRef = db.collection(USERS_COLLECTION).doc(userId).collection('usage').doc('ai');

        return await db.runTransaction(async (transaction) => {
            const [userDoc, usageDoc] = await Promise.all([
                transaction.get(userRef),
                transaction.get(usageRef)
            ]);

            if (!userDoc.exists) throw new Error('User not found');

            const data = userDoc.data();
            const planName = await getEffectivePlan(userId, data);
            const planConfig = PLANS[planName] || PLANS.free;
            const limit = planConfig.aiRequestsPerMonth;

            // 1. Update primary user document
            transaction.update(userRef, {
                aiRequestsUsed: admin.firestore.FieldValue.increment(1),
                lastAiRequestAt: new Date().toISOString()
            });

            // 2. Update granular usage document (Requirement)
            let newUsed = 1;
            if (usageDoc.exists) {
                newUsed = (usageDoc.data().usedQueries || 0) + 1;
            } else if (data.aiRequestsUsed !== undefined) {
                newUsed = data.aiRequestsUsed + 1;
            }

            const newRemaining = Math.max(0, limit - newUsed);

            const now = new Date();
            const nextMonth = new Date(now);
            nextMonth.setMonth(now.getMonth() + 1);

            const usageData = usageDoc.exists ? usageDoc.data() : {};

            transaction.set(usageRef, {
                monthlyLimit: limit,
                usedQueries: newUsed,
                remainingQueries: newRemaining,
                lastResetDate: usageData.lastResetDate || now.toISOString(),
                nextResetDate: usageData.nextResetDate || nextMonth.toISOString(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            console.log(`📊 [AI-USAGE] Success: User ${userId} used ${newUsed}/${limit}`);
            return { used: newUsed, remaining: newRemaining };
        });
    } catch (error) {
        console.error(`❌ AI usage increment failed: ${error.message}`);
        throw error;
    }
}

/**
 * Legacy function: Check and increment in one go.
 * (Keeping it to prevent breaking existing code during transition)
 */
async function checkAndIncrementAiRequests(userId) {
    const check = await checkAiRequestsLimit(userId);
    if (!check.allowed) return check;

    try {
        await incrementAiRequestsUsage(userId);
        return { allowed: true };
    } catch (e) {
        return { allowed: false, message: 'Failed to update usage' };
    }
}

/**
 * Check if user is allowed to use a specific sharing permission
 * 
 * @param {string} userId - User ID
 * @param {string} permission - Requested permission ('read', 'view', 'edit', 'download')
 * @returns {Promise<Object>} { allowed: boolean, message: string }
 */
async function checkSharePermission(userId, permission) {
    const db = getFirestore();
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        const data = userDoc.exists ? userDoc.data() : {};

        const planName = await getEffectivePlan(userId, data);
        const planConfig = PLANS[planName] || PLANS.free;

        // Normalize permission: 'view' is treated as 'read' in the plan config
        const normalizedPermission = permission === 'view' ? 'read' : permission;

        const isAllowed = planConfig.sharePermissions.includes(normalizedPermission);

        return {
            allowed: isAllowed,
            message: isAllowed
                ? 'Permission allowed'
                : 'This permission is not available in your plan.'
        };
    } catch (error) {
        console.error(`❌ Share permission check failed: ${error.message}`);
        return { allowed: false, message: 'Failed to verify sharing permissions' };
    }
}

/**
 * Check if user is allowed to enable MFA based on plan
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} { allowed: boolean, message: string }
 */
async function checkMfaPermission(userId) {
    const db = getFirestore();
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        const data = userDoc.exists ? userDoc.data() : {};

        const planName = await getEffectivePlan(userId, data);
        const planConfig = PLANS[planName] || PLANS.free;

        const isAllowed = planConfig.mfaEnabled === true;

        return {
            allowed: isAllowed,
            message: isAllowed
                ? 'MFA allowed'
                : 'Upgrade your plan to Pro or Professional to enable this feature'
        };
    } catch (error) {
        console.error(`❌ MFA permission check failed: ${error.message}`);
        return { allowed: false, message: 'Failed to verify MFA eligibility' };
    }
}

/**
 * Get storage breakdown by file type
 * 
 * @param {string} userId - User ID
 * @returns {Object} Storage breakdown
 */
async function getStorageBreakdown(userId) {
    const db = getFirestore();

    // Query both collections and both ownership fields for accurate breakdown
    const [snap1, snap2, snap3, snap4] = await Promise.all([
        db.collection('files').where('userId', '==', userId).get(),
        db.collection('files').where('ownerUserId', '==', userId).get(),
        db.collection('documents').where('userId', '==', userId).get(),
        db.collection('documents').where('ownerUserId', '==', userId).get()
    ]);

    const uniqueDocs = new Map();
    [snap1, snap2, snap3, snap4].forEach(snap => {
        snap.forEach(doc => uniqueDocs.set(doc.id, doc.data()));
    });

    const breakdown = {
        pdf: { count: 0, bytes: 0 },
        docx: { count: 0, bytes: 0 },
        doc: { count: 0, bytes: 0 },
        txt: { count: 0, bytes: 0 },
        images: { count: 0, bytes: 0 },
        other: { count: 0, bytes: 0 }
    };

    uniqueDocs.forEach((data) => {
        const fileType = (data.fileType || 'other').toLowerCase();
        const fileSize = data.fileSize || 0;

        if (breakdown[fileType]) {
            breakdown[fileType].count++;
            breakdown[fileType].bytes += fileSize;
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
            breakdown.images.count++;
            breakdown.images.bytes += fileSize;
        } else {
            breakdown.other.count++;
            breakdown.other.bytes += fileSize;
        }
    });

    // Format bytes
    Object.keys(breakdown).forEach(key => {
        breakdown[key].formatted = formatBytes(breakdown[key].bytes);
    });

    return breakdown;
}

/**
 * Format bytes to human-readable string
 * 
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse formatted storage string to bytes
 * 
 * @param {string} formatted - Formatted string (e.g., "5 GB")
 * @returns {number} Bytes
 */
function parseBytes(formatted) {
    const units = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 * 1024,
        'GB': 1024 * 1024 * 1024,
        'TB': 1024 * 1024 * 1024 * 1024
    };

    const match = formatted.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    return Math.round(value * (units[unit] || 1));
}

module.exports = {
    getUserStorageStats,
    checkStorageQuota,
    checkUploadLimit,
    checkAiRequestsLimit,
    incrementAiRequestsUsage,
    checkAndIncrementAiRequests,
    checkSharePermission,
    checkMfaPermission,
    updateStorageLimit,
    initializeUserStorage,
    recalculateUserStorage,
    getStorageBreakdown,
    formatBytes,
    parseBytes,
    incrementUserStats,
    getEffectivePlan,
    recalibrateUserStats,
    PLANS
};
