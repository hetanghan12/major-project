const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectCategoryDuplicates() {
    const snapshot = await db.collection('documents').get();
    const docsInCat = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        const type = (data.fileType || '').toLowerCase();
        let isDoc = type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('officedocument');
        
        if (isDoc) {
            docsInCat.push({
                id: doc.id,
                fileName: data.fileName,
                fileSize: data.fileSize,
                userId: data.userId
            });
        }
    });

    console.log(`📊 Documents category has ${docsInCat.length} records.`);
    
    const map = new Map();
    docsInCat.forEach(d => {
        const key = `${d.userId}_${d.fileName}_${d.fileSize}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(d.id);
    });

    console.log('\n--- Duplicate Breakdown for Documents Category ---');
    map.forEach((ids, key) => {
        if (ids.length > 1) {
            console.log(`- ${key}: ${ids.length} copies`);
        } else {
            console.log(`- ${key}: 1 copy (Unique)`);
        }
    });
    console.log(`\nTotal Unique Documents (by user/name/size): ${map.size}`);
}

inspectCategoryDuplicates();
