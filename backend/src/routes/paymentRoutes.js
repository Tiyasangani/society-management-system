const express = require('express');
const router = express.Router();
const { recordPayment, listPayments, createOrder, verifyPayment } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', recordPayment); // resident pays own bill, admin can record any
router.get('/', listPayments);

// Razorpay online-payment flow
router.post('/create-order', createOrder); // Step 1: create a Razorpay order for a bill
router.post('/verify', verifyPayment);     // Step 2: verify signature + record payment after checkout

module.exports = router;
