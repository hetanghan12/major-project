const { getFirestore } = require('../config/firebase.config');

const DEFAULT_SETTINGS = {
    systemName: "Cloud Space",
    adminEmail: "admin@cloudspace.com",
    maxFileSizeMB: 50,
    registrationOpen: true,
    maintenanceMode: false,
    sessionTimeout: 60,
    securitySettings: {
        maxLoginAttempts: 5,
        lockDurationMinutes: 15,
        allowedFileTypes: ["pdf", "docx", "txt", "png", "jpg", "xlsx", "pptx", "mp4", "mp3", "wav", "ogg", "m4a"],
        sessionTimeoutMinutes: 60
    }
};

let cachedSettings = null;
let lastFetch = 0;
const CACHE_TTL = 300000; // 5 minutes

/**
 * Get system settings with in-memory caching
 */
async function getSettings() {
    const now = Date.now();
    if (cachedSettings && (now - lastFetch < CACHE_TTL)) {
        return cachedSettings;
    }

    try {
        const db = getFirestore();
        const doc = await db.collection('system_settings').doc('global').get();
        const settings = doc.exists ? { ...DEFAULT_SETTINGS, ...doc.data() } : DEFAULT_SETTINGS;
        
        // Ensure securitySettings exists
        if (!settings.securitySettings) {
            settings.securitySettings = { ...DEFAULT_SETTINGS.securitySettings };
        }

        cachedSettings = settings;
        lastFetch = now;
        return settings;
    } catch (error) {
        console.error('Failed to fetch settings from Firestore:', error.message);
        return cachedSettings || DEFAULT_SETTINGS;
    }
}

/**
 * Update system settings and invalidate cache
 */
async function updateSettings(newSettings) {
    const db = getFirestore();
    const data = {
        ...newSettings,
        updatedAt: new Date().toISOString()
    };
    await db.collection('system_settings').doc('global').set(data, { merge: true });
    cachedSettings = null;
    lastFetch = 0;
    return data;
}

/**
 * Check if a file is allowed based on current settings
 * @param {string} fileName - Original filename
 * @param {string} mimeType - Multer mimetype
 */
async function isFileAllowed(fileName, mimeType) {
    const settings = await getSettings();
    const allowedExtensions = settings.securitySettings.allowedFileTypes || DEFAULT_SETTINGS.securitySettings.allowedFileTypes;
    
    const ext = fileName.split('.').pop().toLowerCase();
    
    // Check extension
    if (!allowedExtensions.includes(ext)) {
        return { allowed: false, reason: `Extension .${ext} is not allowed.` };
    }

    // Check size (optional extra layer here, but multer handles it too)
    // we'll leave size check to multer/route-handler for now

    return { allowed: true };
}

module.exports = {
    getSettings,
    updateSettings,
    isFileAllowed,
    DEFAULT_SETTINGS
};
