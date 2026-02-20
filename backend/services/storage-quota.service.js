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

// Collection names
const USERS_COLLECTION = 'users';
const DOCUMENTS_COLLECTION = 'documents';

// Default storage limit: 5 GB
const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5368709120 bytes

/**
 * Get user's storage statistics
 * Calculates REAL storage from database - not cached/fake values
 * 
 * @param {string} userId - User ID from verified Firebase token
 * @returns {Object} Storage stats
 */
async function getUserStorageStats(userId) {
    console.log(`📊 Calculating storage for user: ${userId}`);

    const db = getFirestore();

    try {
        // Get user document for storage limit
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
        let storageLimit = DEFAULT_STORAGE_LIMIT;

        if (userDoc.exists && userDoc.data().storageLimitBytes) {
            storageLimit = userDoc.data().storageLimitBytes;
        }

        // Calculate REAL storage used from documents
        // Try composite query first, fall back to filtering in-memory if index not created
        let docsSnapshot;
        let useInMemoryFilter = false;

        try {
            // Try the optimized query with composite index
            docsSnapshot = await db.collection(DOCUMENTS_COLLECTION)
                .where('userId', '==', userId)
                .where('status', '==', 'ready')
                .get();
        } catch (queryError) {
            // If composite index doesn't exist, fall back to simpler query
            console.log(`   ⚠️ Composite query failed, using in-memory filter: ${queryError.message}`);
            docsSnapshot = await db.collection(DOCUMENTS_COLLECTION)
                .where('userId', '==', userId)
                .get();
            useInMemoryFilter = true;
        }

        let storageUsed = 0;
        let fileCount = 0;
        const fileSizes = [];

        docsSnapshot.forEach(doc => {
            const data = doc.data();

            // Filter by status='ready' in memory if needed
            if (useInMemoryFilter && data.status !== 'ready') {
                return; // Skip non-ready documents
            }

            const fileSize = data.fileSize || 0;
            storageUsed += fileSize;
            fileCount++;

            console.log(`   📄 ${data.fileName}: ${formatBytes(fileSize)} (status: ${data.status})`);

            fileSizes.push({
                documentId: data.documentId,
                fileName: data.fileName,
                fileSize: fileSize,
                status: data.status
            });
        });

        // Calculate percentage
        const percentUsed = storageLimit > 0
            ? Math.min(Math.round((storageUsed / storageLimit) * 100), 100)
            : 0;

        // Format for display
        const stats = {
            storageUsedBytes: storageUsed,
            storageLimitBytes: storageLimit,
            storageUsedFormatted: formatBytes(storageUsed),
            storageLimitFormatted: formatBytes(storageLimit),
            percentUsed: percentUsed,
            fileCount: fileCount,
            isNearLimit: percentUsed >= 80,
            isAtLimit: percentUsed >= 100,
            availableBytes: Math.max(0, storageLimit - storageUsed),
            availableFormatted: formatBytes(Math.max(0, storageLimit - storageUsed))
        };

        console.log(`   ✅ Storage: ${stats.storageUsedFormatted} / ${stats.storageLimitFormatted} (${percentUsed}%)`);
        console.log(`   📁 Files counted: ${fileCount}`);

        return stats;

    } catch (error) {
        console.error(`   ❌ Storage calculation failed: ${error.message}`);
        console.error(error.stack);
        throw error;
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
            : `Storage limit exceeded. You need ${formatBytes(wouldUse - stats.storageLimitBytes)} more space.`
    };
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

    if (!userDoc.exists || !userDoc.data().storageLimitBytes) {
        await db.collection(USERS_COLLECTION).doc(userId).set({
            storageLimitBytes: DEFAULT_STORAGE_LIMIT,
            storageInitializedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Initialized storage for user ${userId}: ${formatBytes(DEFAULT_STORAGE_LIMIT)}`);
    }
}

/**
 * Recalculate and cache storage (for optimization)
 * This doesn't change the source of truth - just pre-computes for faster reads
 * 
 * @param {string} userId - User ID
 */
async function recalculateUserStorage(userId) {
    const stats = await getUserStorageStats(userId);

    const db = getFirestore();
    await db.collection(USERS_COLLECTION).doc(userId).set({
        cachedStorageUsedBytes: stats.storageUsedBytes,
        cachedStorageUpdatedAt: new Date().toISOString()
    }, { merge: true });

    return stats;
}

/**
 * Get storage breakdown by file type
 * 
 * @param {string} userId - User ID
 * @returns {Object} Storage breakdown
 */
async function getStorageBreakdown(userId) {
    const db = getFirestore();

    const docsSnapshot = await db.collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', 'ready')
        .get();

    const breakdown = {
        pdf: { count: 0, bytes: 0 },
        docx: { count: 0, bytes: 0 },
        doc: { count: 0, bytes: 0 },
        txt: { count: 0, bytes: 0 },
        images: { count: 0, bytes: 0 },
        other: { count: 0, bytes: 0 }
    };

    docsSnapshot.forEach(doc => {
        const data = doc.data();
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
    updateStorageLimit,
    initializeUserStorage,
    recalculateUserStorage,
    getStorageBreakdown,
    formatBytes,
    parseBytes,
    DEFAULT_STORAGE_LIMIT
};
