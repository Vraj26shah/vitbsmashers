import express from 'express';

import paymentController from '../controllers/paymentController.js';
import authMiddlewareModule from '../middleware/authMiddleware.js';
import Order from '../models/orderModel.js';

const router = express.Router();

router.post(
  '/create-checkout-session',
  authMiddlewareModule.authMiddleware, // Protect route
  paymentController.createCheckoutSession
);

// Get payment session details
router.get(
  '/session/:sessionId',
  authMiddlewareModule.authMiddleware,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const order = await Order.findOne({ stripeSessionId: sessionId });
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Webhook route (must be before express.json() in app.js for raw body)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhook
);

export default router;
