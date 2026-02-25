const { initializeFirebase, getFirestore } = require('./config/firebase.config');

async function seedPlans() {
    try {
        console.log('Initializing Firebase...');
        await initializeFirebase();
        const db = getFirestore();
        
        const plans = [
            {
                name: 'Starter',
                description: 'For individuals starting their AI journey',
                price: 0,
                features: ['5 GB Secure Storage', 'Standard AI Support', 'Daily Document Sync', 'Community Access'],
                limits: { storage: 5 * 1024 * 1024 * 1024 },
                isPopular: false,
                buttonText: 'Get Started'
            },
            {
                name: 'Professional',
                description: 'Everything you need to boost productivity',
                price: 19,
                features: ['100 GB Secure Storage', 'Advanced AI Analysis', 'Unlimited Document Sync', 'Priority Support', 'Full API Access'],
                limits: { storage: 100 * 1024 * 1024 * 1024 },
                isPopular: true,
                buttonText: 'Go Pro'
            },
            {
                name: 'Enterprise',
                description: 'Advanced features for scaling teams',
                price: 99,
                features: ['Unlimited Storage', 'Team Collaboration', 'Custom AI Models', '24/7 Dedicated Support', 'Custom Branding'],
                limits: { storage: -1 },
                isPopular: false,
                buttonText: 'Contact Sales'
            }
        ];

        console.log('Seeding plans to Firestore...');
        const batch = db.batch();
        const plansCol = db.collection('subscription_plans');
        
        // Clear existing (optional, but good for clean start)
        const snapshot = await plansCol.get();
        snapshot.forEach(doc => batch.delete(doc.ref));
        
        plans.forEach(plan => {
            const docRef = plansCol.doc();
            batch.set(docRef, { ...plan, createdAt: new Date().toISOString() });
        });

        await batch.commit();
        console.log('✅ Successfully seeded 3 plans to Firestore!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedPlans();
