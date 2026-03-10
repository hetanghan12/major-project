require('dotenv').config({ path: '../.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');

function main() {
    try {
        initializeFirebase();
        const db = getFirestore();
        db.collection('documents').limit(10).get().then(snap => {
            console.log("Total docs fetched:", snap.size);
            snap.forEach(doc => {
                const data = doc.data();
                console.log({
                    fileName: data.fileName,
                    thumbnailStatus: data.thumbnailStatus,
                    thumbnailUrl: data.thumbnailUrl ? "Exists" : "Null",
                    previewUrl: data.previewUrl ? "Exists" : "Null"
                });
            });
            process.exit(0);
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
