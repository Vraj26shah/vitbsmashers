import express from 'express';
<<<<<<< HEAD
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
=======
import { protect } from '../middleware/authMiddleware.js';
import { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory, 
  processRefund 
} from '../controllers/paymentController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment routes
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history/:userId', getPaymentHistory);
router.post('/refund', processRefund);

export default router;
>>>>>>> fdd6e78948f8e4305d27bae3121f890b1b7be85a
