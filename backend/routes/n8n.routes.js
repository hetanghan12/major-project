const express = require('express');
const router = express.Router();
const n8nController = require('../controllers/n8n.controller');

function verifyWebhookSecret(req, res, next) {
    const configuredSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!configuredSecret) {
        return res.status(503).json({
            success: false,
            message: 'Webhook integration is not configured'
        });
    }

    const providedSecret = req.headers['x-webhook-secret'];
    if (providedSecret !== configuredSecret) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized webhook request'
        });
    }

    return next();
}

router.post('/ai-usage', verifyWebhookSecret, n8nController.handleAiUsageWebhook);

module.exports = router;
