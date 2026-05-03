/**
 * Authentication Routes
 * ======================
 * Defines routes for user authentication.
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();

const { verifyToken, getProfile, createTestUser, syncUser, failLogin, getLockoutStatus } = require('../controllers/auth.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/auth/verify
 * @desc    Verify Firebase ID token and return user info
 * @access  Protected
 */
router.post('/verify', verifyFirebaseToken, verifyToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/profile', verifyFirebaseToken, getProfile);

/**
 * @route   POST /api/auth/sync
 * @desc    Sync user data after login
 * @access  Protected
 */
router.post('/sync', verifyFirebaseToken, syncUser);

/**
 * @route   POST /api/auth/create-test-user
 * @desc    Create default test user for demo/testing
 * @access  Public (should be disabled in production)
 * 
 * ⚠️ WARNING: This endpoint is for TESTING/DEMO purposes only!
 */
router.post('/create-test-user', createTestUser);

/**
 * @route   POST /api/auth/fail
 * @desc    Record failed login attempt, lock if maxAttempts reached
 * @access  Public
 */
router.post('/fail', failLogin);

/**
 * @route   GET /api/auth/lockout-status/:email
 * @desc    Return lock status for a given email
 * @access  Public
 */
router.get('/lockout-status/:email', verifyFirebaseToken, getLockoutStatus);

module.exports = router;
