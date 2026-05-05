/**
 * Cleanup Ghost/Duplicate Files
 * ==============================
 * Removes analytics-only ghost records from the 'files' collection
 * that were created by the old logFileUpload bug.
 * 
 * These ghost records:
 * - Have NO documentId or uploadId field
 * - Have a storageProvider field set to "AWS_S3"
 * - Were created by analytics.service.js logFileUpload() as a duplicate
 * 
 * Run: node scripts/cleanup_ghost_files.js
 */

require('dotenv').config();
const { getFirestore } = require('../config/firebase.config');

async function cleanupGhostFiles() {
    const db = getFirestore();
    
    console.log('🔍 Scanning for ghost/duplicate files in "files" collection...\n');
    
    const filesSnap = await db.collection('files').get();
    
    let ghostCount = 0;
    let realCount = 0;
    const ghostRefs = [];
    
    filesSnap.forEach(doc => {
        const data = doc.data();
        
        // Ghost records: no documentId, no uploadId, but have storageProvider
        // These are the analytics-only duplicates
        if (!data.documentId && !data.uploadId && data.storageProvider) {
            ghostCount++;
            ghostRefs.push({ ref: doc.ref, name: data.fileName, id: doc.id });
            console.log(`  👻 GHOST: ${doc.id} — ${data.fileName} (${data.fileSize} bytes)`);
        } else {
            realCount++;
        }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Real files: ${realCount}`);
    console.log(`   Ghost files: ${ghostCount}`);
    console.log(`   Total in collection: ${filesSnap.size}`);
    
    if (ghostCount === 0) {
        console.log('\n✅ No ghost files found. Collection is clean!');
        return;
    }
    
    console.log(`\n🗑️  Deleting ${ghostCount} ghost records...`);
    
    // Delete in batches of 500 (Firestore limit)
    const batchSize = 500;
    for (let i = 0; i < ghostRefs.length; i += batchSize) {
        const batch = db.batch();
        const chunk = ghostRefs.slice(i, i + batchSize);
        
        chunk.forEach(ghost => {
            batch.delete(ghost.ref);
        });
        
        await batch.commit();
        console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${chunk.length} records)`);
    }
    
    console.log(`\n✅ Cleanup complete! Removed ${ghostCount} ghost records.`);
    console.log(`   Corrected file count: ${realCount}`);
}

cleanupGhostFiles()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Cleanup failed:', err);
        process.exit(1);
    });
