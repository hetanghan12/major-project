const { initializeFirebase, getFirestore } = require('./backend/config/firebase.config');

async function testQuery() {
    try {
        initializeFirebase();
        const db = getFirestore();

        // Find a user ID first
        const userSnap = await db.collection('users').get();
        if (userSnap.empty) {
            console.log('No users found.');
            return;
        }
        const userId = userSnap.docs[0].id;
        console.log(`Testing with user: ${userId}`);

        console.log('\nQuery 1: Recent Documents (userId, isTrashed, uploadedAt DESC)');
        try {
            const recentSnap = await db.collection('documents')
                .where('userId', '==', userId)
                .where('isTrashed', '==', false)
                .orderBy('uploadedAt', 'desc')
                .limit(5)
                .get();
            console.log(`Found ${recentSnap.size} documents.`);
        } catch (e) {
            console.error('FAILED Query 1:', e.message);
        }

        console.log('\nQuery 2: Starred Count (userId, isStarred, isTrashed)');
        try {
            const starredSnap = await db.collection('documents')
                .where('userId', '==', userId)
                .where('isStarred', '==', true)
                .where('isTrashed', '==', false)
                .limit(50)
                .get();
            console.log(`Found ${starredSnap.size} starred items.`);
        } catch (e) {
            console.error('FAILED Query 2:', e.message);
        }

    } catch (e) {
        console.error('Global error:', e.message);
    }
}

testQuery();
