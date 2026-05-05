const crypto = require('crypto');
const { getFirestore } = require('../config/firebase.config');

let Razorpay;
let isRazorpayInstalled = false;
try {
    Razorpay = require('razorpay');
    isRazorpayInstalled = true;
} catch (e) {
    console.warn('⚠️ Razorpay SDK not found. Using functional Mock Class for development.');
    Razorpay = class {
        constructor() {
            this.orders = {
                create: async (options) => ({
                    id: `order_mock_${Date.now()}`,
                    amount: options.amount,
                    currency: options.currency || 'INR'
                })
            };
        }
    };
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_123',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_abc123',
});

function hasLiveRazorpayConfig() {
    const hasSdk = isRazorpayInstalled;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return Boolean(
        hasSdk &&
        keyId &&
        keySecret &&
        keyId !== 'rzp_test_dummy_key_123' &&
        keySecret !== 'dummy_secret_abc123'
    );
}

exports.createOrder = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!req.user || !req.user.uid) {
            console.error('[Payment] Auth context missing in request');
            return res.status(401).json({ success: false, message: 'User authentication required' });
        }
        const uid = req.user.uid;
        const firestore = getFirestore();

        console.log(`[Payment] Creating order for plan: ${planId}, user: ${uid}`);

        // Fetch plan details from firestore
        const planDoc = await firestore.collection('subscription_plans').doc(planId).get();
        if (!planDoc.exists) {
            console.error(`[Payment] Plan not found: ${planId}`);
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        const planData = planDoc.data();
        const price = planData.price;

        if (!price || price <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid plan price' });
        }

        const amount = Math.round(price * 100);

        if (!hasLiveRazorpayConfig()) {
            console.error('[Payment] Razorpay is not configured for secure order creation');
            return res.status(503).json({
                success: false,
                message: 'Payments are temporarily unavailable'
            });
        }

        console.log(`[Payment] Using REAL Razorpay API...`);
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `receipt_order_${new Date().getTime()}_${uid.substring(0, 5)}`,
            notes: {
                planId: String(planId || 'unknown'),
                planName: String(planData.name || 'Cloud Space Plan'),
                userId: String(uid || 'unknown'),
                paymentMethod: 'UPI'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            planId: planId,
            key: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('❌ [Payment] createOrder error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error preparing payment',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
        const uid = req.user.uid;

        console.log(`[Payment] Verifying payment for user: ${uid}, plan: ${planId}`);

        if (!hasLiveRazorpayConfig()) {
            console.error('[Payment] Rejecting verification because Razorpay is not securely configured');
            return res.status(503).json({
                success: false,
                message: 'Payments are temporarily unavailable'
            });
        }

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
            return res.status(400).json({ success: false, message: 'Missing required payment verification fields' });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        const generated_signature = crypto
            .createHmac('sha256', secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        const firestore = getFirestore();

        // Fetch plan to get duration details
        const planDoc = await firestore.collection('subscription_plans').doc(planId).get();
        const planData = planDoc.exists ? planDoc.data() : { name: 'Unknown Plan', price: 0 };

        // Save subscription to the database
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Give 1 month duration

        const subscriptionData = {
            userId: uid,
            userEmail: req.user.email,
            planId: planId,
            planName: planData.name,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: planData.price,
            startDate: startDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            status: 'active',
            createdAt: new Date().toISOString()
        };

        // Save to subscriptions collection tracking all payments
        await firestore.collection('subscriptions').add(subscriptionData);

        // Also update current active user subscription in users collection
        // SECURITY: We update both legacy fields and the new 'plan' field used by quota service
        await firestore.collection('users').doc(uid).update({
            currentPlan: planId,
            planName: planData.name,
            planExpiry: expiryDate.toISOString(),
            limits: planData.limits || {},
            plan: planId.toLowerCase(), // CRITICAL: This links to our new PLANS config
            updatedAt: new Date().toISOString()
        });

        console.log(`[Payment] ✅ SUCCESSFULLY upgraded user ${uid} to plan: ${planId}`);

        res.json({
            success: true,
            message: 'Payment verification successful, plan upgraded.',
            subscription: subscriptionData
        });
    } catch (error) {
        console.error('Error in verifyPayment:', error);
        res.status(500).json({ success: false, message: 'Payment fulfillment failed', error: error.message });
    }
};

exports.getUserSubscription = async (req, res) => {
    try {
        const uid = req.user.uid;
        const firestore = getFirestore();

        // Get latest active subscription
        const snapshot = await firestore.collection('subscriptions')
            .where('userId', '==', uid)
            .where('status', '==', 'active')
            .orderBy('expiryDate', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.json({ success: true, subscription: null });
        }

        res.json({ success: true, subscription: snapshot.docs[0].data() });
    } catch (error) {
        console.error('Error getting user subscription:', error);
        res.status(500).json({ success: false, message: 'Failed to find subscription' });
    }
};

exports.getAllSubscriptions = async (req, res) => {
    try {
        const firestore = getFirestore();

        const snapshot = await firestore.collection('subscriptions')
            .orderBy('createdAt', 'desc')
            .get();

        const subscriptions = [];
        snapshot.forEach(doc => {
            subscriptions.push({ id: doc.id, ...doc.data() });
        });

        res.json({ success: true, subscriptions });
    } catch (error) {
        console.error('Error getting all subscriptions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
    }
};
