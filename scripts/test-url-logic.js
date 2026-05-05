require('dotenv').config({ path: '../.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');
const { getDownloadUrl, initS3Service } = require('../services/s3.service');

async function main() {
    try {
        initializeFirebase();
        initS3Service();
        const db = getFirestore();
        const snap = await db.collection('documents').limit(1).get()
        const data = snap.docs[0].data();
        let thumbnailUrl = data.thumbnailUrl;
        if (data.previewPath || (data.thumbnailUrl && data.thumbnailUrl.includes('.s3.'))) {
            const path = data.previewPath || new URL(data.thumbnailUrl).pathname.substring(1);
            thumbnailUrl = await getDownloadUrl(path, 3600);
        }
        console.log("Success generated URL:", thumbnailUrl);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
