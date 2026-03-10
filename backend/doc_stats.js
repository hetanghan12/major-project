const { initializeFirebase, getFirestore } = require('./config/firebase.config');
require('dotenv').config();

async function run() {
    try {
        initializeFirebase();
        const db = getFirestore();
        const snapshot = await db.collection('documents').get();
        console.log(`TOTAL_DOCS_GLOBAL: ${snapshot.size}`);

        const stats = {
            byStatus: {},
            byTrashed: { true: 0, false: 0, undefined: 0 },
            byFolder: { true: 0, false: 0 },
            byParentFolderId: {}
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            stats.byStatus[data.status] = (stats.byStatus[data.status] || 0) + 1;

            const isTrashed = data.isTrashed;
            if (isTrashed === true) stats.byTrashed.true++;
            else if (isTrashed === false) stats.byTrashed.false++;
            else stats.byTrashed.undefined++;

            if (data.isFolder) stats.byFolder.true++; else stats.byFolder.false++;

            const pid = data.parentFolderId || 'null_or_empty';
            stats.byParentFolderId[pid] = (stats.byParentFolderId[pid] || 0) + 1;
        });

        console.log('STATS:', JSON.stringify(stats, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

run();
