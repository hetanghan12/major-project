const { initializeFirebase, getFirestore } = require('./config/firebase.config');

async function checkDB() {
    try {
        initializeFirebase();
        const db = getFirestore();
        
        console.log('--- Checking Users ---');
        const users = await db.collection('users').get();
        console.log(`User count: ${users.size}`);
        users.forEach(doc => {
            console.log(`User ID: ${doc.id}, Role: ${doc.data().role}, Email: ${doc.data().email}`);
        });

        console.log('\n--- Checking AI Usage ---');
        const usage = await db.collection('ai_usage').get();
        console.log(`Usage records: ${usage.size}`);
        if (usage.size > 0) {
            const first = usage.docs[0].data();
            console.log('First record sample:', JSON.stringify(first, null, 2));
            console.log('Type of createdAt:', typeof first.createdAt);
            if (first.createdAt && first.createdAt.toDate) {
                console.log('createdAt is a Firestore Timestamp');
            } else {
                console.log('createdAt is NOT a Firestore Timestamp');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDB();
