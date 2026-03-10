const { getFirestore } = require('../config/firebase.config');

const logAuditEvent = async (event, userEmail, userId, ipAddress, status, details = {}) => {
    try {
        const firestore = getFirestore();
        await firestore.collection('security_logs').add({
            eventType: event,
            user: userEmail,
            userId: userId || null,
            ipAddress: ipAddress,
            timestamp: new Date().toISOString(),
            status,
            details
        });
    } catch (err) {
        console.error('Audit log failed:', err.message);
    }
};

exports.handleAiUsageWebhook = async (req, res) => {
    try {
        const { userId, model, tokens, cost, type } = req.body;

        if (!userId || !model || tokens === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required payload parameters' });
        }

        const firestore = getFirestore();
        await firestore.collection('ai_usage').add({
            userId,
            model,
            usage: { total_tokens: tokens },
            cost: Number(cost) || 0,
            type: type || 'CHAT',
            timestamp: new Date().toISOString()
        });

        return res.status(200).json({ success: true, message: 'AI Usage successfully logged' });
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
