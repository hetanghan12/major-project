/**
 * MFA Routes
 * ==========
 * Routes for Multi-Factor Authentication management
 * 
 * All routes are protected and require a valid Firebase token.
 * 
 * Endpoints:
 *   GET    /api/auth/mfa/status           - Get MFA enrollment status
 *   DELETE /api/auth/mfa/unenroll/:factorUid - Unenroll a specific MFA factor
 *   GET    /api/auth/mfa/recovery-status  - Get recovery options status
 * 
 * @author CloudAI Team
 */

const express = require('express');
const router = express.Router();
const { getMfaStatus, unenrollMfa, getRecoveryStatus } = require('../controllers/mfa.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// ============================================================================
// All routes require authentication
// ============================================================================
router.use(verifyFirebaseToken);

/**
 * @route   GET /api/auth/mfa/status
 * @desc    Get MFA enrollment status for current user
 * @access  Protected
 * 
 * @returns {Object} { success, mfaEnabled, enrolledFactors }
 */
router.get('/status', getMfaStatus);

/**
 * @route   DELETE /api/auth/mfa/unenroll/:factorUid
 * @desc    Unenroll a specific MFA factor
 * @access  Protected
 * 
 * @param   {string} factorUid - The UID of the factor to remove
 * @returns {Object} { success, message }
 */
router.delete('/unenroll/:factorUid', unenrollMfa);

/**
 * @route   GET /api/auth/mfa/recovery-status
 * @desc    Get user's recovery options status
 * @access  Protected
 * 
 * @returns {Object} { success, recoveryOptions, recommendation }
 */
router.get('/recovery-status', getRecoveryStatus);

module.exports = router;
