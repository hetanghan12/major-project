/**
 * Logging Service
 * ===============
 * Handles logging of system events, especially AI usage metrics.
 * Stores data in Firestore under the 'ai_usage' collection.
 */

const { getFirestore } = require('firebase-admin/firestore');

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
    // Current OpenAI rates (approximate)
    const rates = {
        'gpt-3.5-turbo': { prompt: 0.0000005, completion: 0.0000015 }, // $0.50 / 1M input, $1.50 / 1M output
        'text-embedding-3-large': { prompt: 0.00000013, completion: 0 } // $0.13 / 1M tokens
    };

    const rate = rates[model] || { prompt: 0, completion: 0 };
    
    const promptCost = (usage.prompt_tokens || 0) * rate.prompt;
    const completionCost = (usage.completion_tokens || 0) * rate.completion;
    
    return Number((promptCost + completionCost).toFixed(6));
}

module.exports = {
    logAIUsage,
    calculateEstimatedCost
};
