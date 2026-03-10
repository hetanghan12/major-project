const { getFirestore } = require('../config/firebase.config');

const PRICING = {
    'text-embedding-3-large': 0.00013 / 1000,
    'gpt-3.5-turbo': 0.0015 / 1000,
    'gpt-4': 0.03 / 1000,
    'gpt-4o': 0.005 / 1000
};

function calculateEstimatedCost(model, usage) {
    if (!usage || !usage.total_tokens) return 0;
    const rate = PRICING[model] || (0.002 / 1000); // Default fallback rate
    return usage.total_tokens * rate;
}

/**
 * Logs AI Usage to Firestore
 * Fire-and-forget (errors are swallowed)
 */
exports.logAIUsage = (userId, model, type, usage) => {
    try {
        const firestore = getFirestore();
        const cost = calculateEstimatedCost(model, usage);

        // Fire-and-forget promise
        firestore.collection('ai_usage').add({
            userId,
            model,
            type, // CHAT | EMBEDDING
            usage, // { prompt_tokens, completion_tokens, total_tokens }
            cost,
            timestamp: new Date().toISOString(),
            createdAt: new Date()
        }).catch(err => {
            console.error('Failed to log AI usage to Firestore (inner):', err.message);
        });

    } catch (err) {
        console.error('Failed to log AI usage (outer):', err.message);
    }
};
