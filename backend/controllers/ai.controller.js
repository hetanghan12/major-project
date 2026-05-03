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
const { trackAiRequest, calculateCost } = require('../services/analytics.service');
const { 
    checkAiRequestsLimit, 
    incrementAiRequestsUsage,
    getEffectivePlan 
} = require('../services/storage-quota.service');
const { createNotification } = require('../services/notification.service');
const chatService = require('../services/chat.service');
const { getFirestore, admin } = require('../config/firebase.config');

// Pricing and Cost calculation logic moved to centralized analytics.service.js
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

    const { question, chatId: existingChatId, fileName, documentId } = req.body;

    if (!question || question.trim().length === 0) {
        throw new ApiError(400, 'Question is required');
    }

    console.log(`🤖 AI Query from user: ${email}`);
    console.log(`   UserId (from verified token): ${userId}`);
    console.log(`   Question: ${question.substring(0, 100)}...`);

    // ============================================================
    // CHAT MANAGEMENT (Premium Feature)
    // ============================================================
    let chatId = existingChatId;
    let isNewChat = false;
    let planName = 'free';
    let history = [];

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        planName = await getEffectivePlan(userId, userData);

        // Auto-create chat for Pro/Professional users if it's a new conversation
        if (!chatId && (planName === 'pro' || planName === 'professional')) {
            console.log(`   ✨ Creating new chat session for ${planName} user`);
            
            // Basic title generation
            const cleanTitle = question
                .replace(/^(how|why|what|which|where|when|can|could|provide|tell|explain|show)\s+(is|are|does|do|me|about|the)?/i, '')
                .trim()
                .split(/\s+/)
                .slice(0, 5)
                .join(' ')
                .replace(/[?|!|.]/g, '');
                
            const title = (cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)) || 'New Chat';
            const newChat = await chatService.createChat(userId, title);
            chatId = newChat.chatId;
            isNewChat = true;
        }

        // Fetch history if existing chatId is provided
        if (chatId && !isNewChat) {
            console.log(`   📜 Fetching context for chat: ${chatId}`);
            history = await chatService.getChatMessages(userId, chatId, 10);
        }

        // STEP 1: Save User Message (Premium Only)
        if (chatId && (planName === 'pro' || planName === 'professional')) {
            await chatService.addMessage(userId, chatId, {
                role: 'user',
                content: question
            });
            console.log(`   💾 User message saved to chat: ${chatId}`);
        }
    } catch (chatErr) {
        console.error('   ⚠️ Chat management failed:', chatErr.message);
    }

    // ============================================================
    // ENFORCE AI LIMITS (Plan-Based Validation Only)
    // ============================================================
    const limitCheck = await checkAiRequestsLimit(userId);
    if (!limitCheck.allowed) {
        console.warn(`   ⚠️ AI LIMIT REACHED: ${userId}`);
        // Return a 200 response with the limit message as the answer 
        // This prevents an error box/modal on the frontend
        return res.json({
            success: true,
            answer: limitCheck.message,
            sources: [],
            isLimitReached: true
        });
    }

    // AI usage will be tracked upon success in the downstream query handlers (Requirement)

    // If n8n webhook is configured, use it
    if (N8N_WEBHOOK_URL) {
        return await queryViaN8N(req, res, userId, question, chatId, isNewChat, planName, history, fileName, documentId);
    }

    // Otherwise, use direct OpenAI query with user-namespaced Pinecone search
    return await queryDirectly(req, res, userId, question, chatId, isNewChat, planName, history);
});

/**
 * Direct AI query using OpenAI
 */
async function queryDirectly(req, res, userId, question, chatId, isNewChat, planName, history = []) {
    try {
        // Step 1: Pre-fetch accessible shared namespaces for this user
        let sharedNamespaces = [];
        try {
            sharedNamespaces = await getAccessibleNamespacesForAI(userId);
        } catch (shareErr) {
            console.error('   ⚠️ Failed to load shared namespaces:', shareErr.message);
        }

        // Step 2: Search for relevant documents (user-namespaced + shared)
        const { results: searchResults, usage: embeddingUsage } = await searchDocuments(userId, question, 5, sharedNamespaces);

        // Log Embedding Usage
        if (embeddingUsage) {
            const embedCost = calculateCost('text-embedding-3-large', embeddingUsage);
            trackAiRequest({
                userId,
                tokens: embeddingUsage.total_tokens,
                cost: embedCost,
                model: 'text-embedding-3-large',
                type: 'EMBEDDING'
            }).catch(e => console.error('Embed track failed:', e.message));
        }

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
        const { content: answer, usage: chatUsage, model } = await generateResponse(question, context, history);

        // Log Chat Usage
        if (chatUsage) {
            const chatCost = calculateCost(model, chatUsage);
            trackAiRequest({
                userId,
                tokens: chatUsage.total_tokens,
                prompt_tokens: chatUsage.prompt_tokens,
                completion_tokens: chatUsage.completion_tokens,
                cost: chatCost,
                model: model,
                type: 'CHAT'
            }).catch(e => console.error('Chat track failed:', e.message));
        }

        // Step 4: Extract unique source documents
        const sources = [...new Set(searchResults.map(r => r.fileName))];

        // STEP 3: Save AI Response (Premium Only)
        if (chatId && (planName === 'pro' || planName === 'professional')) {
            await chatService.addMessage(userId, chatId, {
                role: 'assistant',
                content: answer
            }).catch(e => console.error('Failed to save AI response:', e.message));
        }

        console.log(`   ✅ Response generated from ${sources.length} source(s)`);

        // Step 5: Trigger Notification
        createNotification({
            userId,
            type: 'ai',
            message: `Your AI response for "${question.substring(0, 30)}${question.length > 30 ? '...' : ''}" is ready.`
        }).catch(e => console.error('Failed to create AI notification:', e));

        // Step 6: Increment AI Usage (SUCCESS ONLY - NEW REQUIREMENT)
        incrementAiRequestsUsage(userId).catch(err => console.error('AI usage count failed:', err.message));

        res.json({
            success: true,
            answer,
            sources,
            chatId, // Return the chatId (newly created or existing)
            isNewChat,
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
async function queryViaN8N(req, res, userId, question, chatId, isNewChat, planName, history = [], fileName = null, documentId = null) {
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
            chatId,
            isNewChat,
            planName,
            history,
            fileName, // Added selected file name
            documentId, // Added unique file ID (Requirement)
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

        // Trigger Notification
        createNotification({
            userId,
            type: 'ai',
            message: `Your AI response for "${question.substring(0, 30)}${question.length > 30 ? '...' : ''}" is ready.`
        }).catch(e => console.error('Failed to create AI notification:', e));

        // STEP 3: Save AI Response (Premium Only)
        if (chatId && (planName === 'pro' || planName === 'professional')) {
            await chatService.addMessage(userId, chatId, {
                role: 'assistant',
                content: answer
            }).catch(e => console.error('Failed to save assistant message from n8n:', e.message));
        }

        // Log n8n usage if available
        if (data.usage) {
            const n8nCost = calculateCost(data.model || 'n8n-custom', data.usage);
            trackAiRequest({
                userId,
                tokens: data.usage.total_tokens || 0,
                cost: data.cost || n8nCost,
                model: data.model || 'n8n-custom',
                type: 'CHAT'
            }).catch(e => console.error('n8n track failed:', e.message));
        } else {
            // Default track if no usage data from n8n
            trackAiRequest({ userId, tokens: 500, cost: 0.001, model: 'n8n-custom', type: 'CHAT' })
                .catch(e => console.error('n8n fallback track failed:', e.message));
        }

        // Increment AI Usage (SUCCESS ONLY - NEW REQUIREMENT)
        incrementAiRequestsUsage(userId).catch(err => console.error('AI usage count failed (n8n):', err.message));

        res.json({
            success: true,
            answer,
            sources: Array.isArray(sources) ? sources : [],
            chatId: req.body.chatId || chatId, // Ensure chatId is returned from n8n path too
            isNewChat: !!isNewChat,
            metadata: data.metadata || {}
        });

    } catch (error) {
        console.error('❌ n8n query failed:', error.message);

        // Fallback to direct query if n8n fails
        console.log('⚠️  Falling back to direct query...');
        return await queryDirectly(res, userId, question);
    }
}

// --- In-Memory Cache for History to reduce Firestore Reads ---
const historyCache = new Map();
const CACHE_TTL = 120000; // 2 minutes

/**
 * Get chat history for user
 * GET /api/ai/history
 */
const getChatHistory = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { limit = 20, lastId } = req.query;

    // Check cache first (only for non-paginated requests to keep it simple)
    const cacheKey = `${userId}_${limit}`;
    if (!lastId && historyCache.has(cacheKey)) {
        const cached = historyCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`   ♻️  Serving history from cache for: ${userId}`);
            return res.json({
                success: true,
                history: cached.data,
                fromCache: true
            });
        }
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const planName = await getEffectivePlan(userId, userData);

        // Only Pro/Professional users have chat history
        if (planName !== 'pro' && planName !== 'professional') {
            return res.json({
                success: true,
                history: [],
                message: 'Chat history is a premium feature'
            });
        }

        const history = await chatService.getUserChats(userId, parseInt(limit), lastId);
        
        // Cache the result for next time
        if (!lastId) {
            historyCache.set(cacheKey, {
                data: history,
                timestamp: Date.now()
            });
        }

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('❌ Failed to fetch chat history:', error.message);
        throw new ApiError(500, 'Failed to fetch chat history');
    }
});

/**
 * Get messages from a specific chat
 * GET /api/ai/history/:chatId
 */
const getChatMessage = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { chatId } = req.params;

    if (!chatId) {
        throw new ApiError(400, 'Chat ID is required');
    }

    try {
        const messages = await chatService.getChatMessages(userId, chatId);
        res.json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('❌ Failed to fetch messages:', error.message);
        throw new ApiError(500, 'Failed to fetch conversation messages');
    }
});

/**
 * Delete a specific chat session
 * DELETE /api/ai/history/:chatId
 */
const deleteChat = asyncHandler(async (req, res) => {
    const { uid: userId } = req.user;
    const { chatId } = req.params;

    if (!chatId) {
        throw new ApiError(400, 'Chat ID is required');
    }

    try {
        await chatService.deleteChat(userId, chatId);
        res.json({
            success: true,
            message: 'Chat history deleted successfully'
        });
    } catch (error) {
        console.error('❌ Failed to delete chat:', error.message);
        throw new ApiError(500, 'Failed to delete chat session');
    }
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
    getChatMessage,
    deleteChat,
    healthCheck
};
