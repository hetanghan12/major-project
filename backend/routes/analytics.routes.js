const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyFirebaseToken, isAdmin } = require('../middlewares/auth.middleware');

/**
 * ADMIN ANALYTICS ROUTES
 * =======================
 * Protected by Firebase ID Token Verification + Admin Role Check
 */

// Get Dashboard Stats (Total users, files, storage, active users)
router.get('/dashboard', verifyFirebaseToken, isAdmin, analyticsController.getDashboardStats);

// Get Storage Activity (Last 7 Days aggregation)
router.get('/storage-activity', verifyFirebaseToken, isAdmin, analyticsController.getStorageActivity);

// NEW: Unified Admin Dashboard (Highly Optimized)
router.get('/unified', verifyFirebaseToken, isAdmin, analyticsController.getUnifiedDashboard);

// Log AI Usage — requires authentication; userId is taken from verified token
router.post('/ai-usage', verifyFirebaseToken, analyticsController.logAiUsage);

module.exports = router;
