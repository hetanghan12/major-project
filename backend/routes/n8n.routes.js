const express = require('express');
const crypto = require('crypto');
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
  if (!providedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized webhook request'
    });
  }

  try {
    const a = Buffer.from(String(providedSecret), 'utf-8');
    const b = Buffer.from(String(configuredSecret), 'utf-8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized webhook request'
      });
    }
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized webhook request'
    });
  }

  return next();
}

router.post('/ai-usage', verifyWebhookSecret, n8nController.handleAiUsageWebhook);

module.exports = router;
