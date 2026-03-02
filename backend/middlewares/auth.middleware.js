/**
 * Firebase Authentication Middleware
 * ====================================
 * Verifies Firebase ID tokens on protected routes.
 * 
 * SECURITY: Every protected request must include a valid Firebase ID token
 * in the Authorization header as "Bearer <token>"
 * 
 * @author College Project
 */

const { getAuth } = require('../config/firebase.config');
const { getLockoutStatus } = require('../services/admin.service');


/**
 * Middleware to verify Firebase ID token
 * Extracts user information and attaches it to req.user
 */
async function verifyFirebaseToken(req, res, next) {
    // START DEBUG LOGGING
    console.log(`[AUTH] Verifying token for path: ${req.path}`);

    try {
        const authHeader = req.headers.authorization;

        // Check if authorization header exists
        if (!authHeader) {
            console.log('[AUTH] No authorization header found');
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        // Check if it's a Bearer token
        if (!authHeader.startsWith('Bearer ')) {
            console.log('[AUTH] Invalid header format');
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization format. Use "Bearer <token>"'
            });
        }

        // Extract the token
        const idToken = authHeader.split('Bearer ')[1];

        if (!idToken) {
            console.log('[AUTH] No token in header');
            return res.status(401).json({
                success: false,
                message: 'No token provided in authorization header'
            });
        }

        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        console.log(`[AUTH] Token verified for UID: ${decodedToken.uid}`);

        // Check for lockout
        const lockout = await getLockoutStatus(decodedToken.email);
        if (lockout.locked) {
            console.log(`[AUTH] Blocked access for locked user: ${decodedToken.email}`);
            return res.status(403).json({
                success: false,
                message: `Your account is temporarily locked. Try again after ${new Date(lockout.lockedUntil).toLocaleTimeString()}`,
                locked: true
            });
        }

        // Attach user information to request object
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            name: decodedToken.name || null,
            picture: decodedToken.picture || null
        };

        console.log(`✅ Authenticated user: ${req.user.email} (${req.user.uid})`);
        next();

    } catch (error) {
        console.error('❌ Token verification failed:', error.message);

        // Handle specific Firebase auth errors
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }

        if (error.code === 'auth/id-token-revoked') {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked. Please login again.'
            });
        }

        if (error.code === 'auth/argument-error') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
}

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't block request if no token
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const idToken = authHeader.split('Bearer ')[1];

            if (idToken) {
                const auth = getAuth();
                const decodedToken = await auth.verifyIdToken(idToken);

                req.user = {
                    uid: decodedToken.uid,
                    email: decodedToken.email,
                    emailVerified: decodedToken.email_verified,
                    name: decodedToken.name || null,
                    picture: decodedToken.picture || null
                };
            }
        }

        next();
    } catch (error) {
        // Silent failure for optional auth - just continue without user
        req.user = null;
        next();
    }
}

module.exports = {
    verifyFirebaseToken,
    optionalAuth
};
