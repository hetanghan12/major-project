/**
 * Share Service
 * ==============
 * Handles all Firestore operations for the 'shares' collection.
 * 
 * SECURITY:
 * - Only owners can create/manage shares
 * - Access checks traverse folder hierarchy for inherited permissions
 * - Expired and revoked shares are denied immediately
 * 
 * @author CloudSpace
 */

const { getFirestore } = require('../config/firebase.config');
const { getAuth } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

const SHARES_COLLECTION = 'shares';
const DOCUMENTS_COLLECTION = 'documents';
const USERS_COLLECTION = 'users';

// Maximum folder depth for inherited permission traversal
const MAX_FOLDER_DEPTH = 10;

// =============================================================================
// SHARE CRUD
// =============================================================================

/**
 * Create one or more shares for a resource
 * @param {string} ownerUserId - UID of the file owner
 * @param {string} ownerEmail - Email of the file owner
 * @param {string} resourceId - documentId of the file/folder
 * @param {Array} recipients - [{email, permission}]
 * @param {string|null} message - Optional message
 * @returns {Array} Created share objects with status
 */
async function createShares(ownerUserId, ownerEmail, resourceId, recipients, message = null) {
    const db = getFirestore();

    // 1. Verify the resource exists and belongs to the owner
    const docRef = await db.collection(DOCUMENTS_COLLECTION).doc(resourceId).get();
    if (!docRef.exists) {
        throw { status: 404, message: 'Resource not found' };
    }

    const doc = docRef.data();
    if (doc.userId !== ownerUserId) {
        throw { status: 403, message: 'Only the owner can share this resource' };
    }

    const resourceType = doc.isFolder ? 'folder' : 'file';
    const results = [];

    for (const recipient of recipients) {
        const email = recipient.email.toLowerCase().trim();
        const permission = recipient.permission || 'view';

        // 2. Validate permission
        if (!['view', 'edit', 'download'].includes(permission)) {
            results.push({ email, error: 'Invalid permission', status: 'failed' });
            continue;
        }

        // 3. Prevent self-sharing
        if (email === ownerEmail.toLowerCase()) {
            results.push({ email, error: 'Cannot share with yourself', status: 'failed' });
            continue;
        }

        // 4. Check for duplicate active share
        const existingShare = await db.collection(SHARES_COLLECTION)
            .where('resourceId', '==', resourceId)
            .where('recipientEmail', '==', email)
            .where('status', 'in', ['active', 'pending'])
            .limit(1)
            .get();

        if (!existingShare.empty) {
            results.push({ email, error: 'Already shared with this user', status: 'duplicate' });
            continue;
        }

        // 5. Look up recipient in Firebase Auth
        let recipientUserId = null;
        let shareStatus = 'pending';
        try {
            const auth = getAuth();
            const userRecord = await auth.getUserByEmail(email);
            recipientUserId = userRecord.uid;
            shareStatus = 'active';
        } catch (err) {
            // User not found → pending share
            recipientUserId = null;
            shareStatus = 'pending';
        }

        // 6. Create the share document
        const shareId = uuidv4();

        // Calculate expiration: 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const shareData = {
            shareId,
            resourceId,
            resourceType,
            ownerUserId,
            recipientEmail: email,
            recipientUserId,
            permission,
            status: shareStatus,
            message: message || null,
            sharedAt: new Date().toISOString(),
            revokedAt: null,
            expiresAt: expiresAt.toISOString(),
            lastAccessedAt: null
        };

        await db.collection(SHARES_COLLECTION).doc(shareId).set(shareData);
        console.log(`✅ Share created: ${resourceType} "${doc.fileName}" → ${email} (${shareStatus})`);

        results.push({
            ...shareData,
            fileName: doc.fileName,
            status: shareStatus
        });
    }

    return results;
}

/**
 * Get all shares where the user is the recipient (Shared With Me)
 * @param {string} userId - Recipient's Firebase UID
 * @returns {Array} Share objects enriched with file info
 */
async function getSharedWithMe(userId) {
    const db = getFirestore();

    // Optimized with limit(20) as per platform requirements
    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('recipientUserId', '==', userId)
        .where('status', '==', 'active')
        .limit(20)
        .get();

    if (snapshot.empty) return [];

    const shares = [];
    for (const shareDoc of snapshot.docs) {
        try {
            const share = shareDoc.data();

            // Filter status in-memory (avoids composite index)
            if (share.status !== 'active') continue;

            // Check expiration
            if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
                await shareDoc.ref.update({ status: 'revoked', revokedAt: new Date().toISOString() });
                continue;
            }

            // Safeguard against missing resourceId or ownerUserId
            if (!share.resourceId) continue;
            if (!share.ownerUserId) continue;

            // Enrich with document info
            const docSnap = await db.collection(DOCUMENTS_COLLECTION).doc(String(share.resourceId)).get();
            if (!docSnap.exists || docSnap.data().isTrashed) continue;

            const docData = docSnap.data();

            // Get owner info
            const ownerSnap = await db.collection(USERS_COLLECTION).doc(String(share.ownerUserId)).get();
            const ownerData = ownerSnap.exists ? ownerSnap.data() : {};

            shares.push({
                ...share,
                fileName: docData.fileName,
                fileType: docData.fileType,
                fileSize: docData.fileSize,
                thumbnailUrl: docData.thumbnailUrl || docData.previewUrl || null,
                thumbnailStatus: docData.thumbnailStatus || 'processing',
                isFolder: docData.isFolder || false,
                ownerName: ownerData.displayName || ownerData.email || 'Unknown',
                ownerEmail: ownerData.email || null
            });
        } catch (enrichError) {
            console.error('[ShareService] Error enriching shared-with-me doc:', enrichError.message);
            continue;
        }
    }

    // Sort in-memory to bypass Firebase composite index requirements
    shares.sort((a, b) => new Date(b.sharedAt || 0) - new Date(a.sharedAt || 0));

    return shares;
}

/**
 * Get all shares created by the user (Shared By Me)
 * @param {string} userId - Owner's Firebase UID
 * @returns {Array} Share objects grouped by resource
 */
async function getSharedByMe(userId) {
    const db = getFirestore();

    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('ownerUserId', '==', userId)
        .limit(20)
        .get();

    if (snapshot.empty) return [];

    // Group by resourceId
    const grouped = {};
    for (const shareDoc of snapshot.docs) {
        try {
            const share = shareDoc.data();

            // Safeguard against missing resourceId
            if (!share.resourceId) continue;

            if (!grouped[share.resourceId]) {
                // Get document info
                const docSnap = await db.collection(DOCUMENTS_COLLECTION).doc(String(share.resourceId)).get();
                const docData = docSnap.exists ? docSnap.data() : {};

                grouped[share.resourceId] = {
                    resourceId: share.resourceId,
                    resourceType: share.resourceType,
                    fileName: docData.fileName || 'Deleted file',
                    fileType: docData.fileType || null,
                    isFolder: docData.isFolder || false,
                    recipients: []
                };
            }

            grouped[share.resourceId].recipients.push({
                shareId: share.shareId,
                recipientEmail: share.recipientEmail,
                permission: share.permission,
                status: share.status,
                sharedAt: share.sharedAt,
                revokedAt: share.revokedAt
            });
        } catch (enrichError) {
            console.error('[ShareService] Error enriching shared-by-me doc:', enrichError.message);
            continue;
        }
    }

    const groups = Object.values(grouped);

    // Sort recipients within each group by sharedAt descending
    groups.forEach(group => {
        group.recipients.sort((a, b) => new Date(b.sharedAt || 0) - new Date(a.sharedAt || 0));
    });

    // Sort groups themselves by the most recently shared recipient
    groups.sort((a, b) => {
        const timeA = a.recipients.length > 0 ? new Date(a.recipients[0].sharedAt || 0) : 0;
        const timeB = b.recipients.length > 0 ? new Date(b.recipients[0].sharedAt || 0) : 0;
        return timeB - timeA;
    });

    return groups;
}

/**
 * Get all shares for a specific resource
 * @param {string} resourceId - documentId
 * @param {string} ownerUserId - Must be the owner
 * @returns {Array} Share objects
 */
async function getSharesForResource(resourceId, ownerUserId) {
    const db = getFirestore();

    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('resourceId', '==', resourceId)
        .where('ownerUserId', '==', ownerUserId)
        .get();

    return snapshot.docs.map(doc => doc.data());
}

/**
 * Update permission on a share
 * @param {string} shareId
 * @param {string} ownerUserId - Must be the owner
 * @param {string} newPermission - 'view' | 'edit' | 'download'
 */
async function updateSharePermission(shareId, ownerUserId, newPermission) {
    const db = getFirestore();
    const shareRef = db.collection(SHARES_COLLECTION).doc(shareId);
    const shareSnap = await shareRef.get();

    if (!shareSnap.exists) {
        throw { status: 404, message: 'Share not found' };
    }

    const share = shareSnap.data();
    if (share.ownerUserId !== ownerUserId) {
        throw { status: 403, message: 'Only the owner can change permissions' };
    }

    if (!['view', 'edit', 'download'].includes(newPermission)) {
        throw { status: 400, message: 'Invalid permission' };
    }

    await shareRef.update({
        permission: newPermission,
        updatedAt: new Date().toISOString()
    });

    console.log(`✅ Share permission updated: ${shareId} → ${newPermission}`);
    return { ...share, permission: newPermission };
}

/**
 * Revoke a specific share
 * @param {string} shareId
 * @param {string} ownerUserId - Must be the owner
 */
async function revokeShare(shareId, ownerUserId) {
    const db = getFirestore();
    const shareRef = db.collection(SHARES_COLLECTION).doc(shareId);
    const shareSnap = await shareRef.get();

    if (!shareSnap.exists) {
        throw { status: 404, message: 'Share not found' };
    }

    const share = shareSnap.data();
    if (share.ownerUserId !== ownerUserId) {
        throw { status: 403, message: 'Only the owner can revoke shares' };
    }

    await shareRef.update({
        status: 'revoked',
        revokedAt: new Date().toISOString()
    });

    console.log(`✅ Share revoked: ${shareId}`);
    return { ...share, status: 'revoked' };
}

/**
 * Revoke ALL shares for a resource (stop sharing)
 * @param {string} resourceId
 * @param {string} ownerUserId
 */
async function revokeAllSharesForResource(resourceId, ownerUserId) {
    const db = getFirestore();

    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('resourceId', '==', resourceId)
        .where('ownerUserId', '==', ownerUserId)
        .where('status', 'in', ['active', 'pending'])
        .get();

    const batch = db.batch();
    const now = new Date().toISOString();

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'revoked', revokedAt: now });
    });

    await batch.commit();
    console.log(`✅ All shares revoked for resource: ${resourceId} (${snapshot.size} shares)`);
    return { revokedCount: snapshot.size };
}

// =============================================================================
// ACCESS CHECK (the core security function)
// =============================================================================

/**
 * Check if a user has access to a document
 * Checks: 1) ownership, 2) direct share, 3) parent folder inheritance
 * 
 * @param {string} userId - User requesting access
 * @param {string} documentId - Document to access
 * @param {string|null} requiredPermission - null = any access, or 'view'|'edit'|'download'
 * @returns {{ allowed: boolean, reason: string, permission: string|null, isOwner: boolean }}
 */
async function checkAccess(userId, documentId, requiredPermission = null) {
    const db = getFirestore();

    // 1. Get the document
    const docSnap = await db.collection(DOCUMENTS_COLLECTION).doc(documentId).get();
    if (!docSnap.exists) {
        return { allowed: false, reason: 'Document not found', permission: null, isOwner: false };
    }

    const doc = docSnap.data();

    // 2. Owner always has full access
    if (doc.userId === userId) {
        return { allowed: true, reason: 'owner', permission: 'owner', isOwner: true };
    }

    // 3. Check direct share
    const directShare = await db.collection(SHARES_COLLECTION)
        .where('resourceId', '==', documentId)
        .where('recipientUserId', '==', userId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

    if (!directShare.empty) {
        const share = directShare.docs[0].data();
        // Check expiration
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
            // Auto-revoke
            await directShare.docs[0].ref.update({ status: 'revoked', revokedAt: new Date().toISOString() });
        } else {
            // Check required permission
            if (requiredPermission && !hasPermission(share.permission, requiredPermission)) {
                return { allowed: false, reason: 'Insufficient permission', permission: share.permission, isOwner: false };
            }
            // Update last accessed
            await directShare.docs[0].ref.update({ lastAccessedAt: new Date().toISOString() });
            return { allowed: true, reason: 'direct_share', permission: share.permission, isOwner: false };
        }
    }

    // 4. Check parent folder inheritance (walk up the tree)
    let parentId = doc.parentFolderId || null;
    let depth = 0;

    while (parentId && depth < MAX_FOLDER_DEPTH) {
        const folderShare = await db.collection(SHARES_COLLECTION)
            .where('resourceId', '==', parentId)
            .where('recipientUserId', '==', userId)
            .where('status', '==', 'active')
            .where('resourceType', '==', 'folder')
            .limit(1)
            .get();

        if (!folderShare.empty) {
            const share = folderShare.docs[0].data();
            // Check expiration
            if (!share.expiresAt || new Date(share.expiresAt) >= new Date()) {
                if (requiredPermission && !hasPermission(share.permission, requiredPermission)) {
                    return { allowed: false, reason: 'Insufficient folder permission', permission: share.permission, isOwner: false };
                }
                return { allowed: true, reason: 'folder_inheritance', permission: share.permission, isOwner: false };
            }
        }

        // Move up to parent
        const parentSnap = await db.collection(DOCUMENTS_COLLECTION).doc(parentId).get();
        if (!parentSnap.exists) break;
        parentId = parentSnap.data().parentFolderId || null;
        depth++;
    }

    // 5. No access
    return { allowed: false, reason: 'No access', permission: null, isOwner: false };
}

/**
 * Check if a given permission satisfies the required permission
 * @param {string} granted - The permission the user has
 * @param {string} required - The permission needed
 * @returns {boolean}
 */
function hasPermission(granted, required) {
    // 'view' is the minimum - all permissions include view
    if (required === 'view') return true;
    // 'edit' requires edit
    if (required === 'edit') return granted === 'edit';
    // 'download' requires download
    if (required === 'download') return granted === 'download';
    return false;
}

// =============================================================================
// PENDING SHARE ACTIVATION
// =============================================================================

/**
 * Activate pending shares when a new user registers
 * @param {string} userId - New user's Firebase UID
 * @param {string} email - New user's email
 * @returns {number} Number of activated shares
 */
async function activatePendingShares(userId, email) {
    const db = getFirestore();
    const normalizedEmail = email.toLowerCase().trim();

    const pendingShares = await db.collection(SHARES_COLLECTION)
        .where('recipientEmail', '==', normalizedEmail)
        .where('status', '==', 'pending')
        .get();

    if (pendingShares.empty) return 0;

    const batch = db.batch();
    pendingShares.docs.forEach(doc => {
        batch.update(doc.ref, {
            recipientUserId: userId,
            status: 'active',
            activatedAt: new Date().toISOString()
        });
    });

    await batch.commit();
    console.log(`✅ Activated ${pendingShares.size} pending shares for ${email}`);
    return pendingShares.size;
}

// =============================================================================
// CLEANUP HELPERS
// =============================================================================

/**
 * Revoke all shares when a document is permanently deleted
 * @param {string} resourceId
 */
async function revokeSharesOnDelete(resourceId) {
    const db = getFirestore();

    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('resourceId', '==', resourceId)
        .where('status', 'in', ['active', 'pending'])
        .get();

    if (snapshot.empty) return;

    const batch = db.batch();
    const now = new Date().toISOString();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { status: 'revoked', revokedAt: now });
    });

    await batch.commit();
    console.log(`🗑️ Revoked ${snapshot.size} shares for deleted resource: ${resourceId}`);
}

/**
 * For AI Assistant: Get all documents shared with a user, grouped by owner.
 * Crucial for configuring Pinecone multi-namespace searching.
 *
 * @param {string} userId - Requesting user's ID
 * @returns {Array} Array of { ownerId: string, documentIds: string[] }
 */
async function getAccessibleNamespacesForAI(userId) {
    const db = getFirestore();
    const snapshot = await db.collection(SHARES_COLLECTION)
        .where('recipientUserId', '==', userId)
        .where('status', '==', 'active')
        .get();

    if (snapshot.empty) return [];

    const ownerMap = {};

    snapshot.docs.forEach(doc => {
        const share = doc.data();
        if (share.expiresAt && new Date(share.expiresAt) < new Date()) return;

        if (!ownerMap[share.ownerUserId]) {
            ownerMap[share.ownerUserId] = { directFileIds: new Set(), folderIds: new Set() };
        }

        if (share.resourceType === 'folder') {
            ownerMap[share.ownerUserId].folderIds.add(share.resourceId);
        } else {
            ownerMap[share.ownerUserId].directFileIds.add(share.resourceId);
        }
    });

    const results = [];

    for (const [ownerId, data] of Object.entries(ownerMap)) {
        const documentIds = new Set(data.directFileIds);

        if (data.folderIds.size > 0) {
            const docsSnap = await db.collection(DOCUMENTS_COLLECTION)
                .where('userId', '==', ownerId)
                .get();

            const allDocs = [];
            docsSnap.docs.forEach(d => {
                const docData = d.data();
                if (!docData.isTrashed) {
                    allDocs.push({ id: d.id, parentFolderId: docData.parentFolderId || null });
                }
            });

            const childrenMap = {};
            allDocs.forEach(d => {
                const pid = d.parentFolderId || 'root';
                if (!childrenMap[pid]) childrenMap[pid] = [];
                childrenMap[pid].push(d.id);
            });

            for (const folderId of data.folderIds) {
                documentIds.add(folderId);
                const queue = [folderId];
                while (queue.length > 0) {
                    const currentId = queue.shift();
                    const children = childrenMap[currentId] || [];
                    for (const childId of children) {
                        documentIds.add(childId);
                        queue.push(childId);
                    }
                }
            }
        }

        if (documentIds.size > 0) {
            results.push({
                ownerId,
                documentIds: Array.from(documentIds)
            });
        }
    }

    return results;
}

module.exports = {
    createShares,
    getSharedWithMe,
    getSharedByMe,
    getSharesForResource,
    updateSharePermission,
    revokeShare,
    revokeAllSharesForResource,
    checkAccess,
    hasPermission,
    activatePendingShares,
    revokeSharesOnDelete,
    getAccessibleNamespacesForAI
};
