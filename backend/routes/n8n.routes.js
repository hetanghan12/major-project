const express = require('express');
const router = express.Router();
const n8nController = require('../controllers/n8n.controller');

// N8N Webhook Endpoint (Assume network or secret auth in prod)
router.post('/ai-usage', n8nController.handleAiUsageWebhook);

module.exports = router;
