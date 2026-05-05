const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyFirebaseToken, isAdmin } = require('../middlewares/auth.middleware');

// Apply auth and admin check to ALL admin routes
router.use(verifyFirebaseToken);
router.use(isAdmin);

// 1. Dashboard & Analytics
router.get('/dashboard-data', adminController.getUnifiedDashboard);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// 2. User Management
router.get('/users', adminController.getUsers);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/:userId/unlock', adminController.unlockUser);

// 3. Application Config & Auditing
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// 4. Monetization & Usage
router.get('/subscriptions', adminController.getSubscriptions);
router.put('/subscriptions/:planId', adminController.updateSubscription);
router.get('/ai-usage/metrics', adminController.getAiUsageMetrics);

// 5. Admin Notifications
router.get('/notifications', adminController.getNotifications);
router.post('/notifications/read', adminController.markNotificationsRead);

// 5. One-time seeding of dashboard_stats from existing data
router.post('/seed-stats', async (req, res) => {
    try {
        const { seedDashboardStats } = require('../services/dashboard-stats.service');
        const result = await seedDashboardStats();
        res.json({ success: true, message: 'Dashboard stats seeded', data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;
