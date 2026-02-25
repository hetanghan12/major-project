const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkPerUser() {
    const snapshot = await db.collection('documents').get();
    const userCounts = {};

    snapshot.forEach(doc => {
        const userId = doc.data().userId || 'unknown';
        userCounts[userId] = (userCounts[userId] || 0) + 1;
    });

    console.log('📊 File Count per User:');
    for (const [uid, count] of Object.entries(userCounts)) {
        console.log(`- User ID ${uid}: ${count} files`);
    }
}

checkPerUser();
