const express = require('express');
const router = express.Router();
const { getSubscriptionPlans } = require('../services/firestore.service');
const { verifyFirebaseToken } = require('../middlewares/auth.middleware');

router.get('/', verifyFirebaseToken, async (req, res) => {
    try {
        const plans = await getSubscriptionPlans();
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Failed to fetch subscription plans:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch plans' });
    }
});

module.exports = router;
