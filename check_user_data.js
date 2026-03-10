const { initializeFirebase, getAuth, getFirestore } = require('./backend/config/firebase.config');
const { getUserStorageStats } = require('./backend/services/storage-quota.service');

async function checkUser(email) {
    try {
        initializeFirebase();
        const auth = getAuth();
        const user = await auth.getUserByEmail(email);
        console.log(`UID: ${user.uid}`);

        const db = getFirestore();
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            console.log('User Doc:', JSON.stringify(userDoc.data(), null, 2));
        } else {
            console.log('User document does NOT exist in Firestore.');
        }

        const stats = await getUserStorageStats(user.uid);
        console.log('Storage Stats:', JSON.stringify(stats, null, 2));

        const docsSnap = await db.collection('documents').where('userId', '==', user.uid).where('isTrashed', '==', false).get();
        console.log(`Number of live documents: ${docsSnap.size}`);

    } catch (e) {
        console.error(e.message);
    }
}

checkUser('anghanhet1@gmail.com');
