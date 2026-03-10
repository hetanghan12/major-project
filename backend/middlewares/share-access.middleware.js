/**
 * Share Access Middleware
 * ========================
 * Middleware to verify document access based on ownership or sharing permissions.
 * 
 * SECURITY:
 * - Checks ownership first (fast path)
 * - Then checks direct share
 * - Then checks parent folder inheritance (depth-limited)
 * - Rejects expired shares
 * 
 * Usage:
 *   router.get('/:id', verifyFirebaseToken, checkDocumentAccess(), handler)
 *   router.get('/:id/download', verifyFirebaseToken, checkDocumentAccess('download'), handler)
 * 
 * @author CloudSpace
 */

const { checkAccess } = require('../services/share.service');

/**
 * Creates middleware that checks document access.
 * 
 * @param {string|null} requiredPermission - null for any access, 
 *        or 'view', 'edit', 'download' for specific permission
 * @returns {Function} Express middleware
 */
function checkDocumentAccess(requiredPermission = null) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.uid;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Extract document ID from route params
            const documentId = req.params.id || req.params.documentId;
            if (!documentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Document ID is required'
                });
            }

            // Check access
            const result = await checkAccess(userId, documentId, requiredPermission);

            if (!result.allowed) {
                console.log(`🚫 Access denied: user=${userId}, doc=${documentId}, reason=${result.reason}`);
                return res.status(403).json({
                    success: false,
                    message: result.reason === 'Document not found' ? 'Document not found' : 'Access denied',
                    reason: result.reason
                });
            }

            // Attach access info to request for downstream handlers
            req.accessInfo = {
                isOwner: result.isOwner,
                permission: result.permission,
                reason: result.reason
            };

            console.log(`✅ Access granted: user=${userId}, doc=${documentId}, permission=${result.permission}, via=${result.reason}`);
            next();
        } catch (error) {
            console.error('Access check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Access check failed'
            });
        }
    };
}

module.exports = { checkDocumentAccess };
