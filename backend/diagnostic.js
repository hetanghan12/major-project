const { initializeFirebase, getFirestore } = require('./config/firebase.config');
require('dotenv').config();

async function run() {
    try {
        console.log('--- START DIAGNOSTIC ---');
        initializeFirebase();
        const db = getFirestore();
        const snapshot = await db.collection('documents').get();
        console.log(`TOTAL_DOCS: ${snapshot.size}`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`DOC_ID: ${doc.id}`);
            console.log(`  fileName: ${data.fileName}`);
            console.log(`  userId: ${data.userId}`);
            console.log(`  status: ${data.status}`);
            console.log(`  isTrashed: ${data.isTrashed}`);
            console.log(`  parentFolderId: ${data.parentFolderId}`);
            console.log('---');
        });
        console.log('--- END DIAGNOSTIC ---');
        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC_ERROR:', error);
        process.exit(1);
    }
}

run();
