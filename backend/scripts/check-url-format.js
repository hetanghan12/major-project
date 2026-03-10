require('dotenv').config({ path: '../.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');

function main() {
    try {
        initializeFirebase();
        const db = getFirestore();
        db.collection('documents').limit(2).get().then(snap => {
            snap.forEach(doc => {
                const data = doc.data();
                console.log({
                    fileName: data.fileName,
                    thumbnailUrl: data.thumbnailUrl,
                    previewUrl: data.previewUrl,
                    s3Url: data.s3Url
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
