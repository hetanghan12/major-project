const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

if (!serviceAccount) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not found in .env');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectDocuments() {
    console.log('🔍 Inspecting Documents in Firestore...');
    try {
        const snapshot = await db.collection('documents').get();
        console.log(`Total documents in collection: ${snapshot.size}`);

        const breakdown = {
            documents: [],
            images: [],
            videos: [],
            audio: [],
            other: []
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const type = (data.fileType || '').toLowerCase();
            let cat = 'other';
            if (type.includes('image')) cat = 'images';
            else if (type.includes('video')) cat = 'videos';
            else if (type.includes('audio')) cat = 'audio';
            else if (type.includes('pdf') || type.includes('word') || type.includes('text') || type.includes('officedocument')) cat = 'documents';

            breakdown[cat].push({
                id: doc.id,
                fileName: data.fileName,
                fileType: data.fileType,
                userId: data.userId
            });
        });

        console.log('\n--- DOCUMENTS CATEGORY ---');
        breakdown.documents.forEach((f, i) => {
            console.log(`${i+1}. [${f.fileType}] ${f.fileName} (User: ${f.userId})`);
        });

        console.log(`\nFound ${breakdown.documents.length} files in 'documents' category.`);
        
    } catch (error) {
        console.error('❌ Inspection failed:', error);
    }
}

inspectDocuments();
