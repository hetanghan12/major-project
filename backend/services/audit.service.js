/**
 * Audit Logging Service
 * =====================
 * Records all critical user actions for security and tracking.
 * 
 * Collection: audit_logs
 * 
 * @author CloudSpace
 */

const { getFirestore } = require('../config/firebase.config');
const { v4: uuidv4 } = require('uuid');

const AUDIT_COLLECTION = 'audit_logs';

/**
 * Log a user action
 * 
 * @param {Object} params
 * @param {string} params.userId - Who performed the action
 * @param {string} params.fileId - Target resource ID
 * @param {string} params.action - Action type (e.g., 'edit', 'upload', 'delete', 'share')
 * @param {Object} params.details - Optional metadata (e.g., ip address, old name, new name)
 */
async function recordAuditLog({ userId, fileId, action, details = {} }) {
    try {
        const db = getFirestore();
        const logId = uuidv4();
        
        const logEntry = {
            logId,
            userId,
            fileId,
            action,
            details,
            timestamp: new Date().toISOString()
        };

        await db.collection(AUDIT_COLLECTION).doc(logId).set(logEntry);
        
        console.log(`📝 [Audit] ${action} logged for file ${fileId} by user ${userId}`);
        return logId;
    } catch (error) {
        console.error('❌ Failed to record audit log:', error);
        // We don't throw here to avoid breaking the main request if logging fails
        return null;
    }
}

/**
 * Get audit logs for a specific file (restricted to owner)
 * 
 * @param {string} fileId 
 * @returns {Array} List of audit logs
 */
async function getFileAuditLogs(fileId) {
    const db = getFirestore();
    const snapshot = await db.collection(AUDIT_COLLECTION)
        .where('fileId', '==', fileId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

    return snapshot.docs.map(doc => doc.data());
}

module.exports = {
    recordAuditLog,
    getFileAuditLogs
};
