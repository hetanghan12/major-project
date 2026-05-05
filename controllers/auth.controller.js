/**
 * Authentication Controller
 * ==========================
 * Handles user authentication operations.
 * 
 * @author College Project
 */

const { getAuth } = require('../config/firebase.config');
const { createOrUpdateUser, getUser, getUserByEmail } = require('../services/firestore.service');
const { getFirestore } = require('../config/firebase.config');
const { activatePendingShares } = require('../services/share.service');
const { asyncHandler, ApiError } = require('../middlewares/error.middleware');
const { logSecurityEvent, trackNewUser } = require('../services/analytics.service');
const { initializeAiUsage } = require('../services/ai-usage.service');

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
    const { uid, email, name, picture } = req.user;

    let userProfile = await getUser(uid);

    // If profile doesn't exist in Firestore yet (e.g. sync pending), 
    // construct a virtual profile from Firebase Auth data
    if (!userProfile) {
        userProfile = {
            uid,
            email,
            displayName: name || null,
            photoURL: picture || null,
            plan: 'free',
            storageUsed: 0,
            aiRequestsUsed: 0,
            aiRequestsResetDate: new Date().toISOString(),
            mfaEnabled: false,
            createdAt: new Date().toISOString()
        };
    }

    // Ensure role is set — check ADMIN_EMAIL env or Firestore role  
    if (!userProfile.role) {
        if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL) {
            userProfile.role = 'Admin';

            // Persist the role to Firestore so future lookups work (if quota allows)
            try {
                const firestore = getFirestore();
                await firestore.collection('users').doc(uid).set({ role: 'Admin' }, { merge: true });
            } catch (error) {
                if (error.code === 8 || error.message.includes('Quota')) {
                    console.warn(`⚠️  [QUOTA] Exceeded while assigning Admin role to ${email}. Setting role virtually.`);
                } else {
                    console.error('Failed to set Admin role in Firestore:', error);
                }
            }
        } else {
            userProfile.role = 'User';
        }
    }

    // Use the storage quota service's normalization and recovery logic
    const { getEffectivePlan } = require('../services/storage-quota.service');
    userProfile.plan = await getEffectivePlan(uid, userProfile);

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
    const testEndpointEnabled = process.env.ENABLE_TEST_USER_ENDPOINT === 'true';
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction || !testEndpointEnabled) {
        throw new ApiError(404, 'Not found');
    }

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

            // Track new user in aggregated stats
            trackNewUser().catch(err => console.error('trackNewUser failed:', err.message));

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
const { getEffectivePlan } = require('../services/storage-quota.service');

const syncUser = asyncHandler(async (req, res) => {
    const { uid, email, name, picture } = req.user;

    console.log(`🔄 Syncing user: ${email} (${uid})`);

    // Update user profile in Firestore
    const existingProfile = await getUser(uid);
    const isNewUser = !existingProfile;
    const userProfile = await createOrUpdateUser(uid, {
        email,
        displayName: name,
        photoURL: picture
    });

    // Track new user in aggregated stats (non-blocking)
    if (isNewUser) {
        trackNewUser().catch(err => console.error('trackNewUser failed:', err.message));
        
        // Trigger admin notification for new signup
        const { createAdminNotification } = require('../services/notification.service');
        createAdminNotification({
            type: 'USER_SIGNUP',
            message: `New user signed up: ${email}`,
            details: { email, name, uid }
        }).catch(err => console.error('Admin signup notification failed:', err.message));

        // Initialize AI Usage tracking (NEW)
        initializeAiUsage(uid, userProfile.plan || 'free').catch(err => console.error('AI Usage init failed:', err.message));
    }

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

    // Reset login failures for this email
    try {
        const firestore = getFirestore();
        // 1. Clear legacy login locks
        await firestore.collection('login_locks').doc(email).delete();

        // 2. Reset fields in user document (as per new requirements)
        await firestore.collection('users').doc(uid).update({
            failedLoginAttempts: 0,
            accountLockedUntil: null
        }).catch(err => {
            // Document might not have these fields yet or exist, ignore fail if it's just missing fields
            if (!err.message.includes('NOT_FOUND')) console.warn('Could not reset login failure fields:', err.message);
        });

        // ==========================================
        // Log to NEW security_logs collection
        // ==========================================
        await logSecurityEvent({
            eventType: 'LOGIN_SUCCESS',
            userId: uid,
            email: email,
            ipAddress: req.ip || req.connection.remoteAddress,
            action: `User ${email} logged in successfully`,
            status: 'SUCCESS'
        });
    } catch (e) {
        console.error('Failed to clear login locks or log audit:', e);
    }

    // CRITICAL: Ensure we return the correct "Effective Plan" even during sync
    const effectivePlan = await getEffectivePlan(uid, userProfile);
    userProfile.plan = effectivePlan;

    res.json({
        success: true,
        message: 'User synced successfully',
        user: userProfile,
        pinecone: pineconeNamespace ? {
            namespace: pineconeNamespace.namespace,
            vectorCount: pineconeNamespace.vectorCount,
            exists: pineconeNamespace.exists
        } : null,
        securitySettings: await (async () => {
            const firestore = getFirestore();
            const doc = await firestore.collection('system_settings').doc('global').get();
            return doc.exists ? (doc.data().securitySettings || {}) : {};
        })(),
        pendingSharesActivated: 0
    });

    // Activate pending shares in the background (don't block the response)
    activatePendingShares(uid, email).then(count => {
        if (count > 0) {
            console.log(`   📬 Activated ${count} pending shares for ${email}`);
        }
    }).catch(err => {
        console.error(`   ⚠️ Pending share activation failed: ${err.message}`);
    });
});

/**
 * Record failed login attempt, lock if maxAttempts reached
 * POST /api/auth/fail
 */
const failLogin = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Email is required');

    const firestore = getFirestore();
    
    // 1. Get Security Settings
    const settingsDoc = await firestore.collection('system_settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    
    // Use new securitySettings structure, fallback to legacy for safety
    const security = settings.securitySettings || {};
    const maxAttempts = security.maxLoginAttempts || settings.maxLoginAttempts || 5;
    const lockDuration = security.lockDurationMinutes || settings.sessionTimeout || 15;

    // 2. Find User Document (if exists)
    const user = await getUserByEmail(email);
    let failures = 1;
    let locked = false;

    if (user) {
        // Increment failures in User Document
        failures = (user.failedLoginAttempts || 0) + 1;
        const updates = {
            failedLoginAttempts: failures,
            lastLoginFailure: new Date().toISOString()
        };

        if (failures >= maxAttempts) {
            updates.accountLockedUntil = new Date(Date.now() + lockDuration * 60000).toISOString();
            locked = true;
        }

        await firestore.collection('users').doc(user.id).set(updates, { merge: true });
    }

    // 3. Update legacy login_locks for safety/backward compatibility
    const lockRef = firestore.collection('login_locks').doc(email);
    const lockDoc = await lockRef.get();
    if (!user && lockDoc.exists) {
        failures = (lockDoc.data().failures || 0) + 1;
    }

    const lockUpdates = {
        email,
        failures,
        lastFailure: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
    };
    if (failures >= maxAttempts) {
        lockUpdates.lockedUntil = new Date(Date.now() + lockDuration * 60000).toISOString();
        locked = true;
    }
    await lockRef.set(lockUpdates, { merge: true });

    // 4. Log security event
    await logSecurityEvent({
        eventType: 'LOGIN_FAILED',
        userId: user ? user.id : 'N/A',
        email: email,
        ipAddress: req.ip || req.connection.remoteAddress,
        action: `Failed login attempt for ${email} (Failures: ${failures})`,
        status: 'FAILED',
        details: { locked }
    });

    res.json({ 
        success: true, 
        message: locked ? 'Too many failed login attempts. Please try again later.' : 'Failed login recorded', 
        locked, 
        failures 
    });
});

/**
 * Return lock status for a given email
 * GET /api/auth/lockout-status/:email
 */
const getLockoutStatus = asyncHandler(async (req, res) => {
    const { email } = req.params;
    if (!email) throw new ApiError(400, 'Email is required');

    const normalizedEmail = String(email).trim().toLowerCase();
    const requesterEmail = String(req.user?.email || '').trim().toLowerCase();
    const isEnvAdmin = !!process.env.ADMIN_EMAIL && requesterEmail === String(process.env.ADMIN_EMAIL).trim().toLowerCase();

    if (normalizedEmail !== requesterEmail && !isEnvAdmin) {
        throw new ApiError(403, 'Forbidden');
    }

    const firestore = getFirestore();
    
    // Check both user doc and legacy lock doc
    const [user, lockDoc] = await Promise.all([
        getUserByEmail(normalizedEmail),
        firestore.collection('login_locks').doc(normalizedEmail).get()
    ]);

    let locked = false;
    let lockedUntil = null;

    // Check modern user doc first
    if (user && user.accountLockedUntil && new Date(user.accountLockedUntil).getTime() > Date.now()) {
        locked = true;
        lockedUntil = user.accountLockedUntil;
    } 
    // Fallback to legacy lock doc
    else if (lockDoc.exists) {
        const data = lockDoc.data();
        if (data.lockedUntil && new Date(data.lockedUntil).getTime() > Date.now()) {
            locked = true;
            lockedUntil = data.lockedUntil;
        }
    }

    if (locked) {
        return res.json({
            success: true,
            locked: true,
            lockedUntil,
            message: 'Too many failed login attempts. Please try again later.'
        });
    }

    return res.json({ success: true, locked: false });
});

module.exports = {
    verifyToken,
    getProfile,
    createTestUser,
    syncUser,
    failLogin,
    getLockoutStatus
};
