const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { verifyFirebaseToken, isAdmin } = require('../middlewares/auth.middleware');

// Create a new Razorpay order
router.post('/create-order', verifyFirebaseToken, paymentController.createOrder);

// Verify payment signature from Razorpay after success
router.post('/verify', verifyFirebaseToken, paymentController.verifyPayment);

// Get user's active subscription
router.get('/subscription', verifyFirebaseToken, paymentController.getUserSubscription);

// Admin: Get all subscriptions
router.get('/all-subscriptions', verifyFirebaseToken, isAdmin, paymentController.getAllSubscriptions);

module.exports = router;
