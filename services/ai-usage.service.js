/**
 * AI Usage Service
 * =================
 * Handles AI request tracking and quota management.
 * Stores data in users/{userId}/usage/ai.
 */

const { getFirestore, admin } = require('../config/firebase.config');
const { PLANS } = require('../config/plans');

/**
 * Initialize AI usage document for a new user
 * @param {string} userId - Firebase UID
 * @param {string} plan - User plan key ('free', 'pro', 'professional')
 */
async function initializeAiUsage(userId, plan = 'free') {
    const db = getFirestore();
    const planConfig = PLANS[plan] || PLANS.free;
    const monthlyLimit = planConfig.aiRequestsPerMonth || 50;

    const usageRef = db.collection('users').doc(userId).collection('usage').doc('ai');

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(now.getMonth() + 1);

    const initialData = {
        monthlyLimit,
        usedQueries: 0,
        remainingQueries: monthlyLimit,
        lastResetDate: now.toISOString(),
        nextResetDate: nextMonth.toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
        await usageRef.set(initialData, { merge: true });
        console.log(`✅ [AI-Usage] Initialized for user ${userId} on ${plan} plan`);
        return initialData;
    } catch (error) {
        console.error(`❌ [AI-Usage] Initialization failed for ${userId}:`, error.message);
        throw error;
    }
}

/**
 * Update AI usage after a query
 * @param {string} userId - Firebase UID
 */
async function trackAiUsage(userId) {
    const db = getFirestore();
    const usageRef = db.collection('users').doc(userId).collection('usage').doc('ai');

    try {
        return await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(usageRef);
            
            if (!doc.exists) {
                // If for some reason it doesn't exist, initialize it first
                // We'll need user data for this, but let's assume it should exist
                console.warn(`⚠️ [AI-Usage] Document missing for ${userId}, initializing...`);
                // Get user plan from user doc
                const userDoc = await transaction.get(db.collection('users').doc(userId));
                const userData = userDoc.exists ? userDoc.data() : {};
                const plan = userData.plan || 'free';
                
                const planConfig = PLANS[plan] || PLANS.free;
                const limit = planConfig.aiRequestsPerMonth || 50;
                
                const data = {
                    monthlyLimit: limit,
                    usedQueries: 1,
                    remainingQueries: limit - 1,
                    lastResetMonth: new Date().toISOString().substring(0, 7),
                    lastResetDate: new Date().toISOString().split('T')[0],
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                
                transaction.set(usageRef, data);
                return data;
            }

            const data = doc.data();
            const currentMonth = new Date().toISOString().substring(0, 7);

            // Check if we need to reset for a new month
            if (data.lastResetMonth !== currentMonth) {
                const planConfig = PLANS[data.plan || 'free'] || PLANS.free;
                const limit = planConfig.aiRequestsPerMonth || 50;
                
                const resetData = {
                    usedQueries: 1,
                    remainingQueries: limit - 1,
                    lastResetMonth: currentMonth,
                    lastResetDate: new Date().toISOString().split('T')[0],
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                
                transaction.update(usageRef, resetData);
                return resetData;
            }

            // Normal increment
            const used = (data.usedQueries || 0) + 1;
            const remaining = Math.max(0, (data.monthlyLimit || 50) - used);

            transaction.update(usageRef, {
                usedQueries: used,
                remainingQueries: remaining,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return { ...data, usedQueries: used, remainingQueries: remaining };
        });
    } catch (error) {
        console.error(`❌ [AI-Usage] Update failed for ${userId}:`, error.message);
        throw error;
    }
}

/**
 * Get current AI usage for the dashboard or UI
 * @param {string} userId - Firebase UID
 */
async function getAiUsage(userId) {
    const db = getFirestore();
    const doc = await db.collection('users').doc(userId).collection('usage').doc('ai').get();
    
    if (doc.exists) {
        return doc.data();
    }
    
    return null;
}

module.exports = {
    initializeAiUsage,
    trackAiUsage,
    getAiUsage
};
