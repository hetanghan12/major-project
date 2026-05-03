const { getFirestore } = require('../config/firebase.config');
const { checkMfaPermission } = require('../services/storage-quota.service');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

/**
 * Get custom MFA status from Firestore
 */
exports.getMfaStatus = async (req, res) => {
    try {
        const db = getFirestore();
        const { uid } = req.user;
        const docSnap = await db.collection('users').doc(uid).get();

        let mfaEnabled = false;
        if (docSnap.exists) {
            const data = docSnap.data();
            if (data.settings && data.settings.mfaEnabled) {
                mfaEnabled = true;
            }
        }

        res.json({
            success: true,
            mfaEnabled: mfaEnabled,
            enrolledFactors: mfaEnabled ? [{ uid: 'totp_factor', displayName: 'Authenticator App', factorId: 'totp' }] : []
        });

    } catch (error) {
        console.error('❌ Error getting MFA status:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get MFA status' });
    }
};

/**
 * Start Setup (Generate Secret & QR Code)
 */
exports.startSetup = async (req, res) => {
    try {
        const { uid, email } = req.user;

        // Plan-based MFA validation
        const mfaCheck = await checkMfaPermission(uid);
        if (!mfaCheck.allowed) {
            return res.status(403).json({ success: false, message: mfaCheck.message });
        }
        const secret = speakeasy.generateSecret({
            name: `CloudAI Document Vault (${email})`
        });

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            qrCodeUrl: qrCodeUrl,
            secret: secret.base32 // Client temp holds this during verify
        });
    } catch (error) {
        console.error('❌ Error in MFA startSetup:', error.message);
        res.status(500).json({ success: false, message: 'Failed to generate 2FA' });
    }
};

/**
 * Verify Setup and Save to Firestore
 */
exports.verifySetup = async (req, res) => {
    try {
        const { uid } = req.user;

        // Plan-based MFA validation (Double check)
        const mfaCheck = await checkMfaPermission(uid);
        if (!mfaCheck.allowed) {
            return res.status(403).json({ success: false, message: mfaCheck.message });
        }
        const { secret, token } = req.body;

        if (!secret || !token) {
            return res.status(400).json({ success: false, message: 'Secret and token required' });
        }

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            const db = getFirestore();
            await db.collection('users').doc(uid).set({
                settings: {
                    mfaEnabled: true,
                    mfaSecret: secret
                }
            }, { merge: true });

            res.json({ success: true, message: '2FA Enabled!' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('❌ Error in MFA verifySetup:', error.message);
        res.status(500).json({ success: false, message: 'Failed to verify 2FA' });
    }
};

/**
 * Disable MFA
 */
exports.disableMfa = async (req, res) => {
    try {
        const { uid } = req.user;
        const db = getFirestore();

        // Remove MFA data
        await db.collection('users').doc(uid).set({
            settings: { mfaEnabled: false, mfaSecret: null }
        }, { merge: true });

        res.json({ success: true, message: '2FA Disabled' });
    } catch (error) {
        console.error('❌ Error disabling MFA:', error.message);
        res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
    }
};

/**
 * Verify Token on Login
 */
exports.verifyLogin = async (req, res) => {
    try {
        const { uid } = req.user;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token required' });
        }

        const db = getFirestore();
        const docSnap = await db.collection('users').doc(uid).get();

        if (!docSnap.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const data = docSnap.data();
        const secret = data.settings?.mfaSecret;

        if (!secret || !data.settings?.mfaEnabled) {
            return res.status(400).json({ success: false, message: '2FA is not enabled on this account' });
        }

        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            res.json({ success: true, message: 'MFA Verified' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('❌ Error verifying MFA login:', error.message);
        res.status(500).json({ success: false, message: 'Failed to verify login code' });
    }
};
