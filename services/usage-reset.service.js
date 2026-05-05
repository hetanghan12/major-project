/**
 * Usage Reset Service
 * ===================
 * Handles automatic monthly reset of user limits (AI requests).
 */

const { getFirestore, admin } = require('../config/firebase.config');

let schedulerHandle = null;

/**
 * Perform a monthly reset for users whose reset date has passed.
 * Uses Firestore batch updates for efficiency and minimal read usage.
 */
async function performMonthlyReset() {
    console.log('🔄 [USAGE RESET] Starting monthly usage reset job...');
    const db = getFirestore();
    const now = new Date();
    
    try {
        const snapshot = await db.collection('users')
            .where('aiRequestsResetDate', '<=', now.toISOString())
            .limit(100)
            .get();

        if (snapshot.empty) {
            console.log('✅ [USAGE RESET] No users require reset at this time.');
            return;
        }

        const batch = db.batch();
        let resetCount = 0;

        snapshot.forEach(doc => {
            const userRef = doc.ref;
            const userData = doc.data();
            const currentResetDate = new Date(userData.aiRequestsResetDate);
            const nextResetDate = new Date(currentResetDate);
            nextResetDate.setMonth(nextResetDate.getMonth() + 1);

            batch.update(userRef, {
                aiRequestsUsed: 0,
                aiRequestsResetDate: nextResetDate.toISOString(),
                lastResetAt: now.toISOString()
            });

            resetCount++;
        });

        await batch.commit();
        console.log(`✅ [USAGE RESET] Successfully reset AI usage for ${resetCount} users.`);

        if (snapshot.size === 100) {
            console.log('   [USAGE RESET] More users found, continuing reset process...');
            await performMonthlyReset();
        }
    } catch (error) {
        console.error('❌ [USAGE RESET] Failed to perform monthly reset:', error.message);
    }
}

/**
 * Initialize the scheduler.
 * Runs once every 24 hours.
 */
function initializeUsageResetScheduler() {
    console.log('⏰ [USAGE RESET] Initializing scheduler (Every 24 hours)');
    
    performMonthlyReset().catch(err => console.error('Initial reset failed:', err.message));

    if (schedulerHandle) {
        clearInterval(schedulerHandle);
    }

    schedulerHandle = setInterval(() => {
        performMonthlyReset().catch(err => console.error('Scheduled reset failed:', err.message));
    }, 24 * 60 * 60 * 1000);

    return schedulerHandle;
}

function shutdownUsageResetScheduler() {
    if (schedulerHandle) {
        clearInterval(schedulerHandle);
        schedulerHandle = null;
        console.log('🛑 [USAGE RESET] Scheduler stopped');
    }
}

module.exports = {
    performMonthlyReset,
    initializeUsageResetScheduler,
    shutdownUsageResetScheduler
};
