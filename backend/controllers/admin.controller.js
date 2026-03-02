/**
 * Admin Controller
 * ================
 * Handles admin-specific API requests.
 * 
 * @author College Project
 */

const adminService = require('../services/admin.service');
const { asyncHandler, ApiError } = require('../middlewares/error.middleware');
const { getFirestore } = require('../config/firebase.config');

/**
 * Get Dashboard Statistics
 * GET /api/admin/dashboard/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.json({
        success: true,
        stats
    });
});

/**
 * Get All Users
 * GET /api/admin/users
 */
const getUsers = asyncHandler(async (req, res) => {
    const { role, status } = req.query;
    const users = await adminService.getAllUsers({ role, status });
    res.json({
        success: true,
        users
    });
});

/**
 * Update User Role/Status
 * PUT /api/admin/users/:userId
 */
const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role, status, displayName } = req.body;

    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    const updateData = {
        updatedAt: new Date().toISOString()
    };

    if (role)        updateData.role = role;
    if (status)      updateData.status = status;
    if (displayName) updateData.displayName = displayName;

    // Use set+merge so it works even if the Firestore doc doesn't exist yet
    // (user may exist in Firebase Auth but not yet synced to Firestore)
    await userRef.set(updateData, { merge: true });

    // Log the action
    await adminService.logAuditAction({
        event: 'USER_UPDATE',
        user: req.user.email,
        userId: req.user.uid,
        ipAddress: req.ip,
        details: { targetUserId: userId, updates: updateData }
    });

    res.json({
        success: true,
        message: 'User updated successfully'
    });
});

/**
 * Delete User
 * DELETE /api/admin/users/:userId
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { getAuth } = require('../config/firebase.config');
    const db = getFirestore();

    const errors = [];

    // 1. Delete from Firebase Authentication (source of truth)
    try {
        await getAuth().deleteUser(userId);
        console.log(`✅ Deleted Firebase Auth user: ${userId}`);
    } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
            console.warn(`⚠️ Firebase Auth user not found (${userId}), skipping Auth delete`);
        } else {
            errors.push(`Auth delete failed: ${authErr.message}`);
            console.error(`❌ Firebase Auth delete error:`, authErr.message);
        }
    }

    // 2. Delete Firestore user profile
    try {
        await db.collection('users').doc(userId).delete();
        console.log(`✅ Deleted Firestore user doc: ${userId}`);
    } catch (fsErr) {
        errors.push(`Firestore delete failed: ${fsErr.message}`);
        console.error(`❌ Firestore delete error:`, fsErr.message);
    }

    // 3. Delete login_locks if any
    try {
        // Get email first if possible to clear lockout by email
        const locksSnap = await db.collection('login_locks').get();
        const batch = db.batch();
        locksSnap.forEach(doc => batch.delete(doc.ref));
        // (we'll just leave locks for now — they expire naturally)
    } catch (_) {}

    if (errors.length > 0) {
        throw new ApiError(500, `Partial delete: ${errors.join('; ')}`);
    }

    // Log the action
    await adminService.logAuditAction({
        event: 'USER_DELETE',
        user: req.user.email,
        userId: req.user.uid,
        ipAddress: req.ip,
        details: { targetUserId: userId }
    });

    res.json({
        success: true,
        message: 'User deleted successfully from Auth and Firestore'
    });
});

/**
 * Unlock a user manually
 * POST /api/admin/users/:userId/unlock
 */
const unlockUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { getAuth } = require('../config/firebase.config');
    const db = getFirestore();

    // Try to get email from Firestore first
    let email = null;
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        email = userDoc.data().email;
    } else {
        // Fallback: get from Firebase Auth
        try {
            const authUser = await getAuth().getUser(userId);
            email = authUser.email;
        } catch(e) {
            throw new ApiError(404, 'User not found in Auth or Firestore');
        }
    }

    await adminService.resetLoginFailures(email);

    // Log the action
    await adminService.logAuditAction({
        event: 'USER_UNLOCK',
        user: req.user.email,
        userId: req.user.uid,
        ipAddress: req.ip,
        details: { targetUserId: userId, targetEmail: email }
    });

    res.json({
        success: true,
        message: `User ${email} has been unlocked successfully`
    });
});

/**
 * Get Audit Logs
 * GET /api/admin/audit-logs
 */
const getLogs = asyncHandler(async (req, res) => {
    const logs = await adminService.getAuditLogs();
    res.json({
        success: true,
        logs
    });
});

/**
 * Get System Settings
 * GET /api/admin/settings
 */
const getSettings = asyncHandler(async (req, res) => {
    const settings = await adminService.getSettings();
    res.json({
        success: true,
        settings
    });
});

/**
 * Update System Settings
 * PUT /api/admin/settings
 */
const updateSettings = asyncHandler(async (req, res) => {
    const settings = await adminService.updateSettings(req.body);

    // Log the action
    await adminService.logAuditAction({
        event: 'SETTINGS_UPDATE',
        user: req.user.email,
        userId: req.user.uid,
        ipAddress: req.ip,
        details: { settings }
    });

    res.json({
        success: true,
        message: 'Settings updated successfully',
        settings
    });
});

/**
 * Get Subscription Plans
 * GET /api/admin/subscriptions
 */
const getSubscriptions = asyncHandler(async (req, res) => {
    const plans = await adminService.getSubscriptionPlans();
    res.json({
        success: true,
        plans
    });
});

/**
 * Update Subscription Plan
 * PUT /api/admin/subscriptions/:planId
 */
const updateSubscription = asyncHandler(async (req, res) => {
    const { planId } = req.params;
    const { name, description, price, features, isPopular } = req.body;

    const db = getFirestore();
    const planRef = db.collection('subscription_plans').doc(planId);

    const updateData = {
        name,
        description,
        price: parseFloat(price) || 0,
        features: features || [],
        isPopular: !!isPopular,
        updatedAt: new Date().toISOString()
    };

    await planRef.set(updateData, { merge: true });

    res.json({
        success: true,
        message: 'Plan updated successfully',
        plan: { id: planId, ...updateData }
    });
});

/**
 * Get Detailed Analytics
 * GET /api/admin/analytics
 */
const getAnalytics = asyncHandler(async (req, res) => {
    const analytics = await adminService.getAnalyticsStats();
    res.json({
        success: true,
        analytics
    });
});

/**
 * Get AI Usage Metrics
 * GET /api/admin/ai-usage/metrics
 */
const getAIUsage = asyncHandler(async (req, res) => {
    const metrics = await adminService.getAIUsageMetrics();
    res.json({
        success: true,
        metrics
    });
});

module.exports = {
    getStats,
    getUsers,
    updateUser,
    deleteUser,
    unlockUser,
    getLogs,
    getSettings,
    updateSettings,
    getSubscriptions,
    updateSubscription,
    getAIUsage,
    getAnalytics
};
