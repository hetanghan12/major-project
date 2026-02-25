const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkPlans() {
    console.log('🔍 Checking Subscription Plans in Firestore...');
    const snapshot = await db.collection('subscription_plans').get();
    if (snapshot.empty) {
        console.log('❌ Collection is EMPTY.');
        return;
    }
    console.log(`✅ Found ${snapshot.size} plans:`);
    snapshot.forEach(doc => {
        console.log(`- ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkPlans();
