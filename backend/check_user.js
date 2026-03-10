const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, 'config', 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account file not found!');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function checkUser(email) {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
        console.log(`No user found with email: ${email}`);
        return;
    }

    snapshot.forEach(doc => {
        console.log('User ID:', doc.id);
        console.log('User Data:', JSON.stringify(doc.data(), null, 2));
    });
}

checkUser('admin@cloudspace.com').then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
