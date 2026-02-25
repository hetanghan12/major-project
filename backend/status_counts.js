const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkStatus() {
    const snapshot = await db.collection('documents').get();
    const statusCounts = {};

    snapshot.forEach(doc => {
        const status = doc.data().status || 'no status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📊 File Status Distribution:');
    for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`- ${status}: ${count} files`);
    }
}

checkStatus();
