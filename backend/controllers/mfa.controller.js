/**
 * MFA Controller
 * ==============
 * Handles Multi-Factor Authentication operations with TOTP (Google Authenticator)
 * 
 * This controller provides backend support for:
 * - Checking MFA enrollment status
 * - Unenrolling MFA factors (admin operation)
 * 
 * NOTE: The actual TOTP enrollment and verification happens on the frontend
 * using Firebase Auth SDK, which handles the cryptographic operations.
 * The backend only provides status checking and admin operations.
 * 
 * @author CloudAI Team
 */

const { getAuth } = require('../config/firebase.config');

/**
 * Get MFA enrollment status for current user
 * 
 * @route GET /api/auth/mfa/status
 * @access Protected (requires Firebase token)
 * 
 * @returns {Object} MFA status and enrolled factors
 */
const getMfaStatus = async (req, res) => {
    try {
        const auth = getAuth();
        const { uid } = req.user;

        // Get user record from Firebase Admin
        const userRecord = await auth.getUser(uid);

        // Check if user has TOTP enrolled
        const enrolledFactors = userRecord.multiFactor?.enrolledFactors || [];
        const totpEnrolled = enrolledFactors.some(
            factor => factor.factorId === 'totp'
        );

        console.log(`📱 MFA Status for ${uid}: ${totpEnrolled ? 'ENABLED' : 'DISABLED'}`);

        res.json({
            success: true,
            mfaEnabled: totpEnrolled,
            enrolledFactors: enrolledFactors.map(f => ({
                uid: f.uid,
                displayName: f.displayName || 'Authenticator App',
                factorId: f.factorId,
                enrollmentTime: f.enrollmentTime
            }))
        });
    } catch (error) {
        console.error('❌ Error getting MFA status:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get MFA status',
            error: error.message
        });
    }
};

/**
 * Unenroll MFA for a user (Admin operation)
 * 
 * This allows removing an MFA factor from the backend.
 * Useful for account recovery scenarios.
 * 
 * @route DELETE /api/auth/mfa/unenroll/:factorUid
 * @access Protected (requires Firebase token)
 * 
 * @param {string} factorUid - The UID of the MFA factor to remove
 */
const unenrollMfa = async (req, res) => {
    try {
        const auth = getAuth();
        const { uid } = req.user;
        const { factorUid } = req.params;

        // Get current user record
        const userRecord = await auth.getUser(uid);

        // Verify the factor exists and belongs to this user
        const enrolledFactors = userRecord.multiFactor?.enrolledFactors || [];
        const factor = enrolledFactors.find(f => f.uid === factorUid);

        if (!factor) {
            return res.status(404).json({
                success: false,
                message: 'MFA factor not found'
            });
        }

        // Remove the MFA factor using Firebase Admin
        // Filter out the factor to be removed
        const remainingFactors = enrolledFactors.filter(f => f.uid !== factorUid);

        await auth.updateUser(uid, {
            multiFactor: {
                enrolledFactors: remainingFactors
            }
        });

        console.log(`🗑️ MFA factor ${factorUid} removed for user ${uid}`);

        res.json({
            success: true,
            message: 'MFA factor removed successfully',
            remainingFactors: remainingFactors.length
        });
    } catch (error) {
        console.error('❌ Error unenrolling MFA:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to remove MFA factor',
            error: error.message
        });
    }
};

/**
 * Get user's MFA recovery options status
 * 
 * @route GET /api/auth/mfa/recovery-status
 * @access Protected
 */
const getRecoveryStatus = async (req, res) => {
    try {
        const auth = getAuth();
        const { uid } = req.user;

        const userRecord = await auth.getUser(uid);

        // Check various recovery options
        const hasEmail = !!userRecord.email;
        const emailVerified = userRecord.emailVerified;
        const hasPhone = !!userRecord.phoneNumber;

        res.json({
            success: true,
            recoveryOptions: {
                email: hasEmail,
                emailVerified: emailVerified,
                phone: hasPhone
            },
            recommendation: !emailVerified ?
                'Verify your email to enable account recovery' :
                'Your account has recovery options configured'
        });
    } catch (error) {
        console.error('❌ Error getting recovery status:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to get recovery status',
            error: error.message
        });
    }
};

module.exports = {
    getMfaStatus,
    unenrollMfa,
    getRecoveryStatus
};
