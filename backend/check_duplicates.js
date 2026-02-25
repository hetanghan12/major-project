const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkDuplicates() {
    const snapshot = await db.collection('documents').get();
    const map = new Map();

    snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.userId}_${data.fileName}_${data.fileSize}`;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(doc.id);
    });

    console.log('🔍 Duplicate Check (User_Name_Size):');
    let dupeCount = 0;
    map.forEach((ids, key) => {
        if (ids.length > 1) {
            console.log(`- [${key}] has ${ids.length} entries: ${ids.join(', ')}`);
            dupeCount += (ids.length - 1);
        }
    });
    
    if (dupeCount === 0) {
        console.log('✅ No duplicates found based on name and size.');
    } else {
        console.log(`⚠️ Found ${dupeCount} potential duplicate records.`);
    }
}

checkDuplicates();
