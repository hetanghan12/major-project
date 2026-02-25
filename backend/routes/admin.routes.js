/**
 * Admin Routes
 * ============
 * Defines routes for administrative operations.
 * All routes require Firebase authentication + Admin role.
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();

const { 
    getStats, 
    getUsers, 
    updateUser, 
    deleteUser, 
    getLogs, 
    getSettings, 
    updateSettings,
    getSubscriptions,
    updateSubscription,
    getAIUsage,
    getAnalytics
} = require('../controllers/admin.controller');

const { verifyFirebaseToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/admin.middleware');

// All admin routes require authentication AND admin role
router.use(verifyFirebaseToken);
router.use(isAdmin);

// Dashboard
router.get('/dashboard/stats', getStats);

// Analytics
router.get('/analytics', getAnalytics);

// User Management
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Audit Logs
router.get('/audit-logs', getLogs);

// System Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Subscription Plans
router.get('/subscriptions', getSubscriptions);
router.put('/subscriptions/:planId', updateSubscription);

// AI Usage Metrics
router.get('/ai-usage/metrics', getAIUsage);

module.exports = router;
