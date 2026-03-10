const { initializeFirebase, getFirestore } = require('./config/firebase.config');
const fs = require('fs');
require('dotenv').config();

async function run() {
    try {
        initializeFirebase();
        const db = getFirestore();
        const snapshot = await db.collection('documents').get();
        const docs = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            docs.push({
                id: doc.id,
                fileName: data.fileName,
                userId: data.userId,
                status: data.status,
                isTrashed: data.isTrashed,
                parentFolderId: data.parentFolderId
            });
        });

        fs.writeFileSync('diag_output.json', JSON.stringify(docs, null, 2));
        console.log('DIAGNOSTIC_WRITTEN');
        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC_ERROR:', error);
        process.exit(1);
    }
}

run();
