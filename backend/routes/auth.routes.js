/**
 * Authentication Routes
 * ======================
 * Defines routes for user authentication.
 * 
 * @author College Project
 */

const express = require('express');
const router = express.Router();

const { verifyToken, getProfile, createTestUser, syncUser, recordFailure, checkLockout } = require('../controllers/auth.controller');
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
 * @desc    Record a failed login attempt
 * @access  Public
 */
router.post('/fail', recordFailure);

/**
 * @route   GET /api/auth/lockout-status/:email
 * @desc    Check if a user is locked out
 * @access  Public
 */
router.get('/lockout-status/:email', checkLockout);

module.exports = router;
