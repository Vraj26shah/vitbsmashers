import express from 'express';
import { protect, requireCompleteProfile } from '../middleware/authMiddleware.js';
import {
  createOrder,
  createCheckoutSession,
  verifyPayment,
  paymentCallback,
  getOrder,
  webhook,
} from '../controllers/paymentController.js';

const router = express.Router();

// Create Razorpay order (requires complete profile)
router.post('/create-order',            protect, requireCompleteProfile, createOrder);
router.post('/create-checkout-session', protect, requireCompleteProfile, createCheckoutSession);

// Verify payment after Razorpay callback
router.post('/verify', protect, verifyPayment);
router.post('/callback', express.urlencoded({ extended: false }), paymentCallback);

// Get order details
router.get('/session/:orderId', protect, getOrder);

// Razorpay webhook (raw body for signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

export default router;
