/**
 * Admin Middleware
 * ================
 * Verifies that the authenticated user has administrative privileges.
 * Accepts admin if:
 *   1. User's Firestore role === 'Admin'
 *   2. User's email matches ADMIN_EMAIL in .env
 *   3. User does not have a Firestore profile yet (profile will be created on sync)
 * 
 * @author College Project
 */

const { getFirestore } = require('../config/firebase.config');
const { ApiError } = require('./error.middleware');

/**
 * Middleware to check if the user is an admin
 * Must be used AFTER verifyFirebaseToken middleware
 */
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.uid) {
            return next(new ApiError(401, 'Unauthorized: User not authenticated'));
        }

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';

        // Fast path: check email match first (no DB lookup needed)
        if (req.user.email && req.user.email === adminEmail) {
            console.log(`[ADMIN] ✅ Admin access granted by email match: ${req.user.email}`);
            return next();
        }

        // Check Firestore for user role
        try {
            const db = getFirestore();
            const userDoc = await db.collection('users').doc(req.user.uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.role === 'Admin') {
                    console.log(`[ADMIN] ✅ Admin access granted by Firestore role: ${req.user.email}`);
                    return next();
                }
                console.log(`[ADMIN] ❌ User role is "${userData.role}", not Admin`);
                return next(new ApiError(403, 'Forbidden: Admin access required'));
            } else {
                // No profile found, deny access
                console.log(`[ADMIN] ❌ No Firestore profile found for UID: ${req.user.uid}`);
                return next(new ApiError(403, 'Forbidden: Admin access required. Please log in and sync your profile first.'));
            }
        } catch (dbError) {
            console.error('[ADMIN] ⚠️  Firestore lookup failed, denying access:', dbError.message);
            return next(new ApiError(500, 'Admin role check failed'));
        }

    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if the user is at least an editor
 */
const isEditor = async (req, res, next) => {
    try {
        if (!req.user || !req.user.uid) {
            return next(new ApiError(401, 'Unauthorized: User not authenticated'));
        }

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';
        if (req.user.email && req.user.email === adminEmail) {
            return next();
        }

        const db = getFirestore();
        const userDoc = await db.collection('users').doc(req.user.uid).get();

        if (!userDoc.exists) {
            return next(new ApiError(404, 'User profile not found'));
        }

        const allowedRoles = ['Admin', 'Editor'];
        const userData = userDoc.data();
        if (!allowedRoles.includes(userData.role)) {
            return next(new ApiError(403, 'Forbidden: Editor or Admin access required'));
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    isAdmin,
    isEditor
};
