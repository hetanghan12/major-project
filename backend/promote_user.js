const { initializeFirebase, getFirestore } = require('./config/firebase.config');

async function promote() {
    await initializeFirebase();
    const db = getFirestore();
    const email = 'testuser@collegeproject.com';
    
    console.log(`Promoting ${email} to Admin...`);
    const snapshot = await db.collection('users').where('email', '==', email).get();
    
    if (snapshot.empty) {
        console.log('User not found in Firestore. Creating user entry...');
        const res = await db.collection('users').add({
            email,
            role: 'Admin',
            status: 'Active',
            displayName: 'Test Admin',
            createdAt: new Date().toISOString()
        });
        console.log(`Created new admin user with ID: ${res.id}`);
    } else {
        console.log(`Found ${snapshot.size} user(s) with this email.`);
        for (const doc of snapshot.docs) {
            await doc.ref.update({ role: 'Admin', status: 'Active' });
            console.log(`Updated user ${doc.id} to Admin role.`);
        }
    }
    console.log('Done.');
    process.exit(0);
}

promote();
