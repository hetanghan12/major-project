const express = require('express');
const router = express.Router();
const mfaController = require('../controllers/mfa.controller');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(verifyFirebaseToken);

// Custom MFA Setup Routes
router.get('/status', mfaController.getMfaStatus);
router.post('/setup', mfaController.startSetup);
router.post('/verify-setup', mfaController.verifySetup);
router.post('/verify-login', mfaController.verifyLogin);
router.delete('/disable', mfaController.disableMfa);

module.exports = router;
