require('dotenv').config({ path: '.env' });
const { initializeFirebase, getFirestore } = require('../config/firebase.config');
const { initializeAWS } = require('../config/aws.config');
const { renderThumbnail } = require('../services/render.service');
const { updateDocumentStatus } = require('../services/firestore.service');

async function fixAllThumbnails() {
    console.log("🚀 Starting thumbnail regeneration script for ALL documents...");
    initializeFirebase();
    initializeAWS();

    const db = getFirestore();
    const snapshot = await db.collection('documents').get();

    if (snapshot.empty) {
        console.log("   ❌ No documents found in database.");
        return;
    }

    console.log(`   📊 Found ${snapshot.size} documents total.`);

    let processed = 0;
    let success = 0;
    let fail = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        processed++;

        console.log(`\n📄 [${processed}/${snapshot.size}] Processing: ${data.fileName}`);

        // Skip files that have no s3Key because we can't extract without it
        if (!data.s3Key) {
            console.log(`   ⚠️ Skipped: No s3Key in DB (Older file format without S3)`);
            continue;
        }

        try {
            // Update UI immediately to processing so no stale data shows
            await db.collection('documents').doc(data.documentId).update({
                thumbnailStatus: 'processing'
            });

            const result = await renderThumbnail({
                s3Key: data.s3Key,
                documentId: data.documentId,
                userId: data.userId,
                fileType: data.fileType,
                fileName: data.fileName
            });

            // Update to ready
            await db.collection('documents').doc(data.documentId).update({
                thumbnailUrl: result.previewUrl,
                previewUrl: result.previewUrl,
                previewPath: result.previewPath,
                thumbnailStatus: 'ready',
                previewMethod: result.method,
                previewGeneratedAt: new Date().toISOString()
            });

            console.log(`   ✅ Success! High quality thumbnail saved (${result.method})`);
            success++;
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            await db.collection('documents').doc(data.documentId).update({
                thumbnailStatus: 'failed'
            });
            fail++;
        }
    }

    console.log(`\n🎉 DONE! Regenerated ${success} thumbnails successfully. ${fail} failed.`);
    process.exit(0);
}

fixAllThumbnails().catch(console.error);
