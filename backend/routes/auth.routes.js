/**
 * Authentication Routes
 * ======================
 * Defines routes for user authentication.
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { verifyToken, getProfile, createTestUser, syncUser, failLogin, getLockoutStatus } = require('../controllers/auth.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

const failLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP. Please try again later.'
  }
});

const createTestUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

/**
 * @route POST /api/auth/verify
 * @desc Verify Firebase ID token and return user info
 * @access Protected
 */
router.post('/verify', verifyFirebaseToken, verifyToken);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Protected
 */
router.get('/profile', verifyFirebaseToken, getProfile);

/**
 * @route POST /api/auth/sync
 * @desc Sync user data after login
 * @access Protected
 */
router.post('/sync', verifyFirebaseToken, syncUser);

/**
 * @route POST /api/auth/create-test-user
 * @desc Create default test user for demo/testing
 * @access Public (should be disabled in production)
 *
 * ⚠️ WARNING: This endpoint is for TESTING/DEMO purposes only!
 */
router.post('/create-test-user', createTestUserLimiter, createTestUser);

/**
 * @route POST /api/auth/fail
 * @desc Record failed login attempt, lock if maxAttempts reached
 * @access Public (rate-limited to prevent lockout DoS)
 */
router.post('/fail', failLoginLimiter, failLogin);

/**
 * @route GET /api/auth/lockout-status/:email
 * @desc Return lock status for a given email
 * @access Protected
 */
router.get('/lockout-status/:email', verifyFirebaseToken, getLockoutStatus);

module.exports = router;
