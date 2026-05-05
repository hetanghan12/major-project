const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// Protect all settings routes
router.use(verifyFirebaseToken);

// Get and update settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Special Actions
router.post('/ai/clear-history', settingsController.clearAIHistory);
router.delete('/account', settingsController.deleteAccount);

module.exports = router;
