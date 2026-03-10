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

const { getAuth, getFirestore } = require('../config/firebase.config');



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

        // Verify the token with Firebase
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        console.log(`[AUTH] Token verified for UID: ${decodedToken.uid}`);

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

/**
 * Admin role check middleware
 */
async function isAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Allow immediate access if email matches ADMIN_EMAIL from env or the hardcoded admin email
        if ((process.env.ADMIN_EMAIL && req.user.email === process.env.ADMIN_EMAIL) || req.user.email === 'admin@cloudspace.com') {
            return next();
        }

        // Check Firestore user role
        const firestore = getFirestore();
        const userDoc = await firestore.collection('users').doc(req.user.uid).get();

        if (userDoc.exists && userDoc.data().role?.toLowerCase() === 'admin') {
            return next();
        }

        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Admin verification failed', error: error.message });
    }
}

module.exports = {
    verifyFirebaseToken,
    optionalAuth,
    isAdmin
};
