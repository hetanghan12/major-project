/**
 * Authentication Controller
 * ==========================
 * Handles user authentication operations.
 * 
 * @author College Project
 */

const { getAuth } = require('../config/firebase.config');
const { createOrUpdateUser, getUser } = require('../services/firestore.service');
const { asyncHandler, ApiError } = require('../middlewares/error.middleware');

/**
 * Verify Firebase ID token and return user info
 * POST /api/auth/verify
 */
const verifyToken = asyncHandler(async (req, res) => {
    // User info is attached by verifyFirebaseToken middleware
    const { uid, email, emailVerified, name, picture } = req.user;

    // Create or update user profile in Firestore
    const userProfile = await createOrUpdateUser(uid, {
        email,
        displayName: name,
        photoURL: picture
    });

    res.json({
        success: true,
        message: 'Token verified successfully',
        user: {
            uid,
            email,
            emailVerified,
            displayName: name || userProfile.displayName,
            photoURL: picture || userProfile.photoURL
        }
    });
});

/**
 * Get current user profile
 * GET /api/auth/profile
 */
const getProfile = asyncHandler(async (req, res) => {
    const { uid } = req.user;

    const userProfile = await getUser(uid);

    if (!userProfile) {
        throw new ApiError(404, 'User profile not found');
    }

    res.json({
        success: true,
        user: userProfile
    });
});

/**
 * Create default test user
 * POST /api/auth/create-test-user
 * 
 * ⚠️ WARNING: This endpoint is for TESTING/DEMO purposes only!
 * In production, this should be disabled or secured.
 */
const createTestUser = asyncHandler(async (req, res) => {
    // Default test user credentials
    const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@collegeproject.com';
    const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@12345';

    const auth = getAuth();

    try {
        // Check if test user already exists
        const existingUser = await auth.getUserByEmail(TEST_EMAIL);

        console.log('ℹ️  Test user already exists:', existingUser.uid);

        res.json({
            success: true,
            message: 'Test user already exists',
            user: {
                uid: existingUser.uid,
                email: existingUser.email,
                displayName: existingUser.displayName
            },
            note: '⚠️ This user is for TESTING/DEMO purposes only!'
        });

    } catch (error) {
        // User doesn't exist, create new one
        if (error.code === 'auth/user-not-found') {
            const newUser = await auth.createUser({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                displayName: 'Test User',
                emailVerified: true
            });

            // Create user profile in Firestore
            await createOrUpdateUser(newUser.uid, {
                email: newUser.email,
                displayName: newUser.displayName
            });

            console.log('✅ Test user created:', newUser.uid);

            res.status(201).json({
                success: true,
                message: 'Test user created successfully',
                user: {
                    uid: newUser.uid,
                    email: newUser.email,
                    displayName: newUser.displayName
                },
                credentials: {
                    email: TEST_EMAIL,
                    password: TEST_PASSWORD
                },
                note: '⚠️ This user is for TESTING/DEMO purposes only!'
            });

        } else {
            throw error;
        }
    }
});

/**
 * Sync user data after login (called by frontend after Firebase Auth login)
 * POST /api/auth/sync
 * 
 * This also initializes/verifies the user's Pinecone namespace
 * Each user gets their own isolated namespace for vector storage
 */
const syncUser = asyncHandler(async (req, res) => {
    const { uid, email, name, picture } = req.user;

    console.log(`🔄 Syncing user: ${email} (${uid})`);

    // Update user profile in Firestore
    const userProfile = await createOrUpdateUser(uid, {
        email,
        displayName: name,
        photoURL: picture
    });

    // Initialize/verify user's Pinecone namespace
    // Each user gets their own isolated namespace (namespace = userId)
    let pineconeNamespace = null;
    try {
        const { initializeUserNamespace } = require('../config/pinecone.config');
        pineconeNamespace = await initializeUserNamespace(uid);
        console.log(`   ✅ Pinecone namespace ready: ${pineconeNamespace.namespace}`);
    } catch (error) {
        // Don't fail the sync if Pinecone is unavailable
        console.error(`   ⚠️ Pinecone namespace check failed: ${error.message}`);
        console.log(`   ⚠️ User can still use the app, namespace will be created on first document upload`);
    }

    res.json({
        success: true,
        message: 'User synced successfully',
        user: userProfile,
        pinecone: pineconeNamespace ? {
            namespace: pineconeNamespace.namespace,
            vectorCount: pineconeNamespace.vectorCount,
            exists: pineconeNamespace.exists
        } : null
    });
});

module.exports = {
    verifyToken,
    getProfile,
    createTestUser,
    syncUser
};
