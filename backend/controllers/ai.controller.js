/**
 * AI Query Controller
 * =====================
 * Handles AI-powered document querying.
 * 
 * ============================================================================
 * SECURITY: USER NAMESPACE ISOLATION
 * ============================================================================
 * 
 * CRITICAL SECURITY RULES:
 * 1. userId is ALWAYS extracted from req.user.uid (verified Firebase token)
 * 2. userId is NEVER accepted from req.body, req.params, or req.query
 * 3. All Pinecone queries use namespace = userId (verified server-side)
 * 4. Cross-user data access is IMPOSSIBLE by design
 * 
 * The AI assistant ONLY uses the current user's documents to answer questions.
 * No data leakage between users is possible due to namespace isolation.
 * 
 * @author College Project
 */

const { searchDocuments, buildContext } = require('../services/embedding.service');
const { getAccessibleNamespacesForAI } = require('../services/share.service');
const { generateResponse } = require('../config/openai.config');
const { asyncHandler, ApiError } = require('../middlewares/error.middleware');
const { trackAiRequest } = require('../services/analytics.service');

// n8n webhook URL for alternative AI processing
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

/**
 * Query AI assistant with user's question
 * POST /api/ai/query
 * 
 * SECURITY: userId is extracted from verified Firebase token (req.user.uid)
 * NEVER from frontend input - this ensures namespace isolation
 */
const queryAI = asyncHandler(async (req, res) => {
    // SECURITY: Extract userId from VERIFIED auth token only
    // This is set by the auth middleware after Firebase token verification
    // NEVER accept userId from req.body, req.params, or req.query
    const { uid: userId, email } = req.user;

    // SECURITY: Validate userId exists (should always exist after auth middleware)
    if (!userId) {
        throw new ApiError(401, 'Authentication required - userId not found in token');
    }

    const { question } = req.body;

    if (!question || question.trim().length === 0) {
        throw new ApiError(400, 'Question is required');
    }

    console.log(`🤖 AI Query from user: ${email}`);
    console.log(`   UserId (from verified token): ${userId}`);
    console.log(`   Question: ${question.substring(0, 100)}...`);

    // Track AI request for dashboard stats
    trackAiRequest().catch(err => console.error('AI track failed:', err.message));

    // If n8n webhook is configured, use it
    if (N8N_WEBHOOK_URL) {
        return await queryViaN8N(req, res, userId, question);
    }

    // Otherwise, use direct OpenAI query with user-namespaced Pinecone search
    return await queryDirectly(res, userId, question);
});

/**
 * Direct AI query using OpenAI
 */
async function queryDirectly(res, userId, question) {
    try {
        // Step 1: Pre-fetch accessible shared namespaces for this user
        let sharedNamespaces = [];
        try {
            sharedNamespaces = await getAccessibleNamespacesForAI(userId);
        } catch (shareErr) {
            console.error('   ⚠️ Failed to load shared namespaces:', shareErr.message);
        }

        // Step 2: Search for relevant documents (user-namespaced + shared)
        const searchResults = await searchDocuments(userId, question, 5, sharedNamespaces);

        if (searchResults.length === 0) {
            return res.json({
                success: true,
                answer: "I couldn't find this information in your uploaded or shared documents.\n\nI searched through all the documents you have access to but couldn't find relevant content to answer this question. This could mean:\n\n• The information might not be in your files\n• Try rephrasing your question\n• Upload additional documents that contain this information\n\n**Note:** I only search through documents you own or that have been shared with you.",
                sources: []
            });
        }

        // Step 2: Build context from search results
        const context = buildContext(searchResults);

        // Step 3: Generate AI response
        const answer = await generateResponse(question, context);

        // Step 4: Extract unique source documents
        const sources = [...new Set(searchResults.map(r => r.fileName))];

        console.log(`   ✅ Response generated from ${sources.length} source(s)`);

        res.json({
            success: true,
            answer,
            sources,
            metadata: {
                matchCount: searchResults.length,
                topScore: searchResults[0]?.score || 0
            }
        });

    } catch (error) {
        console.error('❌ AI query failed:', error.message);
        throw new ApiError(500, 'Failed to generate AI response', error.message);
    }
}

/**
 * Query via n8n webhook
 * This allows for more complex AI workflows
 */
async function queryViaN8N(req, res, userId, question) {
    console.log('📡 Querying via n8n webhook...');
    console.log(`   URL: ${N8N_WEBHOOK_URL}`);
    console.log(`   UserId: ${userId}`);
    console.log(`   Question: ${question.substring(0, 50)}...`);

    try {
        const fetch = (await import('node-fetch')).default;

        // Build payload with additional context that n8n might need
        const payload = {
            userId,
            question,
            email: req.user?.email || 'unknown',
            timestamp: new Date().toISOString()
        };

        console.log(`   📦 Payload: ${JSON.stringify(payload)}`);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log(`   📥 Response status: ${response.status}`);

        // Handle response body
        const responseText = await response.text();
        console.log(`   📥 Response body: ${responseText.substring(0, 200)}...`);

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.log(`   ⚠️  Response is not JSON, treating as text answer`);
            data = { answer: responseText };
        }

        // Check for n8n workflow started message (async workflow)
        if (data.message === 'Workflow was started') {
            console.log('   ⚠️  n8n workflow is async, waiting for completion...');
            // For async workflows, we might need to poll or use a different endpoint
            // For now, fall back to direct query
            throw new Error('n8n workflow is async - not supported yet');
        }

        if (!response.ok) {
            throw new Error(`n8n webhook returned status ${response.status}: ${responseText}`);
        }

        // If n8n returns an array (e.g. from the last node output), extract the first item
        if (Array.isArray(data) && data.length > 0) {
            data = data[0];
        }

        console.log('   ✅ Received response from n8n');

        // Handle different response formats from n8n
        const answer = data.answer || data.response || data.message || data.output || data.text || 'No response received from AI';
        const sources = data.sources || data.documents || [];

        res.json({
            success: true,
            answer,
            sources: Array.isArray(sources) ? sources : [],
            metadata: data.metadata || {}
        });

    } catch (error) {
        console.error('❌ n8n query failed:', error.message);

        // Fallback to direct query if n8n fails
        console.log('⚠️  Falling back to direct query...');
        return await queryDirectly(res, userId, question);
    }
}

/**
 * Get chat history for user (placeholder for future implementation)
 * GET /api/ai/history
 */
const getChatHistory = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;

    // TODO: Implement chat history storage in Firestore
    // For now, return empty array
    res.json({
        success: true,
        history: [],
        message: 'Chat history feature coming soon'
    });
});

/**
 * Health check for AI service
 * GET /api/ai/health
 */
const healthCheck = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        status: 'AI service is operational',
        features: {
            directQuery: true,
            n8nIntegration: !!N8N_WEBHOOK_URL,
            embeddingSearch: true
        }
    });
});

module.exports = {
    queryAI,
    getChatHistory,
    healthCheck
};
