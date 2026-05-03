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

function buildRequestUser(decodedToken) {
    return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null
    };
}

function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    return token || null;
}

function extractFirebaseToken(req, { allowQueryToken = false } = {}) {
    const headerToken = extractBearerToken(req.headers.authorization);
    if (headerToken) {
        return headerToken;
    }

    if (allowQueryToken && typeof req.query?.token === 'string' && req.query.token.trim()) {
        return req.query.token.trim();
    }

    return null;
}

async function decodeFirebaseToken(idToken) {
    if (!idToken) {
        const error = new Error('No token provided in authorization header');
        error.code = 'auth/argument-error';
        throw error;
    }

    const auth = getAuth();
    return auth.verifyIdToken(idToken);
}

async function attachUserToRequest(req, idToken) {
    const decodedToken = await decodeFirebaseToken(idToken);
    req.user = buildRequestUser(decodedToken);
    return req.user;
}

/**
 * Middleware to verify Firebase ID token
 * Extracts user information and attaches it to req.user
 */
async function verifyFirebaseToken(req, res, next) {
    try {
        console.log(`[AUTH] Verifying token for path: ${req.path}`);

        if (!req.headers.authorization) {
            console.log('[AUTH] No authorization header found');
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        if (!extractBearerToken(req.headers.authorization)) {
            console.log('[AUTH] Invalid header format');
            return res.status(401).json({
                success: false,
                message: 'Invalid authorization format. Use "Bearer <token>"'
            });
        }

        const idToken = extractFirebaseToken(req);
        await attachUserToRequest(req, idToken);

        console.log(`✅ Authenticated user: ${req.user.email} (${req.user.uid})`);
        next();
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);

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

async function verifyFirebaseTokenOrQuery(req, res, next) {
    try {
        console.log(`[AUTH] Verifying token for path: ${req.path}`);

        const idToken = extractFirebaseToken(req, { allowQueryToken: true });

        if (!idToken) {
            console.log('[AUTH] No token found in header or query');
            return res.status(401).json({
                success: false,
                message: 'No authorization token provided'
            });
        }

        await attachUserToRequest(req, idToken);

        console.log(`✅ Authenticated user: ${req.user.email} (${req.user.uid})`);
        next();
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);

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
        const idToken = extractFirebaseToken(req);

        if (idToken) {
            await attachUserToRequest(req, idToken);
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
}

async function isAdminUser(user) {
    if (!user || !user.email) {
        return false;
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (adminEmail && user.email.toLowerCase() === adminEmail) {
        return true;
    }

    const firestore = getFirestore();
    const userDoc = await firestore.collection('users').doc(user.uid).get();

    return !!(userDoc.exists && userDoc.data().role?.toLowerCase() === 'admin');
}

/**
 * Admin role check middleware
 */
async function isAdmin(req, res, next) {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (await isAdminUser(req.user)) {
            return next();
        }

        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Admin verification failed', error: error.message });
    }
}

module.exports = {
    verifyFirebaseToken,
    verifyFirebaseTokenOrQuery,
    optionalAuth,
    isAdmin,
    isAdminUser,
    decodeFirebaseToken,
    buildRequestUser
};
