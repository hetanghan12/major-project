/**
 * THUMBNAIL REGENERATION SCRIPT
 * ==============================
 * Generates thumbnails for existing documents that were uploaded
 * before the thumbnail system was implemented.
 * 
 * Run with: node scripts/regenerate-thumbnails.js
 * 
 * @author CloudAI Rendering Engine
 */

const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import services
const { initializeFirebase, getFirestore } = require('../config/firebase.config');
const { generateThumbnail } = require('../services/thumbnail.service');
const { updateDocumentStatus } = require('../services/firestore.service');

// Initialize Firebase
initializeFirebase();

const DOCUMENTS_COLLECTION = 'documents';
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

async function regenerateThumbnails() {
    console.log('🖼️ Starting thumbnail regeneration for existing documents...\n');

    const db = getFirestore();

    try {
        // Get all documents that don't have thumbnails
        const snapshot = await db.collection(DOCUMENTS_COLLECTION)
            .where('status', '==', 'ready')
            .get();

        if (snapshot.empty) {
            console.log('No documents found.');
            return;
        }

        console.log(`Found ${snapshot.size} documents to process.\n`);

        let processed = 0;
        let success = 0;
        let failed = 0;
        let skipped = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            processed++;

            console.log(`\n[${processed}/${snapshot.size}] ${data.fileName}`);

            // Skip if already has thumbnail
            if (data.thumbnailUrl) {
                console.log('   ⏭️ Already has thumbnail - skipping');
                skipped++;
                continue;
            }

            // Find the local file
            const userId = data.userId;
            const documentId = data.documentId;
            const storagePath = data.storagePath;

            let filePath = null;

            // Try storage path first
            if (storagePath && fs.existsSync(storagePath)) {
                filePath = storagePath;
            } else {
                // Try to find in user storage directory
                const userDir = path.join(STORAGE_DIR, 'users', userId, 'documents');
                if (fs.existsSync(userDir)) {
                    const files = fs.readdirSync(userDir);
                    const matchingFile = files.find(f => f.includes(documentId));
                    if (matchingFile) {
                        filePath = path.join(userDir, matchingFile);
                    }
                }
            }

            if (!filePath || !fs.existsSync(filePath)) {
                console.log(`   ❌ File not found: ${storagePath || 'unknown'}`);
                failed++;
                continue;
            }

            console.log(`   📁 Found: ${filePath}`);

            try {
                // Generate thumbnail
                const result = await generateThumbnail(
                    filePath,
                    documentId,
                    data.fileType,
                    null
                );

                // Update database
                await updateDocumentStatus(documentId, 'ready', {
                    thumbnailUrl: result.thumbnailUrl,
                    thumbnailGenerated: true,
                    thumbnailGeneratedAt: new Date().toISOString()
                });

                console.log(`   ✅ Generated: ${result.thumbnailUrl}`);
                success++;

            } catch (error) {
                console.error(`   ❌ Failed: ${error.message}`);
                failed++;
            }
        }

        console.log('\n========================================');
        console.log('📊 REGENERATION COMPLETE');
        console.log('========================================');
        console.log(`   Total:    ${snapshot.size}`);
        console.log(`   Success:  ${success}`);
        console.log(`   Failed:   ${failed}`);
        console.log(`   Skipped:  ${skipped}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

// Run
regenerateThumbnails();
