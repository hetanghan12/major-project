const { initializeFirebase, getFirestore } = require('./config/firebase.config');
require('dotenv').config();

async function run() {
    try {
        initializeFirebase();
        const db = getFirestore();
        const snapshot = await db.collection('documents').get();
        console.log(`TOTAL_DOCS: ${snapshot.size}`);

        const batch = db.batch();
        let changed = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'ready' || data.isTrashed === true) {
                // If it's trashed, we might want to keep it trashed, 
                // but let's at least make sure it has 'ready' status if it's not actually trashed
                if (data.status !== 'ready') {
                    batch.update(doc.ref, { status: 'ready' });
                    changed++;
                }
            }
        });

        if (changed > 0) {
            await batch.commit();
            console.log(`UPDATED ${changed} documents to 'ready' status.`);
        } else {
            console.log('NO documents needed updating.');
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

run();
