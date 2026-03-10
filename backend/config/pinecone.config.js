/**
 * Pinecone Vector Database Configuration
 * ========================================
 * Configures Pinecone client for vector storage and similarity search.
 * 
 * ============================================================================
 * SECURITY: USER NAMESPACE ISOLATION
 * ============================================================================
 * 
 * CRITICAL: Each user has their own isolated namespace in Pinecone.
 * This ensures complete data isolation between users.
 * 
 * RULES (NON-NEGOTIABLE):
 * 1. Namespace is ALWAYS derived from authenticated user's uid (req.user.uid)
 * 2. Namespace is NEVER accepted from frontend input (req.body, req.params, req.query)
 * 3. All Pinecone operations (upsert, query, delete) REQUIRE userId parameter
 * 4. Cross-user data access is IMPOSSIBLE by design
 * 
 * NAMESPACE STRATEGY:
 * - namespace = userId (Firebase UID)
 * - This is set server-side only from verified Firebase token
 * - The auth middleware extracts uid from verified token
 * 
 * @author College Project
 */

const { Pinecone } = require('@pinecone-database/pinecone');

let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone client
 * NOTE: API key is server-side only, never exposed to frontend
 */
async function initializePinecone() {
    if (pineconeClient) {
        return pineconeClient;
    }

    try {
        // SECURITY: API key from environment only, never from request
        pineconeClient = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });

        console.log('✅ Pinecone client initialized');
        return pineconeClient;
    } catch (error) {
        console.error('❌ Failed to initialize Pinecone:', error.message);
        throw error;
    }
}

/**
 * Get Pinecone index instance
 */
async function getPineconeIndex() {
    if (!pineconeClient) {
        await initializePinecone();
    }

    if (!pineconeIndex) {
        const indexName = process.env.PINECONE_INDEX_NAME || 'cloud-space';
        const host = process.env.PINECONE_HOST;

        if (host) {
            pineconeIndex = pineconeClient.index(indexName, host);
            console.log(`✅ Connected to Pinecone index via host: ${host}`);
        } else {
            pineconeIndex = pineconeClient.index(indexName);
            console.log(`✅ Connected to Pinecone index: ${indexName}`);
        }
    }

    return pineconeIndex;
}

/**
 * SECURITY: Validate and derive namespace from userId
 * This function ensures namespace is always derived correctly
 * 
 * @param {string} userId - MUST be from req.user.uid (verified token), NEVER from frontend
 * @returns {string} Validated namespace string
 * @throws {Error} If userId is invalid
 */
function deriveSecureNamespace(userId) {
    // SECURITY: Validate userId is provided and is a non-empty string
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        throw new Error('SECURITY VIOLATION: userId is required for namespace derivation');
    }

    // SECURITY: Validate userId format (Firebase UIDs are alphanumeric)
    if (!/^[a-zA-Z0-9]+$/.test(userId)) {
        throw new Error('SECURITY VIOLATION: Invalid userId format');
    }

    // Namespace = userId (from verified Firebase token)
    // This is deterministic and cannot be manipulated by the frontend
    return userId;
}

/**
 * Initialize/verify a user's namespace in Pinecone
 * 
 * NOTE: Pinecone namespaces are created automatically on first vector upsert.
 * This function checks if a namespace exists and returns its stats.
 * 
 * @param {string} userId - User ID from verified Firebase token
 * @returns {Object} Namespace info including vector count
 */
async function initializeUserNamespace(userId) {
    // SECURITY: Validate namespace from authenticated user
    const namespace = deriveSecureNamespace(userId);

    console.log(`🔧 Initializing/verifying namespace for user: ${namespace}`);

    try {
        const index = await getPineconeIndex();
        const stats = await index.describeIndexStats();

        // Check if this user's namespace exists
        const namespaceStats = stats.namespaces?.[namespace];

        if (namespaceStats) {
            console.log(`   ✅ Namespace exists: ${namespace}`);
            console.log(`      Vector count: ${namespaceStats.vectorCount || 0}`);
            return {
                exists: true,
                namespace: namespace,
                vectorCount: namespaceStats.vectorCount || 0,
                message: 'Namespace already exists'
            };
        } else {
            console.log(`   📝 Namespace does not exist yet: ${namespace}`);
            console.log(`      Will be created on first document upload`);
            return {
                exists: false,
                namespace: namespace,
                vectorCount: 0,
                message: 'Namespace will be created on first document upload'
            };
        }
    } catch (error) {
        console.error(`   ❌ Failed to check namespace: ${error.message}`);
        throw error;
    }
}

/**
 * Get stats for all namespaces (admin/debug function)
 * 
 * @returns {Object} Index stats with all namespaces
 */
async function getNamespaceStats() {
    try {
        const index = await getPineconeIndex();
        const stats = await index.describeIndexStats();

        const namespaces = Object.entries(stats.namespaces || {}).map(([name, data]) => ({
            namespace: name,
            vectorCount: data.vectorCount || 0
        }));

        console.log(`📊 Pinecone Index Stats:`);
        console.log(`   Total vectors: ${stats.totalVectorCount || 0}`);
        console.log(`   Total namespaces: ${namespaces.length}`);
        namespaces.forEach(ns => {
            console.log(`   - ${ns.namespace}: ${ns.vectorCount} vectors`);
        });

        return {
            totalVectorCount: stats.totalVectorCount || 0,
            dimension: stats.dimension,
            namespaces: namespaces
        };
    } catch (error) {
        console.error('❌ Failed to get namespace stats:', error.message);
        throw error;
    }
}

const EXPECTED_DIMENSION = 3072;
const UPSERT_BATCH_SIZE = 100;

/**
 * Upsert vectors to Pinecone with user namespace
 * 
 * SECURITY: namespace is derived from userId which MUST come from verified auth token
 * 
 * @param {string} userId - User ID from req.user.uid (NEVER from frontend input)
 * @param {Array} vectors - Array of vector objects with id, values, and metadata
 */

async function upsertVectors(userId, vectors) {
    // SECURITY: Validate and derive namespace from authenticated userId
    const namespace = deriveSecureNamespace(userId);

    console.log(`\n📤 ========== PINECONE UPSERT START ==========`);
    console.log(`   Namespace: ${namespace} (derived from authenticated userId)`);
    console.log(`   Vectors to upsert: ${vectors.length}`);

    if (!vectors || vectors.length === 0) {
        console.log('   ❌ ABORT: No vectors provided');
        throw new Error('No vectors provided for upsert');
    }

    // Validate all vectors have correct dimension
    for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i];
        if (!v.id || !v.values) {
            throw new Error(`Vector at index ${i} missing required fields (id, values)`);
        }
        if (v.values.length !== EXPECTED_DIMENSION) {
            throw new Error(`Vector ${v.id} has wrong dimension: ${v.values.length} (expected ${EXPECTED_DIMENSION})`);
        }
    }
    console.log(`   ✅ All vectors validated: dimension=${EXPECTED_DIMENSION}`);

    const index = await getPineconeIndex();
    // SECURITY: Use validated namespace derived from authenticated user
    const pineconeNamespace = index.namespace(namespace);

    // Get stats BEFORE upsert
    let statsBefore;
    try {
        statsBefore = await index.describeIndexStats();
        const nsStats = statsBefore.namespaces?.[namespace];
        console.log(`   📊 Stats BEFORE: Total=${statsBefore.totalVectorCount || 0}, Namespace=${nsStats?.vectorCount || 0}`);
    } catch (e) {
        console.log(`   ⚠️  Could not get pre-upsert stats: ${e.message}`);
    }

    // Upsert in batches
    let totalUpserted = 0;
    for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
        const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
        const batchNum = Math.floor(i / UPSERT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);

        console.log(`   📤 Upserting batch ${batchNum}/${totalBatches} (${batch.length} vectors)...`);

        try {
            const upsertResponse = await pineconeNamespace.upsert(batch);
            console.log(`   ✅ Batch ${batchNum} complete. Response:`, JSON.stringify(upsertResponse || 'acknowledged'));
            totalUpserted += batch.length;
        } catch (error) {
            console.error(`   ❌ Batch ${batchNum} FAILED: ${error.message}`);
            throw error;
        }
    }

    // Wait for eventual consistency
    console.log(`   ⏳ Waiting 2s for Pinecone eventual consistency...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get stats AFTER upsert
    let statsAfter;
    try {
        statsAfter = await index.describeIndexStats();
        const nsStats = statsAfter.namespaces?.[namespace];
        console.log(`   📊 Stats AFTER: Total=${statsAfter.totalVectorCount || 0}, Namespace=${nsStats?.vectorCount || 0}`);

        // Verify vectors were added
        const beforeCount = statsBefore?.namespaces?.[namespace]?.vectorCount || 0;
        const afterCount = nsStats?.vectorCount || 0;
        const diff = afterCount - beforeCount;

        if (diff > 0) {
            console.log(`   ✅ VERIFIED: ${diff} new vectors in namespace`);
        } else if (diff === 0 && totalUpserted > 0) {
            console.log(`   ⚠️  WARNING: Vector count unchanged. Possible ID overwrites or replication delay.`);
        }
    } catch (e) {
        console.log(`   ⚠️  Could not get post-upsert stats: ${e.message}`);
    }

    console.log(`   ✅ UPSERT COMPLETE: ${totalUpserted} vectors to namespace: ${namespace}`);
    console.log(`📤 ========== PINECONE UPSERT END ==========\n`);

    return { success: true, upsertedCount: totalUpserted };
}

/**
 * Query vectors from Pinecone with user namespace
 * 
 * SECURITY: namespace is derived from userId which MUST come from verified auth token
 * 
 * @param {string} userId - User ID from req.user.uid (NEVER from frontend input)
 * @param {Array} queryVector - Query embedding vector
 * @param {number} topK - Number of results to return
 */
async function queryVectors(userId, queryVector, topK = 5, filter = null) {
    // SECURITY: Validate and derive namespace from authenticated userId
    const namespace = deriveSecureNamespace(userId);

    const index = await getPineconeIndex();
    // SECURITY: Use validated namespace derived from authenticated user
    const pineconeNamespace = index.namespace(namespace);

    const queryOptions = {
        vector: queryVector,
        topK,
        includeMetadata: true
    };

    if (filter) {
        queryOptions.filter = filter;
    }

    const results = await pineconeNamespace.query(queryOptions);

    return results.matches || [];
}

/**
 * Delete vectors by document ID
 * 
 * SECURITY: namespace is derived from userId which MUST come from verified auth token
 * 
 * @param {string} userId - User ID from req.user.uid (NEVER from frontend input)
 * @param {string} documentId - Document ID to delete vectors for
 */
async function deleteVectorsByDocument(userId, documentId) {
    // SECURITY: Validate and derive namespace from authenticated userId
    const namespace = deriveSecureNamespace(userId);

    const index = await getPineconeIndex();
    const pineconeNamespace = index.namespace(namespace);

    // Delete by filter (document ID in metadata)
    await pineconeNamespace.deleteMany({
        filter: { documentId: { $eq: documentId } }
    });

    console.log(`✅ Deleted vectors for document: ${documentId} in namespace: ${namespace}`);
}

/**
 * Delete all vectors for a user
 * 
 * SECURITY: namespace is derived from userId which MUST come from verified auth token
 * 
 * @param {string} userId - User ID from req.user.uid (NEVER from frontend input)
 */
async function deleteUserNamespace(userId) {
    // SECURITY: Validate and derive namespace from authenticated userId
    const namespace = deriveSecureNamespace(userId);

    const index = await getPineconeIndex();
    const pineconeNamespace = index.namespace(namespace);

    await pineconeNamespace.deleteAll();
    console.log(`✅ Deleted all vectors for user namespace: ${namespace}`);
}

module.exports = {
    initializePinecone,
    getPineconeIndex,
    deriveSecureNamespace,
    initializeUserNamespace,  // Initialize/verify user namespace on login
    getNamespaceStats,        // Get all namespace stats (admin/debug)
    upsertVectors,
    queryVectors,
    deleteVectorsByDocument,
    deleteUserNamespace
};
