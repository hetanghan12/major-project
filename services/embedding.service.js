/**
 * Embedding Service
 * ==================
 * Handles embedding generation and vector storage.
 * 
 * @author College Project
 */

const { generateEmbedding, generateEmbeddings } = require('../config/openai.config');
const { upsertVectors, queryVectors, deleteVectorsByDocument } = require('../config/pinecone.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Process document chunks and store embeddings
 * 
 * SECURITY: Stores vectors in user-isolated namespace
 * DELETION: Returns chunk IDs for explicit ID-based deletion
 * 
 * @param {string} userId - User ID for namespace isolation
 * @param {string} documentId - Document ID
 * @param {string} fileName - Original file name
 * @param {Array} chunks - Array of text chunks
 * @param {Object} options - Options including checkCancellation callback
 * @returns {Object} Result with vectorCount and chunkIds for later deletion
 */
async function processAndStoreEmbeddings(userId, documentId, fileName, chunks, options = {}) {
    const { checkCancellation } = options;
    console.log(`\n🧠 ========== EMBEDDING PIPELINE START ==========`);
    console.log(`   Document: ${documentId}`);
    console.log(`   User: ${userId}`);
    console.log(`   File: ${fileName}`);

    if (!chunks || chunks.length === 0) {
        console.log('   ❌ ABORT: No chunks to process');
        return { success: false, vectorCount: 0, chunkIds: [], error: 'No chunks provided' };
    }
    console.log(`   📦 Chunks received: ${chunks.length}`);

    try {
        // Extract just the text from chunks
        const texts = chunks.map(chunk => chunk.text || chunk);
        console.log(`   📝 Texts extracted: ${texts.length}`);

        // Generate embeddings in batches to avoid rate limits
        const batchSize = 20;
        const vectors = [];
        const chunkIds = [];  // CRITICAL: Track IDs for deletion
        let totalUsage = { prompt_tokens: 0, total_tokens: 0 };
        const EXPECTED_DIM = 3072;

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`   📊 Generating embeddings: batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)`);

            const { embeddings, usage } = await generateEmbeddings(batch);
            console.log(`   ✅ Got ${embeddings.length} embeddings (${usage.total_tokens} tokens)`);
            
            // Accumulate usage
            totalUsage.prompt_tokens += (usage.prompt_tokens || 0);
            totalUsage.total_tokens += (usage.total_tokens || 0);

            // Check for cancellation after embedding generation but before vector preparation
            if (checkCancellation && (await checkCancellation())) {
                console.log(`   ⏹️ Cancellation detected during embedding generation for ${documentId}`);
                throw new Error('EMBEDDING_CANCELLED');
            }

            // Create vector objects with metadata
            for (let j = 0; j < embeddings.length; j++) {
                const chunkIndex = i + j;
                const embedding = embeddings[j];

                // CRITICAL: Verify dimension
                if (embedding.length !== EXPECTED_DIM) {
                    throw new Error(`DIMENSION MISMATCH: Got ${embedding.length}, expected ${EXPECTED_DIM}`);
                }

                // CRITICAL: Use consistent ID format for reliable deletion
                // Format: {documentId}_chunk_{index}
                const vectorId = `${documentId}_chunk_${chunkIndex}`;
                chunkIds.push(vectorId);  // Store for deletion tracking

                const chunkData = chunks[chunkIndex];

                vectors.push({
                    id: vectorId,
                    values: embedding,
                    metadata: {
                        userId: String(userId),
                        documentId: String(documentId),
                        fileName: String(fileName),
                        chunkIndex: chunkIndex,
                        text: (chunkData.text || chunkData).substring(0, 1000),
                        startIndex: chunkData.startIndex || 0,
                        endIndex: chunkData.endIndex || 0
                    }
                });
            }
        }

        console.log(`   🧮 Total vectors prepared: ${vectors.length} (dimension: ${EXPECTED_DIM})`);
        console.log(`   🔑 Chunk IDs generated: ${chunkIds.length}`);

        if (vectors.length === 0) {
            console.log('   ❌ ABORT: No vectors generated');
            return { success: false, vectorCount: 0, chunkIds: [], error: 'No vectors generated' };
        }

        // Check for cancellation right before upserting to Pinecone
        if (checkCancellation && (await checkCancellation())) {
            console.log(`   ⏹️ Cancellation detected before Pinecone upsert for ${documentId}`);
            throw new Error('EMBEDDING_CANCELLED');
        }

        // Upsert vectors to Pinecone with user namespace
        console.log(`   📤 Upserting to Pinecone namespace: ${userId}`);
        await upsertVectors(userId, vectors);

        console.log(`   ✅ SUCCESS: Stored ${vectors.length} vectors for document: ${documentId}`);
        console.log(`🧠 ========== EMBEDDING PIPELINE COMPLETE ==========\n`);

        // CRITICAL: Return chunkIds for storage in document metadata
        return {
            success: true,
            vectorCount: vectors.length,
            chunkIds: chunkIds,  // Used for explicit ID-based deletion
            usage: totalUsage   // Returned for analytics tracking
        };

    } catch (error) {
        console.error(`\n❌ ========== EMBEDDING PIPELINE FAILED ==========`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        console.error(`========== END ERROR ==========\n`);
        throw error; // Re-throw to surface the error
    }
}

/**
 * Search for relevant document chunks based on query
 * @param {string} userId - User ID for namespace isolation
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return
 */
async function searchDocuments(userId, query, topK = 5, sharedNamespaces = []) {
    console.log(`🔍 Searching documents for user: ${userId}`);
    if (sharedNamespaces.length > 0) {
        console.log(`   🔗 Including ${sharedNamespaces.length} shared namespaces`);
    }

    try {
        // Generate embedding for the query
        const { embedding: queryEmbedding, usage } = await generateEmbedding(query);

        // 1. Query Pinecone with user namespace (no filter needed)
        let allResults = await queryVectors(userId, queryEmbedding, topK);

        // 2. Query shared namespaces (with documentId filter)
        for (const ns of sharedNamespaces) {
            if (!ns.ownerId || !ns.documentIds || ns.documentIds.length === 0) continue;

            // Pinecone $in limit workaround (usually safe for nominal use cases)
            const filter = { documentId: { $in: ns.documentIds } };

            try {
                const sharedResults = await queryVectors(ns.ownerId, queryEmbedding, topK, filter);
                if (sharedResults.length > 0) {
                    allResults = allResults.concat(sharedResults);
                }
            } catch (err) {
                console.error(`   ⚠️ Failed to query shared namespace ${ns.ownerId}:`, err.message);
            }
        }

        // 3. Sort combined results by score descending and take topK
        allResults.sort((a, b) => b.score - a.score);
        const topResults = allResults.slice(0, topK);

        console.log(`   ✅ Found ${topResults.length} relevant chunks (combined)`);

        return {
            results: topResults.map(match => ({
                score: match.score,
                text: match.metadata?.text || '',
                documentId: match.metadata?.documentId || '',
                fileName: match.metadata?.fileName || '',
                chunkIndex: match.metadata?.chunkIndex || 0,
                isShared: match.metadata?.userId !== userId
            })),
            usage
        };

    } catch (error) {
        console.error('❌ Document search failed:', error.message);
        throw error;
    }
}

/**
 * Delete embeddings for a document
 * @param {string} userId - User ID
 * @param {string} documentId - Document ID to delete embeddings for
 */
async function deleteDocumentEmbeddings(userId, documentId) {
    console.log(`🗑️  Deleting embeddings for document: ${documentId}`);

    try {
        await deleteVectorsByDocument(userId, documentId);
        console.log(`   ✅ Deleted embeddings for document: ${documentId}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to delete embeddings:', error.message);
        throw error;
    }
}

/**
 * Build context from search results
 * @param {Array} searchResults - Search results from Pinecone
 * @returns {string} Combined context text
 */
function buildContext(searchResults) {
    if (!searchResults || searchResults.length === 0) {
        return '';
    }

    const contextParts = searchResults.map((result, index) => {
        return `[Document: ${result.fileName}]\n${result.text}`;
    });

    return contextParts.join('\n\n---\n\n');
}

module.exports = {
    processAndStoreEmbeddings,
    searchDocuments,
    deleteDocumentEmbeddings,
    buildContext
};
