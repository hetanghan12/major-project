const { initializeFirebase, getFirestore } = require('./backend/config/firebase.config');
const { trackNewUser } = require('./backend/services/analytics.service');

async function fix() {
    try {
        initializeFirebase();
        const db = getFirestore();

        // Ensure global_stats exists
        const ref = db.collection('analytics').doc('global_stats');
        const doc = await ref.get();
        if (!doc.exists) {
            console.log('Creating global_stats doc...');
            await ref.set({
                totalUsers: 0,
                totalFiles: 0,
                totalDocuments: 0,
                totalStorageUsed: 0,
                uploadsToday: 0,
                aiRequestsToday: 0,
                typeDistribution: {
                    documents: { count: 0, bytes: 0 },
                    media: { count: 0, bytes: 0 },
                    others: { count: 0, bytes: 0 }
                },
                lastUpdated: new Date().toISOString()
            });
        }

        console.log('Syncing all users stats...');
        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
            const uid = userDoc.id;
            console.log(`Checking user: ${uid}`);
            const { recalibrateUserStats } = require('./backend/services/storage-quota.service');
            await recalibrateUserStats(uid);
        }

    } catch (e) {
        console.error(e);
    }
}

fix();
