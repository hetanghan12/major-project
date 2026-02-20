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
}

/**
 * Get user profile from Firestore
 * @param {string} userId - Firebase Auth user ID
 */
async function getUser(userId) {
    const db = getFirestore();
    const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

    if (!userDoc.exists) {
        return null;
    }

    return { id: userDoc.id, ...userDoc.data() };
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
        fileSize: documentData.fileSize,

        // Storage paths
        storagePath: documentData.storagePath,      // Local file path
        publicUrl: documentData.publicUrl,

        // AWS S3 storage (REQUIRED for S3 deletion)
        s3Key: documentData.s3Key || null,          // S3 object key
        s3Url: documentData.s3Url || null,          // S3 URL

        // Pinecone vectors (REQUIRED for complete vector deletion)
        pineconeNamespace: documentData.pineconeNamespace || documentData.userId,  // namespace = userId
        chunkIds: documentData.chunkIds || [],      // Explicit chunk IDs for deletion
        vectorCount: documentData.vectorCount || 0,

        // Thumbnail (Google Drive-style preview - stored in S3)
        thumbnailUrl: documentData.thumbnailUrl || null,  // Legacy field
        previewUrl: documentData.previewUrl || null,      // S3 preview URL
        previewPath: documentData.previewPath || null,    // S3 preview key
        previewGenerated: documentData.previewGenerated || false,

        // Status tracking
        status: documentData.status || 'processing',
        uploadedAt: new Date().toISOString()
    };

    await docRef.set(data);
    console.log(`✅ Document metadata saved: ${documentData.documentId}`);
    console.log(`   - S3 Key: ${data.s3Key || 'not set'}`);
    console.log(`   - Namespace: ${data.pineconeNamespace}`);
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
 * Get documents for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * 
 * NOTE: Using in-memory sorting to avoid requiring a Firestore composite index.
 * For production, create the index: documents (userId ASC, uploadedAt DESC)
 */
async function getUserDocuments(userId, options = {}) {
    const db = getFirestore();

    // Query without orderBy to avoid composite index requirement
    // Sorting will be done in-memory after fetching
    let query = db.collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId);

    if (options.limit) {
        query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const documents = [];

    snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
    });

    // Sort by uploadedAt descending (newest first) in-memory
    documents.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || 0);
        const dateB = new Date(b.uploadedAt || 0);
        return dateB - dateA;  // Descending order
    });

    return documents;
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

    return { id: docRef.id, ...docRef.data() };
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
    getUserDocumentCount
};
