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
      console.log('🔐 Payment verification request:', { order_id, payment_id, signature });

      // Find the order - it could be MongoDB ObjectId or gateway order ID
      let order = null;

      // First try to find by MongoDB ObjectId
      if (order_id && order_id.length === 24 && /^[0-9a-fA-F]+$/.test(order_id)) {
        order = await Order.findById(order_id);
        console.log('📋 Found order by MongoDB ObjectId:', order?._id);
      }

      // If not found, try to find by gateway-specific order IDs
      if (!order) {
        order = await Order.findOne({
          $or: [
            { mockOrderId: order_id },
            { razorpayOrderId: order_id },
            { phonepeOrderId: order_id }
          ]
        });
        console.log('📋 Found order by gateway order ID:', order?._id);
      }

      if (!order) {
        console.log('❌ Order not found for ID:', order_id);
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Check if order belongs to authenticated user
      if (order.user.toString() !== req.user._id.toString()) {
        console.log('🚫 Order does not belong to user');
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      // Use the payment service to verify
      const paymentService = (await import('../service/paymentService.js')).default;

      // Debug order information
      console.log('📋 Order details for verification:', {
        orderId: order._id,
        razorpayOrderId: order.razorpayOrderId,
        mockOrderId: order.mockOrderId,
        status: order.status,
        gateway: order.razorpayOrderId ? 'razorpay' : (order.mockOrderId ? 'mock' : 'unknown')
      });

      // For Razorpay, we need to use the Razorpay order ID, not the MongoDB ObjectId
      let verificationOrderId = order_id;
      if (order.razorpayOrderId) {
        verificationOrderId = order.razorpayOrderId;
        console.log('🔄 Using Razorpay order ID for verification:', verificationOrderId);
      } else if (order.mockOrderId) {
        verificationOrderId = order.mockOrderId;
        console.log('🎭 Using Mock order ID for verification:', verificationOrderId);
      } else {
        console.log('⚠️ No gateway-specific order ID found, using MongoDB ObjectId');
      }

      const isValid = await paymentService.verifyPayment(verificationOrderId, payment_id, signature);
      console.log('✅ Payment verification result:', isValid);

      // For development mode, allow payment even if verification fails
      const nodeEnv = process.env.NODE_ENV || 'development';
      const allowInDev = !isValid && (nodeEnv === 'development' || nodeEnv === 'test');

      if (isValid || allowInDev) {
        if (allowInDev) {
          console.log('⚠️ Payment verification failed but allowing in development mode');
        }
        // Update order status if not already completed
        if (order.status !== 'completed') {
          order.status = 'completed';

          // Add payment ID based on gateway type
          if (order.mockOrderId && order_id.includes('mock')) {
            order.mockPaymentId = payment_id;
          } else if (order.razorpayOrderId) {
            order.razorpayPaymentId = payment_id;
          }

          await order.save();
          console.log('💾 Order status updated to completed');
        }

        // Grant access to purchased courses
        const User = (await import('../models/user.model.js')).default;
        const user = await User.findById(order.user);
        if (user) {
          let courseIds = [];

          // Handle both single course and cart-based orders
          if (order.items && order.items.length > 0) {
            // Cart-based order
            courseIds = order.items.map(item => item.courseId);
            console.log('🛒 Cart order - courses:', courseIds);
          } else if (order.courseId) {
            // Single course order
            courseIds = [order.courseId];
            console.log('📚 Single course order - course:', order.courseId);
          }

          const newCourses = courseIds.filter(courseId => !user.purchasedCourses.includes(courseId));
          console.log('➕ New courses to add:', newCourses);
          console.log('📚 User current courses:', user.purchasedCourses);

          if (newCourses.length > 0) {
            user.purchasedCourses.push(...newCourses);
            await user.save();
            console.log('✅ Courses added to user purchased courses');
            console.log('📚 User updated courses:', user.purchasedCourses);
          } else {
            console.log('ℹ️ All courses already purchased');
          }
        }

        res.json({ success: true, message: 'Payment verified successfully' });
      } else {
        console.log('❌ Payment verification failed');
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
