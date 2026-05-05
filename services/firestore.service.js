/**
 * Firestore Database Service
 * ============================
 * Handles Firestore operations for user and document metadata.
 * 
 * Collections:
 * - users: User profiles
 * - files: Document metadata
 * 
 * @author College Project
 */

const { getFirestore } = require('../config/firebase.config');

// Collection names
const USERS_COLLECTION = 'users';
const DOCUMENTS_COLLECTION = 'files'; // Renamed from 'documents' to 'files' for user compatibility

/**
 * Helper: Find a document in either 'files' or 'documents' collection
 * @param {string} documentId 
 * @returns {Promise<{docRef: any, exists: boolean, data: any}>}
 */
async function resolveDoc(documentId) {
    console.log(`[DEBUG] resolveDoc: Searching for documentId="${documentId}"`);
    const db = getFirestore();

    // Try 'files' first by doc ID
    let docRef = db.collection('files').doc(documentId);
    let docSnap = await docRef.get();

    if (docSnap.exists) {
        console.log(`[DEBUG] resolveDoc: Found by ID in "files" collection`);
        return { docRef, exists: true, data: docSnap.data() };
    }

    // Try 'documents' by doc ID
    docRef = db.collection('documents').doc(documentId);
    docSnap = await docRef.get();
    if (docSnap.exists) {
        console.log(`[DEBUG] resolveDoc: Found by ID in "documents" collection`);
        return { docRef, exists: true, data: docSnap.data() };
    }

    // FALLBACK: Query by "documentId" field in "files"
    console.log(`[DEBUG] resolveDoc: Not found by ID, trying query by field "documentId" in "files"`);
    let querySnap = await db.collection('files').where('documentId', '==', documentId).limit(1).get();
    if (!querySnap.empty) {
        console.log(`[DEBUG] resolveDoc: Found by field query in "files"`);
        return { docRef: querySnap.docs[0].ref, exists: true, data: querySnap.docs[0].data() };
    }

    // FALLBACK: Query by "documentId" field in "documents"
    console.log(`[DEBUG] resolveDoc: Trying query by field "documentId" in "documents"`);
    querySnap = await db.collection('documents').where('documentId', '==', documentId).limit(1).get();
    if (!querySnap.empty) {
        console.log(`[DEBUG] resolveDoc: Found by field query in "documents"`);
        return { docRef: querySnap.docs[0].ref, exists: true, data: querySnap.docs[0].data() };
    }

    console.log(`[DEBUG] resolveDoc: NOT FOUND in either collection by any method`);
    return {
        docRef: db.collection('files').doc(documentId), // Return a dummy ref
        exists: false,
        data: null
    };
}

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

        // Check if user exists to initialize default plan-based fields for new users
        const userDoc = await userRef.get();
        const isNewUser = !userDoc.exists;

        const data = {
            userId,
            email: userData.email,
            updatedAt: new Date().toISOString()
        };

        if (userData.displayName) data.displayName = userData.displayName;
        if (userData.photoURL) data.photoURL = userData.photoURL;

        // Initialize defaults only for first-time signup
        if (isNewUser) {
            data.plan = 'free';
            data.totalStorageUsedBytes = 0;
            data.totalFilesCount = 0;
            data.aiRequestsUsed = 0;
            data.aiRequestsResetDate = new Date().toISOString();
            data.mfaEnabled = false;
            data.createdAt = new Date().toISOString();
        }

        await userRef.set(data, { merge: true });
        console.log(`✅ User profile saved: ${userId} (New: ${isNewUser})`);

        return isNewUser ? data : { ...userDoc.data(), ...data };
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
    // Enhanced with 'uploads' schema requirements
    const data = {
        // Core identifiers
        documentId: documentData.documentId,
        fileId: documentData.documentId,            // ALIGNMENT: Match user preferred schema
        uploadId: documentData.documentId,          // NEW: Required by 'uploads' schema
        userId: documentData.userId,
        ownerUserId: documentData.userId,           // ALIGNMENT: Match user preferred schema

        // File information
        fileName: documentData.fileName,
        name: documentData.fileName,                // ALIGNMENT: Match user preferred schema
        fileType: documentData.fileType,
        fileType: documentData.fileType,
        fileSize: documentData.fileSize || 0,

        // Storage paths
        storagePath: documentData.storagePath || null,
        publicUrl: documentData.publicUrl || null,
        storageUrl: documentData.storageUrl || documentData.publicUrl || null, // NEW: Required by 'uploads' schema

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
        // Status mapping: uploading -> processing -> completed
        status: documentData.status || 'uploading',
        createdAt: documentData.createdAt || new Date(), // NEW: Required by 'uploads' schema
        uploadedAt: documentData.uploadedAt || new Date().toISOString(),

        // Folder properties
        isFolder: documentData.isFolder || false,
        parentFolderId: documentData.parentFolderId || null,

        // User states
        isStarred: documentData.isStarred || false,
        isTrashed: documentData.isTrashed || false,

        // Collaboration & Content (NEW)
        lastEditedBy: documentData.lastEditedBy || documentData.userId,
        content: documentData.content || null,
        updatedAt: documentData.updatedAt || new Date().toISOString()
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

    // Resolve which collection the document belongs to
    const { docRef, exists } = await resolveDoc(documentId);
    if (!exists) return false;

    try {
        let updateSucceeded = true;
        // Run as transaction to ensure we don't overwrite terminal states
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(docRef);
            if (!doc.exists) {
                updateSucceeded = false;
                return;
            }

            const currentStatus = doc.data().status;

            // SECURITY: If cancelled or failed, do NOT allow overwriting with 'processing' or 'completed'
            if (currentStatus === 'cancelled' || currentStatus === 'failed') {
                console.warn(`⚠️ [Firestore] blocked status update for ${documentId}: ${currentStatus} -> ${status}`);
                updateSucceeded = false;
                return;
            }

            transaction.update(docRef, {
                status,
                updatedAt: new Date().toISOString(),
                ...additionalData
            });
        });

        if (updateSucceeded) {
            console.log(`✅ Document status updated: ${documentId} -> ${status}`);
        }
        return updateSucceeded;
    } catch (error) {
        console.error(`❌ updateDocumentStatus failed for ${documentId}:`, error.message);
        throw error;
    }
}

/**
 * Update generic document metadata
 * @param {string} documentId - Document ID
 * @param {Object} data - Data to update
 */
async function updateDocument(documentId, data) {
    const db = getFirestore();
    const { docRef, exists } = await resolveDoc(documentId);
    if (!exists) throw new Error('Document not found');

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
        // Recovery Logic: Query BOTH 'files' and 'documents' collections
        // Fetch documents where user is 'userId'
        // Using two parallel queries to maintain performance without needing composite indexes for OR logic
        const [snap1, snap2, snap3, snap4] = await Promise.all([
            db.collection('files').where('userId', '==', userId).get(),
            db.collection('files').where('ownerUserId', '==', userId).get(),
            db.collection('documents').where('userId', '==', userId).get(),
            db.collection('documents').where('ownerUserId', '==', userId).get()
        ]);

        const uniqueDocs = new Map();
        const fingerprintMap = new Map(); // For cross-ID deduplication of identical files

        // Status priority for deduplication: completed > processing > uploading > others
        const getStatusScore = (status, data = {}) => {
            let score = 0;
            switch (status) {
                case 'completed': score = 100; break;
                case 'processing': score = 80; break;
                case 'uploading': score = 60; break;
                case 'cancelled': score = 0; break;
                case 'failed': score = 0; break;
                default: score = 50;
            }
            // Bonus points for having AI metadata/thumbnails/previews
            if (data.vectorCount > 0) score += 10;
            if (data.thumbnailUrl || data.previewUrl) score += 5;
            if (data.thumbnailStatus === 'ready') score += 5;
            return score;
        };

        [snap1, snap2, snap3, snap4].forEach(snap => {
            snap.forEach(doc => {
                const data = doc.data();

                // IGNORE: Completely skip cancelled/failed docs unless they were explicitly requested (unlikely in Drive view)
                if (data.status === 'cancelled' || data.status === 'failed') return;

                const uniqueId = data.documentId || data.fileId || doc.id;
                const fingerprint = `${data.userId}_${data.fileName || data.name}_${data.fileSize}_${data.parentFolderId || 'root'}`;
                const score = getStatusScore(data.status, data);

                // 1. Check by ID first
                const existingById = uniqueDocs.get(uniqueId);
                // 2. Check by Fingerprint (Owner + Name + Size + Folder)
                const existingByFingerprint = fingerprintMap.get(fingerprint);

                const existing = existingById || existingByFingerprint;

                if (!existing || score > getStatusScore(existing.status, existing)) {
                    const record = {
                        ...data,
                        documentId: uniqueId,
                        // Ensure status is handled correctly
                        status: data.status || 'completed'
                    };
                    uniqueDocs.set(uniqueId, record);
                    fingerprintMap.set(fingerprint, record);

                    // Cleanup: If we overrode by fingerprint but IDs were different, remove the old one from main map
                    if (existing && existing.documentId !== uniqueId) {
                        uniqueDocs.delete(existing.documentId);
                    }
                }
            });
        });

        let allDocs = Array.from(uniqueDocs.values());
        console.log(`      [DB Recovery] Found ${allDocs.length} unique docs across collections for user ${userId}`);

        // In-memory filter based on requested view
        if (options.filter === 'trash') {
            allDocs = allDocs.filter(d => d.status === 'trash' || d.isTrashed === true);
        } else if (options.filter === 'starred') {
            allDocs = allDocs.filter(d => d.isStarred === true && d.isTrashed !== true);
        } else if (options.filter === 'recent') {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            allDocs = allDocs.filter(d => d.isTrashed !== true && d.uploadedAt >= sevenDaysAgo);
        } else {
            // Default view: include everything (frontend handles filtering)
            // This is necessary for Storage Insights and instant tab switching
            // allDocs = allDocs; // No filter
        }

        // Folders check
        const folders = allDocs.filter(d => d.isFolder === true || d.fileType === 'folder');
        const processing = allDocs.filter(d => d.status === 'processing');
        console.log(`      [DB] Stats: Total=${allDocs.length}, Folders=${folders.length}, Processing=${processing.length}`);

        // In-memory sort by uploadedAt descending
        allDocs.sort((a, b) => {
            const dateA = new Date(a.uploadedAt || a.createdAt || 0);
            const dateB = new Date(b.uploadedAt || b.createdAt || 0);
            return dateB - dateA;
        });

        return {
            documents: allDocs.map(data => {
                // Determine thumbnailUrl: prefer local API URL, then previewUrl
                const resolvedThumbnailUrl = data.thumbnailUrl || data.previewUrl || null;

                // Determine thumbnailStatus correctly:
                // 1. If explicitly set in Firestore, use it
                // 2. If we have a local /api/thumbnails/ URL, it's ready
                // 3. If we have a previewUrl, it's ready
                // 4. If generation failed, it's failed
                // 5. Only show 'processing' if the doc is still actively processing
                let resolvedThumbnailStatus = data.thumbnailStatus;
                if (!resolvedThumbnailStatus) {
                    if (resolvedThumbnailUrl && typeof resolvedThumbnailUrl === 'string' && resolvedThumbnailUrl.startsWith('/api/thumbnails/')) {
                        resolvedThumbnailStatus = 'ready';
                    } else if (data.previewUrl) {
                        resolvedThumbnailStatus = 'ready';
                    } else if (data.previewFailed) {
                        resolvedThumbnailStatus = 'failed';
                    } else if (data.status === 'processing' || data.status === 'uploading') {
                        resolvedThumbnailStatus = 'processing';
                    } else {
                        // Doc is ready/completed but has no thumbnail - show fallback icon, not spinner
                        resolvedThumbnailStatus = 'failed';
                    }
                }

                return {
                    id: data.id,
                    documentId: data.documentId || data.id,
                    ...data,
                    thumbnailStatus: resolvedThumbnailStatus,
                    thumbnailUrl: resolvedThumbnailUrl
                };
            }),
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
    console.log(`[DEBUG] getDocument: Requested ID="${documentId}"`);
    const { exists, data, docRef } = await resolveDoc(documentId);

    if (!exists) {
        console.warn(`[DEBUG] getDocument: Document "${documentId}" NOT FOUND`);
        return null;
    }

    console.log(`[DEBUG] getDocument: Found metadata for "${data.fileName || data.name}"`);
    const resolvedThumbnailUrl = data.thumbnailUrl || data.previewUrl || null;
    let resolvedThumbnailStatus = data.thumbnailStatus;
    if (!resolvedThumbnailStatus) {
        if (resolvedThumbnailUrl && typeof resolvedThumbnailUrl === 'string' && resolvedThumbnailUrl.startsWith('/api/thumbnails/')) {
            resolvedThumbnailStatus = 'ready';
        } else if (data.previewUrl) {
            resolvedThumbnailStatus = 'ready';
        } else if (data.previewFailed) {
            resolvedThumbnailStatus = 'failed';
        } else if (data.status === 'processing' || data.status === 'uploading') {
            resolvedThumbnailStatus = 'processing';
        } else {
            resolvedThumbnailStatus = 'failed';
        }
    }

    return {
        id: docRef.id,
        documentId: data.documentId || docRef.id,
        ...data,
        thumbnailStatus: resolvedThumbnailStatus,
        thumbnailUrl: resolvedThumbnailUrl
    };
}

/**
 * Delete document metadata from ALL potential collections
 * This performs a "Deep Scrub" by identifying and removing any duplicates
 * based on the document fingerprint (Name + Size + User).
 * @param {string} documentId - The primary ID to delete
 */
async function deleteDocument(documentId) {
    const db = getFirestore();

    try {
        console.log(`[DB] Deep Scrub for documentId: ${documentId}`);

        // 1. Fetch the document first to get fingerprint metadata
        // This is critical for finding duplicates with different IDs
        const { exists, data, docRef } = await resolveDoc(documentId);

        if (!exists) {
            console.warn(`[DB] No record found for ${documentId} during delete. Performing ID-only scrub.`);
            await Promise.all([
                db.collection('files').doc(documentId).delete(),
                db.collection('documents').doc(documentId).delete()
            ]);
            return;
        }

        const userId = data.userId || data.ownerUserId;
        const fileName = data.fileName || data.name;
        const fileSize = data.fileSize || 0;

        console.log(`[DB] Identifying duplicates for "${fileName}" (${fileSize} bytes) owned by ${userId}`);

        // 2. Aggregate all potential matches across both collections
        // We look for:
        // - Specific documentId (matches exact record)
        // - Fingerprint match (Name + Size + User)
        const queries = [
            db.collection('files').doc(documentId).get(),
            db.collection('documents').doc(documentId).get(),
            db.collection('files').where('userId', '==', userId).where('fileName', '==', fileName).where('fileSize', '==', fileSize).get(),
            db.collection('documents').where('userId', '==', userId).where('fileName', '==', fileName).where('fileSize', '==', fileSize).get()
        ];

        // Handle property name variations in query (name vs fileName)
        if (data.name) {
            queries.push(db.collection('files').where('userId', '==', userId).where('name', '==', data.name).where('fileSize', '==', fileSize).get());
            queries.push(db.collection('documents').where('userId', '==', userId).where('name', '==', data.name).where('fileSize', '==', fileSize).get());
        }

        const snapshots = await Promise.all(queries);
        const batch = db.batch();
        let scrubCount = 0;
        const seenRefs = new Set();

        snapshots.forEach(result => {
            if (result.exists) {
                // If it's a single doc snapshot
                const refPath = result.ref.path;
                if (!seenRefs.has(refPath)) {
                    batch.delete(result.ref);
                    seenRefs.add(refPath);
                    scrubCount++;
                }
            } else if (result.docs) {
                // If it's a query snapshot
                result.docs.forEach(doc => {
                    const refPath = doc.ref.path;
                    if (!seenRefs.has(refPath)) {
                        batch.delete(doc.ref);
                        seenRefs.add(refPath);
                        scrubCount++;
                    }
                });
            }
        });

        if (scrubCount > 0) {
            await batch.commit();
            console.log(`✅ Deep Scrub completed. Removed ${scrubCount} record(s) for "${fileName}"`);
        } else {
            // Fallback: Delete original ref just in case
            await docRef.delete();
            console.log(`✅ Document metadata deleted via fallback: ${documentId}`);
        }

    } catch (error) {
        console.error(`❌ Deep Scrub failed for ${documentId}:`, error.message);
        // Last ditch effort: Try deleting the specific ID
        try {
            await db.collection('files').doc(documentId).delete();
            await db.collection('documents').doc(documentId).delete();
        } catch (e) { }
        throw error;
    }
}

/**
 * Get document count for a user
 * @param {string} userId - User ID
 */
async function getUserDocumentCount(userId) {
    const db = getFirestore();
    // Improved: Query both collections and both ownership fields (userId, ownerUserId)
    const [snap1, snap2, snap3, snap4] = await Promise.all([
        db.collection('files').where('userId', '==', userId).get(),
        db.collection('files').where('ownerUserId', '==', userId).get(),
        db.collection('documents').where('userId', '==', userId).get(),
        db.collection('documents').where('ownerUserId', '==', userId).get()
    ]);

    const uniqueDocIds = new Set();
    [snap1, snap2, snap3, snap4].forEach(snap => {
        snap.forEach(doc => uniqueDocIds.add(doc.id));
    });

    return uniqueDocIds.size;
}

/**
 * Get document status from Firestore
 * @param {string} documentId - Document ID
 */
async function getDocumentStatus(documentId) {
    try {
        const { exists, data } = await resolveDoc(documentId);
        if (!exists) return null;
        return data.status;
    } catch (error) {
        console.error(`Error getting document status for ${documentId}:`, error.message);
        return null;
    }
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
/**
 * Get user profile from Firestore by email
 * @param {string} email - User email
 */
async function getUserByEmail(email) {
    try {
        const db = getFirestore();
        const snapshot = await db.collection(USERS_COLLECTION)
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error in getUserByEmail:', error.message);
        return null;
    }
}

module.exports = {
    // User operations
    createOrUpdateUser,
    getUser,
    getUserByEmail,

    // Document operations
    saveDocument,
    updateDocumentStatus,
    updateDocument,
    getUserDocuments,
    getDocument,
    deleteDocument,
    getUserDocumentCount,
    getSubscriptionPlans,
    getDocumentStatus,
    resolveDoc
};
