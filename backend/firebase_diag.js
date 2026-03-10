const { initializeFirebase, getFirestore, admin } = require('./config/firebase.config');
require('dotenv').config();

async function run() {
    try {
        console.log('--- FIREBASE DIAGNOSTIC ---');
        initializeFirebase();
        const db = getFirestore();
        console.log(`DATABASE_ID: ${db._databaseId?._database || '(default)'}`);
        console.log(`PROJECT_ID: ${db._databaseId?._project}`);

        const collections = await db.listCollections();
        console.log(`COLLECTIONS_FOUND: ${collections.map(c => c.id).join(', ')}`);

        if (collections.some(c => c.id === 'documents')) {
            const count = (await db.collection('documents').get()).size;
            console.log(`DOCUMENTS_COUNT: ${count}`);
        } else {
            console.log('DOCUMENTS_COLLECTION_NOT_FOUND');
        }

        console.log('--- END FIREBASE DIAGNOSTIC ---');
        process.exit(0);
    } catch (error) {
        console.error('DIAGNOSTIC_ERROR:', error);
        process.exit(1);
    }
}

run();
