/**
 * Logging Service
 * ===============
 * Handles logging of system events, especially AI usage metrics.
 * Stores data in Firestore under the 'ai_usage' collection.
 */

const { getFirestore } = require('../config/firebase.config');

/**
 * Log AI Usage
 * @param {Object} usageData - The usage data to log
 * @param {string} usageData.userId - ID of the user who made the request
 * @param {string} usageData.model - Name of the AI model used (e.g. 'gpt-3.5-turbo')
 * @param {string} usageData.type - Type of AI operation ('CHAT', 'EMBEDDING', etc.)
 * @param {Object} usageData.usage - Token usage metadata
 * @param {number} usageData.usage.prompt_tokens - Tokens used in the prompt
 * @param {number} usageData.usage.completion_tokens - Tokens used in the completion
 * @param {number} usageData.usage.total_tokens - Total tokens used
 * @param {number} usageData.cost - Estimated cost of the operation in USD
 */
async function logAIUsage(usageData) {
    try {
        const db = getFirestore();
        const usageRef = db.collection('ai_usage');
        
        const logEntry = {
            ...usageData,
            timestamp: new Date().toISOString(),
            createdAt: new Date() // For easier filtering in Firestore
        };

        await usageRef.add(logEntry);
        console.log(`📊 AI Usage Logged: ${usageData.type} | ${usageData.model} | ${usageData.usage.total_tokens} tokens`);
    } catch (error) {
        console.error('❌ Failed to log AI usage:', error.message);
        // We don't throw here to avoid failing the main request if logging fails
    }
}

/**
 * Calculate estimated cost based on model and tokens
 * @param {string} model - Model name
 * @param {Object} usage - Token usage
 * @returns {number} Estimated cost in USD
 */
function calculateEstimatedCost(model, usage) {
    // Current AI rates (approximate USD per token)
    const rates = {
        'gpt-3.5-turbo': { prompt: 0.0000005, completion: 0.0000015 },
        'gpt-4':         { prompt: 0.00003,   completion: 0.00006   },
        'gpt-4o':        { prompt: 0.000005,  completion: 0.000015  },
        'claude-3-sonnet': { prompt: 0.000003, completion: 0.000015 },
        'text-embedding-3-large': { prompt: 0.00000013, completion: 0 }
    };

    // Use specific rate or a safe default (like gpt-3.5 rates)
    let rate = rates[model];
    
    // Fuzzy matching for n8n or generic model names
    if (!rate) {
        if (model.includes('gpt-4')) rate = rates['gpt-4o'];
        else if (model.includes('gpt-3')) rate = rates['gpt-3.5-turbo'];
        else rate = { prompt: 0.000001, completion: 0.000002 }; // Safe default
    }
    
    const promptCost = (usage.prompt_tokens || 0) * rate.prompt;
    const completionCost = (usage.completion_tokens || 0) * rate.completion;
    
    return Number((promptCost + completionCost).toFixed(6));
}

module.exports = {
    logAIUsage,
    calculateEstimatedCost
};
