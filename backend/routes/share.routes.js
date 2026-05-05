/**
 * Share Routes
 * ==============
 * REST API endpoints for file/folder sharing.
 * 
 * All routes require Firebase authentication.
 * 
 * Endpoints:
 *   POST   /api/secure/shares              - Create share(s)
 *   GET    /api/secure/shares/with-me       - Files shared with the user
 *   GET    /api/secure/shares/by-me         - Files the user shared
 *   GET    /api/secure/shares/resource/:id  - All shares for a resource
 *   PATCH  /api/secure/shares/:id/permission - Change permission
 *   PATCH  /api/secure/shares/:id/revoke    - Revoke a share
 *   DELETE /api/secure/shares/resource/:id  - Stop sharing (revoke all)
 * 
 * @author CloudSpace
 */

const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const {
    createShares,
    getSharedWithMe,
    getSharedByMe,
    getSharesForResource,
    updateSharePermission,
    revokeShare,
    revokeAllSharesForResource
} = require('../services/share.service');
const { checkSharePermission } = require('../services/storage-quota.service');

// =============================================================================
// CREATE SHARES
// =============================================================================

/**
 * POST /api/secure/shares
 * Create one or more shares for a file/folder
 * 
 * Body: {
 *   resourceId: string,
 *   recipients: [{ email: string, permission: 'view'|'download' }],
 *   message?: string
 * }
 */
router.post('/', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const userEmail = req.user.email;
        const { resourceId, recipients, message } = req.body;

        // Validation
        if (!resourceId) {
            return res.status(400).json({ success: false, message: 'resourceId is required' });
        }
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one recipient is required' });
        }
        if (recipients.length > 20) {
            return res.status(400).json({ success: false, message: 'Maximum 20 recipients per request' });
        }

        // Validate each recipient has an email and allowed permission
        for (const r of recipients) {
            if (!r.email || typeof r.email !== 'string' || !r.email.includes('@')) {
                return res.status(400).json({ success: false, message: `Invalid email: ${r.email}` });
            }
            
            // Plan-based permission validation
            const permissionCheck = await checkSharePermission(userId, r.permission || 'view');
            if (!permissionCheck.allowed) {
                return res.status(403).json({ 
                    success: false, 
                    message: permissionCheck.message 
                });
            }
        }

        const results = await createShares(userId, userEmail, resourceId, recipients, message);

        res.status(201).json({
            success: true,
            shares: results,
            summary: {
                created: results.filter(r => r.status === 'active' || r.status === 'pending').length,
                active: results.filter(r => r.status === 'active').length,
                pending: results.filter(r => r.status === 'pending').length,
                duplicates: results.filter(r => r.status === 'duplicate').length,
                failed: results.filter(r => r.status === 'failed').length
            }
        });
    } catch (error) {
        console.error('Share creation error:', error);
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Failed to create shares' });
    }
});

// =============================================================================
// SHARED WITH ME
// =============================================================================

/**
 * GET /api/secure/shares/with-me
 * List all files/folders shared with the authenticated user
 */
router.get('/with-me', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const shares = await getSharedWithMe(userId);

        res.json({
            success: true,
            shares,
            count: shares.length
        });
    } catch (error) {
        console.error('Shared with me error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shared files' });
    }
});

// =============================================================================
// SHARED BY ME
// =============================================================================

/**
 * GET /api/secure/shares/by-me
 * List all shares created by the authenticated user, grouped by resource
 */
router.get('/by-me', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const groups = await getSharedByMe(userId);

        res.json({
            success: true,
            resources: groups,
            count: groups.length
        });
    } catch (error) {
        console.error('Shared by me error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your shares' });
    }
});

// =============================================================================
// SHARES FOR A SPECIFIC RESOURCE
// =============================================================================

/**
 * GET /api/secure/shares/resource/:resourceId
 * List all shares for a specific file/folder (owner only)
 */
router.get('/resource/:resourceId', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { resourceId } = req.params;

        const shares = await getSharesForResource(resourceId, userId);

        res.json({
            success: true,
            shares,
            count: shares.length
        });
    } catch (error) {
        console.error('Get resource shares error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch shares' });
    }
});

// =============================================================================
// UPDATE PERMISSION
// =============================================================================

/**
 * PATCH /api/secure/shares/:shareId/permission
 * Change the permission on an existing share (owner only)
 * 
 * Body: { permission: 'view'|'download' }
 */
router.patch('/:shareId/permission', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { shareId } = req.params;
        const { permission } = req.body;

        if (!permission) {
            return res.status(400).json({ success: false, message: 'permission is required' });
        }

        // Plan-based permission validation
        const permissionCheck = await checkSharePermission(userId, permission);
        if (!permissionCheck.allowed) {
            return res.status(403).json({ 
                success: false, 
                message: permissionCheck.message 
            });
        }

        const updated = await updateSharePermission(shareId, userId, permission);

        res.json({
            success: true,
            share: updated
        });
    } catch (error) {
        console.error('Update permission error:', error);
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Failed to update permission' });
    }
});

// =============================================================================
// REVOKE SHARE
// =============================================================================

/**
 * PATCH /api/secure/shares/:shareId/revoke
 * Revoke a specific share (owner only)
 */
router.patch('/:shareId/revoke', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { shareId } = req.params;

        const revoked = await revokeShare(shareId, userId);

        res.json({
            success: true,
            share: revoked
        });
    } catch (error) {
        console.error('Revoke share error:', error);
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message || 'Failed to revoke share' });
    }
});

// =============================================================================
// STOP SHARING (REVOKE ALL)
// =============================================================================

/**
 * DELETE /api/secure/shares/resource/:resourceId
 * Revoke ALL shares for a resource (owner only)
 */
router.delete('/resource/:resourceId', verifyFirebaseToken, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { resourceId } = req.params;

        const result = await revokeAllSharesForResource(resourceId, userId);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Stop sharing error:', error);
        res.status(500).json({ success: false, message: 'Failed to stop sharing' });
    }
});

module.exports = router;
