const { initializeFirebase, getFirestore } = require('./config/firebase.config');

async function testFetch() {
    console.log('Starting Test...');
    initializeFirebase();
    const db = getFirestore();
    
    try {
        console.log('Fetching collections...');
        const collections = await db.listCollections();
        console.log('Collections present:', collections.map(c => c.id).join(', '));
        
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';
        console.log(`Searching for users with role 'Admin' or email '${adminEmail}'...`);
        
        const q1 = await db.collection('users').where('email', '==', adminEmail).get();
        console.log(`Found ${q1.size} admins by email.`);
        
        const q2 = await db.collection('users').where('role', '==', 'Admin').get();
        console.log(`Found ${q2.size} admins by role.`);

        const q3 = await db.collection('ai_usage').limit(1).get();
        console.log(`AI Usage record found? ${!q3.empty}`);
        
    } catch (e) {
        console.error('Test Failed:', e);
    }
    process.exit(0);
}

testFetch();
