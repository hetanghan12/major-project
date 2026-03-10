const { initializeFirebase, getFirestore } = require('./config/firebase.config');
require('dotenv').config();

async function run() {
    try {
        initializeFirebase();
        const db = getFirestore();
        const snapshot = await db.collection('documents').get();
        console.log(`Total documents in 'documents' collection: ${snapshot.size}`);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`- ID: ${doc.id}`);
            console.log(`  fileName: ${data.fileName}`);
            console.log(`  userId: ${data.userId}`);
            console.log(`  status: ${data.status}`);
            console.log(`  uploadedAt: ${data.uploadedAt}`);
            console.log(`  isTrashed: ${data.isTrashed}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error listing documents:', error);
        process.exit(1);
    }
}

run();
