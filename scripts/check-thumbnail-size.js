require('dotenv').config({ path: '../.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');
const { getDownloadUrl, initS3Service } = require('../services/s3.service');
const https = require('https');

async function main() {
    try {
        initializeFirebase();
        initS3Service();
        const db = getFirestore();
        const snap = await db.collection('documents').where('userId', '==', 'a2TZuD871OOp2r73HOS8ZBfp2ws2').limit(1).get()
        const data = snap.docs[0].data();
        let thumbnailUrl = data.thumbnailUrl;
        if (data.previewPath || (data.thumbnailUrl && data.thumbnailUrl.includes('.s3.'))) {
            const path = data.previewPath || new URL(data.thumbnailUrl).pathname.substring(1);
            thumbnailUrl = await getDownloadUrl(path, 3600);
        }

        console.log("Checking URL:", thumbnailUrl);

        https.get(thumbnailUrl, (res) => {
            console.log("Status Code:", res.statusCode);
            console.log("Content-Length:", res.headers['content-length']);
            console.log("Content-Type:", res.headers['content-type']);
            console.log("Content-Disposition:", res.headers['content-disposition']);
            res.on('data', () => { });
            res.on('end', () => process.exit(0))
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
