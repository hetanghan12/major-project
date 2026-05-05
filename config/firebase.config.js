/**
 * Firebase Admin SDK Configuration
 * =================================
 * Initializes Firebase Admin SDK for backend operations.
 * 
 * This module provides:
 * - Firebase Authentication verification
 * - Firestore database access
 * - Cloud Storage operations
 * 
 * @author College Project
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from the config file
 */
function initializeFirebase() {
    if (firebaseApp) {
        console.log('⚠️  Firebase already initialized');
        return firebaseApp;
    }

    try {
        // Load service account from config directory
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            || path.join(__dirname, 'firebase-service-account.json');

        // Check if service account file exists
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error(`Firebase service account file not found at: ${serviceAccountPath}. Please download it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key.`);
        }

        // Read file content instead of using require (to avoid caching issues)
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        let serviceAccount;

        try {
            serviceAccount = JSON.parse(serviceAccountContent);
        } catch (parseError) {
            throw new Error(`Invalid JSON in Firebase service account file. Please re-download the file from Firebase Console.`);
        }

        // Validate required fields
        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            throw new Error('Firebase service account file is missing required fields (project_id, private_key, client_email).');
        }

        // Determine storage bucket
        // Priority: ENV variable > appspot.com > firebasestorage.app
        let storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
        if (!storageBucket) {
            // Try common bucket name patterns
            storageBucket = `${serviceAccount.project_id}.appspot.com`;
        }

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: storageBucket
        });

        console.log('✅ Firebase Admin SDK initialized successfully');
        console.log(`   Project ID: ${serviceAccount.project_id}`);
        console.log(`   Storage Bucket: ${storageBucket}`);

        return firebaseApp;
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        console.error('');
        console.error('   To fix this issue:');
        console.error('   1. Go to Firebase Console → Project Settings → Service Accounts');
        console.error('   2. Click "Generate New Private Key"');
        console.error('   3. Save the file as "firebase-service-account.json" in backend/config/');
        console.error('   4. Enable Cloud Storage in Firebase Console → Storage');
        console.error('');
        throw error;
    }
}

/**
 * Get Firebase Auth instance
 */
function getAuth() {
    return admin.auth();
}

/**
 * Get Firestore instance
 */
function getFirestore() {
    return admin.firestore();
}

/**
 * Get Cloud Storage bucket
 */
function getStorage() {
    return admin.storage().bucket();
}

module.exports = {
    initializeFirebase,
    getAuth,
    getFirestore,
    getStorage,
    admin
};
