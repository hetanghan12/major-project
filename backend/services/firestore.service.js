/**
 * Firestore Database Service
 * ============================
 * Handles Firestore operations for user and document metadata.
 * 
 * Collections:
 * - users: User profiles
 * - documents: Document metadata
 * 
 * @author College Project
 */

const { getFirestore } = require('../config/firebase.config');

// Collection names
const USERS_COLLECTION = 'users';
const DOCUMENTS_COLLECTION = 'documents';

// =============================================================================
// USER OPERATIONS
// =============================================================================

/**
 * Create or update user profile in Firestore
 * @param {string} userId - Firebase Auth user ID
 * @param {Object} userData - User data
 */
async function createOrUpdateUser(userId, userData) {
    try {
        const db = getFirestore();
        const userRef = db.collection(USERS_COLLECTION).doc(userId);

        const data = {
            userId,
            email: userData.email,
            displayName: userData.displayName || null,
            photoURL: userData.photoURL || null,
            updatedAt: new Date().toISOString(),
            ...(!userData.createdAt && { createdAt: new Date().toISOString() })
        };

        await userRef.set(data, { merge: true });
        console.log(`✅ User profile saved: ${userId}`);

        return data;
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn(`⚠️  [QUOTA] Exceeded for createOrUpdateUser (User: ${userId}). Serving virtual profile.`);
            return { userId, email: userData.email, displayName: userData.displayName, photoURL: userData.photoURL, quotaExceeded: true };
        }
        throw error;
    }
}

/**
 * Get user profile from Firestore
 * @param {string} userId - Firebase Auth user ID
 */
async function getUser(userId) {
    try {
        const db = getFirestore();
        const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

        if (!userDoc.exists) {
            return null;
        }

        return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn(`⚠️  [QUOTA] Exceeded for getUser (User: ${userId}). Returning null for virtual profile fallback.`);
            return null;
        }
        throw error;
    }
}

// =============================================================================
// DOCUMENT OPERATIONS
// =============================================================================

/**
 * Save document metadata to Firestore
 * 
 * SECURITY: This function stores the complete document metadata including:
 * - s3Key: For S3 object deletion
 * - pineconeNamespace: For vector isolation (= userId)
 * - chunkIds: For explicit vector deletion (NOT deleteAll)
 * 
 * @param {Object} documentData - Document metadata
 */
async function saveDocument(documentData) {
    const db = getFirestore();
    const docRef = db.collection(DOCUMENTS_COLLECTION).doc(documentData.documentId);

    // CRITICAL: Include all fields needed for complete deletion
    const data = {
        // Core identifiers
        documentId: documentData.documentId,
        userId: documentData.userId,

        // File information
        fileName: documentData.fileName,
        fileType: documentData.fileType,
        fileSize: documentData.fileSize || 0,

        // Storage paths
        storagePath: documentData.storagePath || null,
        publicUrl: documentData.publicUrl || null,

        // AWS S3 storage (REQUIRED for S3 deletion)
        s3Key: documentData.s3Key || null,          // S3 object key
        s3Url: documentData.s3Url || null,          // S3 URL

        // Pinecone vectors (REQUIRED for complete vector deletion)
        pineconeNamespace: documentData.pineconeNamespace || documentData.userId || null,
        chunkIds: documentData.chunkIds || [],      // Explicit chunk IDs for deletion
        vectorCount: documentData.vectorCount || 0,

        // Thumbnail (Google Drive-style preview - stored in S3)
        thumbnailUrl: documentData.thumbnailUrl || null,
        thumbnailStatus: documentData.thumbnailStatus || (documentData.isFolder ? 'ready' : 'processing'),
        previewUrl: documentData.previewUrl || null,
        previewPath: documentData.previewPath || null,
        previewGenerated: documentData.previewGenerated || false,

        // Status tracking
        status: documentData.status || 'processing',
        uploadedAt: documentData.uploadedAt || new Date().toISOString(),

        // Folder properties
        isFolder: documentData.isFolder || false,
        parentFolderId: documentData.parentFolderId || null,

        // User states
        isStarred: documentData.isStarred || false,
        isTrashed: documentData.isTrashed || false
    };

    await docRef.set(data);
    console.log(`✅ Document metadata saved: ${documentData.documentId}`);
    console.log(`   - Type: ${data.isFolder ? 'FOLDER' : 'FILE'}`);
    console.log(`   - S3 Key: ${data.s3Key || 'not set'}`);
    console.log(`   - Namespace: ${data.pineconeNamespace || 'not set'}`);
    console.log(`   - Chunk IDs: ${data.chunkIds.length}`);

    return data;
}

/**
 * Update document status
 * @param {string} documentId - Document ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 */
async function updateDocumentStatus(documentId, status, additionalData = {}) {
    const db = getFirestore();
    const docRef = db.collection(DOCUMENTS_COLLECTION).doc(documentId);

    await docRef.update({
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData
    });

    console.log(`✅ Document status updated: ${documentId} -> ${status}`);
}

/**
 * Update generic document metadata
 * @param {string} documentId - Document ID
 * @param {Object} data - Data to update
 */
async function updateDocument(documentId, data) {
    const db = getFirestore();
    const docRef = db.collection(DOCUMENTS_COLLECTION).doc(documentId);

    const updateData = {
        updatedAt: new Date().toISOString(),
        ...data
    };

    await docRef.update(updateData);
    console.log(`✅ Document updated: ${documentId}`, Object.keys(data));
    return updateData;
}

/**
 * Get documents for a user with Pagination
 * @param {string} userId - User ID
 * @param {Object} options - { limit: number, lastDocId: string, filter: string }
 */
async function getUserDocuments(userId, options = {}) {
    try {
        const db = getFirestore();

        console.log(`      [DB] getUserDocuments for ${userId}, filter: ${options.filter || 'all'}`);

        // =====================================================================
        // SIMPLE QUERY — NO COMPOSITE INDEX REQUIRED
        // Only uses .where('userId', '==', userId) — a single-field query.
        // All filtering and sorting is done in memory.
        // This avoids the FAILED_PRECONDITION error entirely.
        // =====================================================================
        const snapshot = await db.collection(DOCUMENTS_COLLECTION)
            .where('userId', '==', userId)
            .get();

        console.log(`      [DB] Fetched ${snapshot.size} total docs for user ${userId}`);

        let allDocs = [];
        snapshot.forEach(doc => allDocs.push({ id: doc.id, ...doc.data() }));

        // In-memory filter based on requested view
        if (options.filter === 'trash') {
            allDocs = allDocs.filter(d => d.status === 'trash' || d.isTrashed === true);
        } else if (options.filter === 'starred') {
            allDocs = allDocs.filter(d => d.isStarred === true && d.isTrashed !== true);
        } else if (options.filter === 'recent') {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            allDocs = allDocs.filter(d => d.isTrashed !== true && d.uploadedAt >= sevenDaysAgo);
        } else {
            // Default view: return ALL documents (including trashed & starred)
            // The frontend handles view-specific filtering (My Files, Starred, Trash, etc.)
            allDocs = allDocs.filter(d => d.status !== 'failed');
        }

        console.log(`      [DB] After filtering: ${allDocs.length} docs remain`);

        // In-memory sort by uploadedAt descending
        allDocs.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));

        return {
            documents: allDocs.map(data => ({
                id: data.id,
                documentId: data.documentId || data.id,
                ...data,
                thumbnailStatus: data.thumbnailStatus || (data.previewUrl ? 'ready' : (data.previewFailed ? 'failed' : 'processing')),
                thumbnailUrl: data.thumbnailUrl || data.previewUrl || null
            })),
            lastDocId: allDocs.length > 0 ? allDocs[allDocs.length - 1].id : null,
            hasMore: false
        };

    } catch (error) {
        console.error('❌ getUserDocuments failed:', error.message);
        if (error.code === 8 || error.message.includes('Quota')) {
            return { documents: [], lastDocId: null, hasMore: false, error: 'Storage quota exceeded' };
        }
        throw error;
    }
}

/**
 * Get single document by ID
 * @param {string} documentId - Document ID
 */
async function getDocument(documentId) {
    const db = getFirestore();
    const docRef = await db.collection(DOCUMENTS_COLLECTION).doc(documentId).get();

    if (!docRef.exists) {
        return null;
    }

    const data = docRef.data();
    return {
        id: docRef.id,
        documentId: data.documentId || docRef.id,
        ...data,
        thumbnailStatus: data.thumbnailStatus || (data.previewUrl ? 'ready' : (data.previewFailed ? 'failed' : 'processing')),
        thumbnailUrl: data.thumbnailUrl || data.previewUrl || null
    };
}

/**
 * Delete document metadata
 * @param {string} documentId - Document ID
 */
async function deleteDocument(documentId) {
    const db = getFirestore();
    await db.collection(DOCUMENTS_COLLECTION).doc(documentId).delete();
    console.log(`✅ Document metadata deleted: ${documentId}`);
}

/**
 * Get document count for a user
 * @param {string} userId - User ID
 */
async function getUserDocumentCount(userId) {
    const db = getFirestore();
    const snapshot = await db.collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .count()
        .get();

    return snapshot.data().count;
}

/**
 * Get all subscription plans
 */
async function getSubscriptionPlans() {
    const db = getFirestore();
    const snapshot = await db.collection('subscription_plans').get();

    const plans = [];
    snapshot.forEach(doc => {
        plans.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Sort plans by order or creation date if necessary, or let frontend handle it
    return plans;
}

module.exports = {
    // User operations
    createOrUpdateUser,
    getUser,

    // Document operations
    saveDocument,
    updateDocumentStatus,
    updateDocument,
    getUserDocuments,
    getDocument,
    deleteDocument,
    getUserDocumentCount,
    getSubscriptionPlans
};
