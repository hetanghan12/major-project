const { getFirestore, getAuth } = require('../config/firebase.config');

const DEFAULT_SETTINGS = {
    storage: {
        defaultFolder: 'root',
        autoDeleteTrash: '30_days',
        fileVersioning: true
    },
    ai: {
        accessScope: 'all',
        autoSummary: true,
        smartTagging: true
    }
};

/**
 * Get user settings
 */
exports.getSettings = async (req, res) => {
    try {
        const db = getFirestore();
        const docRef = db.collection('users').doc(req.user.uid);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            // First time fetching settings, save defaults
            await docRef.set({ settings: DEFAULT_SETTINGS }, { merge: true });
            return res.json({ success: true, settings: DEFAULT_SETTINGS });
        }

        const data = docSnap.data();
        res.json({ success: true, settings: data.settings || DEFAULT_SETTINGS });
    } catch (error) {
        if (error.code === 8 || error.message.includes('Quota')) {
            console.warn(`⚠️  [QUOTA] Exceeded for getSettings (User: ${req.user.uid}). Returning defaults.`);
            return res.json({ success: true, settings: DEFAULT_SETTINGS, quotaExceeded: true });
        }
        console.error('Error fetching settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

/**
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const { storage, ai } = req.body;
        const db = getFirestore();
        const docRef = db.collection('users').doc(req.user.uid);

        const updateData = {};
        if (storage) updateData['settings.storage'] = storage;
        if (ai) updateData['settings.ai'] = ai;

        await docRef.set(updateData, { merge: true });

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};

/**
 * Clear AI History
 */
exports.clearAIHistory = async (req, res) => {
    try {
        const db = getFirestore();
        // Assume ai_chats is a subcollection in the user document
        const chatsRef = db.collection('users').doc(req.user.uid).collection('ai_chats');

        const snapshot = await chatsRef.get();
        const batch = db.batch();

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        res.json({ success: true, message: 'AI History cleared successfully' });
    } catch (error) {
        console.error('Error clearing AI history:', error);
        res.status(500).json({ success: false, message: 'Failed to clear AI history' });
    }
};

/**
 * Delete User Account completely
 */
exports.deleteAccount = async (req, res) => {
    try {
        const uid = req.user.uid;
        const auth = getAuth();
        const db = getFirestore();

        // 1. Delete user record in Firestore
        await db.collection('users').doc(uid).delete();

        // 2. We can optionally queue a deletion of AWS S3 and Pinecone vectors here

        // 3. Delete from Firebase Auth
        await auth.deleteUser(uid);

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({ success: false, message: 'Failed to delete account' });
    }
};
