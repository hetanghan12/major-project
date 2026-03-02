const { initializeFirebase, getFirestore } = require('./config/firebase.config');

async function seedData() {
    console.log('🌱 Seeding demo usage data...');
    initializeFirebase();
    const db = getFirestore();
    
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@cloudspace.com';
        const users = await db.collection('users').where('email', '==', adminEmail).get();
        if (users.empty) {
            console.error('❌ User not found, cannot seed.');
            process.exit(1);
        }
        const userId = users.docs[0].id;

        const demoLog = {
            userId: userId,
            model: 'gpt-4o',
            type: 'CHAT',
            usage: {
                prompt_tokens: 150,
                completion_tokens: 450,
                total_tokens: 600
            },
            cost: 0.009,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        };

        await db.collection('ai_usage').add(demoLog);
        console.log('✅ Demo log added successfully!');
        
    } catch (e) {
        console.error('Seed Failed:', e);
    }
    process.exit(0);
}

seedData();
