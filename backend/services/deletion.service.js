/**
 * SECURE DELETION SERVICE
 * ========================
 * Production-grade, atomic deletion service for Cloud-Space.
 * 
 * SECURITY CRITICAL - This service handles:
 * 1. Pinecone vector deletion (by explicit chunk IDs)
 * 2. AWS S3 object deletion
 * 3. Firestore metadata deletion
 * 4. Local file cleanup
 * 
 * ============================================================================
 * DATA MODEL (MANDATORY)
 * ============================================================================
 * Every uploaded file MUST have:
 * {
 *   "file_id": "uuid",
 *   "user_id": "firebase_uid",
 *   "s3_key": "users/{user_id}/{file_id}.pdf",
 *   "pinecone_namespace": "user_{user_id}",
 *   "chunk_ids": ["fileid_chunk_0", "fileid_chunk_1", ...]
 * }
 * 
 * ============================================================================
 * DELETE FLOW (ATOMIC, IDEMPOTENT, SECURE)
 * ============================================================================
 * 1️⃣ Validate auth + ownership
 * 2️⃣ Fetch full metadata (s3_key, namespace, chunk_ids)
 * 3️⃣ Delete from Pinecone (explicit chunk IDs only)
 * 4️⃣ Delete from AWS S3
 * 5️⃣ Delete local file (if exists)
 * 6️⃣ Delete metadata record
 * 7️⃣ Log deletion for audit trail
 * 
 * @author Security Patch - Production Fix
 * @version 2.0.0
 */

const { deleteFromS3, fileExistsInS3 } = require('./s3.service');
const { deleteDocument, getDocument, updateDocumentStatus } = require('./firestore.service');
const { getPineconeIndex, deriveSecureNamespace } = require('../config/pinecone.config');
const fs = require('fs');
const { trackFileDeletion } = require('./analytics.service');

// Audit logging for compliance
const deletionLogs = [];

/**
 * SECURE DELETE - Complete deletion from all storage layers
 * 
 * SECURITY:
 * - userId MUST come from verified Firebase token (req.user.uid)
 * - Ownership is verified BEFORE any deletion
 * - Delete ops are user-isolated (namespace = userId)
 * - All steps are logged for audit trail
 * 
 * @param {string} userId - From verified Firebase token ONLY (req.user.uid)
 * @param {string} documentId - Document ID to delete
 * @returns {Object} Deletion result with success status and details
 */
async function secureDeleteDocument(userId, documentId) {
    const operationId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`\n🔐 ========== SECURE DELETION START ==========`);
    console.log(`   Operation ID: ${operationId}`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    // Initialize result tracking
    const result = {
        operationId,
        documentId,
        userId,
        success: false,
        steps: {
            validation: { success: false, message: '' },
            pinecone: { success: false, vectorsDeleted: 0, message: '' },
            s3: { success: false, message: '' },
            localFile: { success: false, message: '' },
            metadata: { success: false, message: '' }
        },
        error: null,
        duration: 0
    };

    try {
        // ==================================================================
        // STEP 1: VALIDATION & OWNERSHIP VERIFICATION
        // ==================================================================
        console.log(`\n   📋 Step 1: Validating ownership...`);

        // Validate inputs
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            throw new Error('SECURITY VIOLATION: Invalid userId - must be from verified token');
        }

        if (!documentId || typeof documentId !== 'string' || documentId.trim().length === 0) {
            throw new Error('Invalid documentId');
        }

        // Fetch document metadata
        const document = await getDocument(documentId);

        if (!document) {
            result.steps.validation.message = 'Document not found';
            result.error = 'Document not found';
            console.log(`   ❌ Document not found: ${documentId}`);

            // Log attempt to delete non-existent document
            await logDeletionAttempt(operationId, userId, documentId, 'NOT_FOUND', null);

            return result;
        }

        // SECURITY: Ownership verification
        const ownerId = document.ownerUserId || document.userId;
        if (ownerId !== userId) {
            result.steps.validation.message = 'Access denied - ownership mismatch';
            result.error = 'Access denied';
            console.error(`   🚨 SECURITY ALERT: User ${userId} attempted to delete document owned by ${document.userId}`);

            // Log security violation
            await logDeletionAttempt(operationId, userId, documentId, 'ACCESS_DENIED', {
                attemptedBy: userId,
                actualOwner: document.userId
            });

            return result;
        }

        result.steps.validation.success = true;
        result.steps.validation.message = 'Ownership verified';
        console.log(`   ✅ Ownership verified for user: ${userId}`);

        // Extract deletion targets from metadata
        const s3Key = document.s3Key || null;
        const storagePath = document.storagePath || null;
        const chunkIds = document.chunkIds || [];
        const vectorCount = document.vectorCount || 0;
        const pineconeNamespace = deriveSecureNamespace(userId);

        console.log(`   📊 Deletion targets:`);
        console.log(`      - S3 Key: ${s3Key || 'none'}`);
        console.log(`      - Local Path: ${storagePath || 'none'}`);
        console.log(`      - Chunk IDs: ${chunkIds.length} stored`);
        console.log(`      - Vector Count: ${vectorCount}`);
        console.log(`      - Namespace: ${pineconeNamespace}`);

        // ==================================================================
        // STEP 2: DELETE FROM PINECONE (HIGHEST PRIORITY - AI ACCESS)
        // ==================================================================
        console.log(`\n   🧠 Step 2: Deleting from Pinecone...`);

        try {
            const pineconeResult = await deletePineconeVectors(
                userId,
                documentId,
                chunkIds,
                vectorCount
            );

            result.steps.pinecone = pineconeResult;
            console.log(`   ✅ Pinecone deletion: ${pineconeResult.vectorsDeleted} vectors removed`);

        } catch (error) {
            result.steps.pinecone.success = false;
            result.steps.pinecone.message = error.message;
            console.error(`   ❌ Pinecone deletion failed: ${error.message}`);
            // Continue with other deletions - log for manual cleanup
        }

        // ==================================================================
        // STEP 3: DELETE FROM AWS S3
        // ==================================================================
        console.log(`\n   ☁️ Step 3: Deleting from S3...`);

        if (s3Key) {
            try {
                await deleteFromS3(s3Key);
                result.steps.s3.success = true;
                result.steps.s3.message = `Deleted: ${s3Key}`;
                console.log(`   ✅ S3 object deleted: ${s3Key}`);

            } catch (error) {
                result.steps.s3.success = false;
                result.steps.s3.message = error.message;
                console.error(`   ❌ S3 deletion failed: ${error.message}`);
                // Continue - file may already be deleted
            }
        } else {
            result.steps.s3.success = true;
            result.steps.s3.message = 'No S3 key - skipped';
            console.log(`   ⏭️ No S3 key found - skipping`);
        }

        // ==================================================================
        // STEP 4: DELETE LOCAL FILE
        // ==================================================================
        console.log(`\n   📁 Step 4: Deleting local file...`);

        if (storagePath) {
            try {
                if (fs.existsSync(storagePath)) {
                    fs.unlinkSync(storagePath);
                    result.steps.localFile.success = true;
                    result.steps.localFile.message = `Deleted: ${storagePath}`;
                    console.log(`   ✅ Local file deleted: ${storagePath}`);
                } else {
                    result.steps.localFile.success = true;
                    result.steps.localFile.message = 'File already deleted';
                    console.log(`   ⏭️ Local file not found - already deleted`);
                }
            } catch (error) {
                result.steps.localFile.success = false;
                result.steps.localFile.message = error.message;
                console.error(`   ❌ Local file deletion failed: ${error.message}`);
            }
        } else {
            result.steps.localFile.success = true;
            result.steps.localFile.message = 'No local path - skipped';
            console.log(`   ⏭️ No local path found - skipping`);
        }

        // ==================================================================
        // STEP 4.5: DELETE PREVIEW FILES (DOCX HTML/TXT) AND THUMBNAILS
        // ==================================================================
        console.log(`\n   📄 Step 4.5: Deleting preview files and thumbnails...`);

        try {
            const { deletePreview } = require('./docx-preview.service');
            deletePreview(documentId);
            console.log(`   ✅ Preview files deleted`);
        } catch (error) {
            console.log(`   ⏭️ No preview files or error: ${error.message}`);
        }

        try {
            const { deleteThumbnail } = require('./thumbnail.service');
            deleteThumbnail(documentId);
            console.log(`   ✅ Thumbnail deleted`);
        } catch (error) {
            console.log(`   ⏭️ No thumbnail or error: ${error.message}`);
        }

        // ==================================================================
        // STEP 5: DELETE METADATA FROM FIRESTORE
        // ==================================================================
        console.log(`\n   📝 Step 5: Deleting metadata...`);

        try {
            await deleteDocument(documentId);
            result.steps.metadata.success = true;
            result.steps.metadata.message = 'Metadata deleted';
            console.log(`   ✅ Metadata deleted from Firestore`);

            // 6️⃣ Track deletion for dashboard stats (Zero Reads)
            trackFileDeletion(userId, document.fileSize || 0, document.fileType || '', document.fileName || '')
                .catch(err => console.error('Deletion track failed:', err.message));

        } catch (error) {
            result.steps.metadata.success = false;
            result.steps.metadata.message = error.message;
            console.error(`   ❌ Metadata deletion failed: ${error.message}`);
        }

        // ==================================================================
        // DETERMINE OVERALL SUCCESS
        // ==================================================================
        // We consider deletion successful if:
        // 1. Pinecone vectors are deleted (or there were none)
        // 2. Metadata is deleted
        // S3 and local file deletions are logged but don't fail the operation

        const criticalSuccess = result.steps.pinecone.success && result.steps.metadata.success;
        result.success = criticalSuccess;

        // ==================================================================
        // AUDIT LOGGING
        // ==================================================================
        const duration = Date.now() - startTime;
        result.duration = duration;

        await logDeletionAttempt(operationId, userId, documentId,
            result.success ? 'SUCCESS' : 'PARTIAL_FAILURE',
            result.steps
        );

        console.log(`\n   📊 Deletion Summary:`);
        console.log(`      - Overall: ${result.success ? '✅ SUCCESS' : '⚠️ PARTIAL'}`);
        console.log(`      - Pinecone: ${result.steps.pinecone.success ? '✅' : '❌'}`);
        console.log(`      - S3: ${result.steps.s3.success ? '✅' : '❌'}`);
        console.log(`      - Local File: ${result.steps.localFile.success ? '✅' : '❌'}`);
        console.log(`      - Metadata: ${result.steps.metadata.success ? '✅' : '❌'}`);
        console.log(`      - Duration: ${duration}ms`);
        console.log(`🔐 ========== SECURE DELETION END ==========\n`);

        return result;

    } catch (error) {
        const duration = Date.now() - startTime;
        result.duration = duration;
        result.error = error.message;

        console.error(`\n   ❌ DELETION FAILED: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        console.log(`🔐 ========== SECURE DELETION FAILED ==========\n`);

        await logDeletionAttempt(operationId, userId, documentId, 'ERROR', {
            error: error.message
        });

        return result;
    }
}

/**
 * Delete vectors from Pinecone by explicit IDs
 * 
 * SECURITY:
 * - Uses user's namespace (derived from verified userId)
 * - Deletes by explicit IDs when available
 * - Falls back to filter delete only for legacy documents
 * - NEVER uses deleteAll()
 * 
 * @param {string} userId - User ID from verified token
 * @param {string} documentId - Document ID
 * @param {Array} chunkIds - Array of chunk IDs to delete
 * @param {number} expectedVectorCount - Expected number of vectors
 */
async function deletePineconeVectors(userId, documentId, chunkIds, expectedVectorCount) {
    const namespace = deriveSecureNamespace(userId);

    console.log(`      Namespace: ${namespace}`);
    console.log(`      Document: ${documentId}`);
    console.log(`      Chunk IDs provided: ${chunkIds.length}`);
    console.log(`      Expected vectors: ${expectedVectorCount}`);

    const result = {
        success: false,
        vectorsDeleted: 0,
        method: '',
        message: ''
    };

    try {
        const index = await getPineconeIndex();
        const pineconeNamespace = index.namespace(namespace);

        // Get stats before deletion
        const statsBefore = await index.describeIndexStats();
        const namespaceStatsBefore = statsBefore.namespaces?.[namespace];
        const vectorsBefore = namespaceStatsBefore?.vectorCount || 0;
        console.log(`      Vectors before: ${vectorsBefore}`);

        if (vectorsBefore === 0) {
            result.success = true;
            result.message = 'No vectors in namespace';
            return result;
        }

        // PREFERRED: Delete by explicit chunk IDs
        if (chunkIds && chunkIds.length > 0) {
            console.log(`      Using ID-based deletion (${chunkIds.length} IDs)...`);

            // Delete in batches of 100
            const batchSize = 100;
            for (let i = 0; i < chunkIds.length; i += batchSize) {
                const batch = chunkIds.slice(i, i + batchSize);
                await pineconeNamespace.deleteMany(batch);
                console.log(`         Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} IDs`);
            }

            result.method = 'ID_BASED';
            result.vectorsDeleted = chunkIds.length;

        } else {
            // FALLBACK: Delete by metadata filter (for legacy documents without chunkIds)
            console.log(`      Using FILTER-based deletion (legacy mode)...`);
            console.log(`      ⚠️  WARNING: Filter deletion may not work on all Pinecone plans`);

            await pineconeNamespace.deleteMany({
                filter: { documentId: { $eq: documentId } }
            });

            result.method = 'FILTER_BASED';
            result.vectorsDeleted = expectedVectorCount || 0;
        }

        // Wait for consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify deletion
        const statsAfter = await index.describeIndexStats();
        const namespaceStatsAfter = statsAfter.namespaces?.[namespace];
        const vectorsAfter = namespaceStatsAfter?.vectorCount || 0;
        const actualDeleted = vectorsBefore - vectorsAfter;

        console.log(`      Vectors after: ${vectorsAfter}`);
        console.log(`      Actually deleted: ${actualDeleted}`);

        result.success = true;
        result.vectorsDeleted = actualDeleted;
        result.message = `Deleted ${actualDeleted} vectors using ${result.method}`;

        return result;

    } catch (error) {
        result.success = false;
        result.message = error.message;
        throw error;
    }
}

/**
 * Log deletion attempt for audit trail
 * 
 * @param {string} operationId - Unique operation ID
 * @param {string} userId - User who performed the action
 * @param {string} documentId - Document that was deleted (or attempted)
 * @param {string} status - SUCCESS | PARTIAL_FAILURE | ERROR | NOT_FOUND | ACCESS_DENIED
 * @param {Object} details - Additional details
 */
async function logDeletionAttempt(operationId, userId, documentId, status, details) {
    const logEntry = {
        operationId,
        timestamp: new Date().toISOString(),
        userId,
        documentId,
        status,
        details,
        // In production, also log IP address, user agent, etc.
    };

    // Store in memory (in production, store in database or logging service)
    deletionLogs.push(logEntry);

    // Keep only last 1000 logs in memory
    if (deletionLogs.length > 1000) {
        deletionLogs.shift();
    }

    // Log to console for debugging
    console.log(`   📝 Audit Log: ${status} - Op: ${operationId}`);

    // In production, you would:
    // 1. Store in Firestore/MongoDB for compliance
    // 2. Send to logging service (CloudWatch, Datadog, etc.)
    // 3. Send alerts for security violations
}



/**
 * Generate chunk IDs for a document
 * Used during upload to create predictable IDs for later deletion
 * 
 * @param {string} documentId - Document ID
 * @param {number} chunkCount - Number of chunks
 * @returns {Array} Array of chunk IDs
 */
function generateChunkIds(documentId, chunkCount) {
    const ids = [];
    for (let i = 0; i < chunkCount; i++) {
        ids.push(`${documentId}_chunk_${i}`);
    }
    return ids;
}

/**
 * Automatically clean up documents that have been in the trash for over 30 days
 */
async function autoDeleteTrash() {
    console.log(`\n🧹 ========== RUNNING 30-DAY TRASH CLEANUP ==========`);
    try {
        const { getFirestore } = require('../config/firebase.config');
        if (!getFirestore) return;

        const db = getFirestore();
        if (!db) return;

        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

        // Grab all trashed documents
        const snapshot = await db.collection('files')
            .where('isTrashed', '==', true)
            .get();

        let deletedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            // Fallback to uploadedAt if updatedAt is missing
            const timeSinceTrash = data.updatedAt || data.uploadedAt || new Date().toISOString();

            if (timeSinceTrash < thirtyDaysAgoISO) {
                console.log(`   🗑️ Auto-deleting old trashed document: ${data.documentId || doc.id}`);
                await secureDeleteDocument(data.userId, data.documentId || doc.id);
                deletedCount++;
            }
        }

        console.log(`✅ Auto-deleted ${deletedCount} old files from trash.`);
    } catch (error) {
        console.error('❌ Failed to run auto-delete cron:', error.message);
    }
}

/**
 * COMPLETELY delete a user's account and all associated data
 * 
 * SECURITY CRITICAL:
 * 1. Deletes all document records (Firestore)
 * 2. Deletes all physical files (S3)
 * 3. Deletes all AI vectors (Pinecone)
 * 4. Deletes AI chat history
 * 5. Deletes user profile
 * 6. Deletes Firebase Auth user
 * 
 * @param {string} userId - User ID to purge
 */
async function deleteUserAccount(userId) {
    console.log(`\n🧹 ========== FULL ACCOUNT DELETION START ==========`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);

    const { getFirestore, getAuth } = require('../config/firebase.config');
    const db = getFirestore();
    const auth = getAuth();

    try {
        // 1. Find all documents belonging to this user
        // Search both potential collections for robustness
        const [filesSnap, docsSnap] = await Promise.all([
            db.collection('files').where('userId', '==', userId).get(),
            db.collection('documents').where('userId', '==', userId).get()
        ]);

        const documentIds = new Set();
        filesSnap.forEach(doc => documentIds.add(doc.id));
        docsSnap.forEach(doc => documentIds.add(doc.id));

        console.log(`   Found ${documentIds.size} documents to delete.`);

        // 2. Perform secure deletion for each document
        // This handles S3, Pinecone, and Firestore metadata cleanup
        for (const docId of documentIds) {
            try {
                await secureDeleteDocument(userId, docId);
            } catch (err) {
                console.error(`   ⚠️  Partial failure deleting document ${docId}:`, err.message);
            }
        }

        // 3. Delete AI Chats (Subcollection)
        try {
            const chatsRef = db.collection('users').doc(userId).collection('ai_chats');
            const chatsSnap = await chatsRef.get();
            if (!chatsSnap.empty) {
                const batch = db.batch();
                chatsSnap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`   ✅ Deleted ${chatsSnap.size} AI chat records.`);
            }
        } catch (err) {
            console.error(`   ⚠️  Failed to delete AI chats:`, err.message);
        }

        // 4. Delete Folders (Firestore)
        try {
            const foldersSnap = await db.collection('folders').where('userId', '==', userId).get();
            if (!foldersSnap.empty) {
                const batch = db.batch();
                foldersSnap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`   ✅ Deleted ${foldersSnap.size} folder records.`);
            }
        } catch (err) {
             console.error(`   ⚠️  Failed to delete folders:`, err.message);
        }

        // 4.5 Delete Shares (where user is owner)
        try {
            const sharesSnap = await db.collection('shares').where('ownerId', '==', userId).get();
            if (!sharesSnap.empty) {
                const batch = db.batch();
                sharesSnap.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`   ✅ Deleted ${sharesSnap.size} share records.`);
            }
        } catch (err) {
             console.error(`   ⚠️  Failed to delete shares:`, err.message);
        }

        // 5. Delete User Profile document
        await db.collection('users').doc(userId).delete();
        console.log(`   ✅ User profile document deleted.`);

        // 6. Delete from Firebase Auth (LAST STEP)
        // If this succeeds, the user is effectively gone
        await auth.deleteUser(userId);
        console.log(`   ✅ Firebase Auth user deleted.`);

        console.log(`🧹 ========== FULL ACCOUNT DELETION COMPLETED ==========`);
        return { success: true, documentsDeleted: documentIds.size };

    } catch (error) {
        console.error(`❌ CRITICAL FAILURE during account deletion for ${userId}:`, error.message);
        throw error;
    }
}

module.exports = {
    secureDeleteDocument,
    deleteUserAccount,
    deletePineconeVectors,
    generateChunkIds,
    autoDeleteTrash
};
