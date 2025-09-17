import express from 'express';

import paymentController from '../controllers/paymentController.js';
import authMiddlewareModule from '../middleware/authMiddleware.js';
import Order from '../models/orderModel.js';

const router = express.Router();

// Payment routes require login AND complete profile
router.post(
  '/create-checkout-session',
  authMiddlewareModule.protect, // Protect route
  authMiddlewareModule.requireCompleteProfile, // Require complete profile
  paymentController.createCheckoutSession
);

// Get payment order details
router.get(
  '/session/:orderId',
  authMiddlewareModule.protect,
  async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if the order belongs to the authenticated user
      if (order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Payment verification route
router.post(
  '/verify',
  authMiddlewareModule.protect,
  async (req, res) => {
    try {
      const { order_id, payment_id, signature } = req.body;

      // Use the payment service to verify
      const paymentService = (await import('../service/paymentService.js')).default;
      const isValid = await paymentService.verifyPayment(order_id, payment_id, signature);

      if (isValid) {
        // Find and update the order
        const order = await Order.findById(order_id);
        if (order) {
          order.status = 'completed';
          await order.save();

          // Grant access to purchased courses
          const User = (await import('../models/user.model.js')).default;
          const user = await User.findById(order.user);
          if (user) {
            let courseIds = [];

            // Handle both single course and cart-based orders
            if (order.items && order.items.length > 0) {
              // Cart-based order
              courseIds = order.items.map(item => item.courseId);
            } else if (order.courseId) {
              // Single course order
              courseIds = [order.courseId];
            }

            const newCourses = courseIds.filter(courseId => !user.purchasedCourses.includes(courseId));
            if (newCourses.length > 0) {
              user.purchasedCourses.push(...newCourses);
              await user.save();
            }
          }
        }

        res.json({ success: true, message: 'Payment verified successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Payment verification failed' });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
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
