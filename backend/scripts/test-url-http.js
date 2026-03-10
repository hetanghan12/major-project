require('dotenv').config({ path: '../.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');
const { getDownloadUrl, initS3Service } = require('../services/s3.service');
const https = require('https');

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

        console.log("Checking URL:", thumbnailUrl);

        https.get(thumbnailUrl, (res) => {
            console.log("Status Code:", res.statusCode);
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log("SUCCESS! Got image headers:", res.headers['content-type']);
                } else {
                    console.log("FAIL! AWS returned:", body.substring(0, 500));
                }
                process.exit(0);
            })
        }).on('error', (e) => {
            console.error(e);
            process.exit(1);
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
main();
