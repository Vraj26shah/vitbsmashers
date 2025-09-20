import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Order from '../models/orderModel.js';

const router = express.Router();

// Protect all admin routes
router.use(protect);
router.use(adminOnly);

// Payment processing endpoints
router.post('/process-pending-orders', async (req, res) => {
  try {
    const { default: paymentProcessor } = await import('../services/paymentProcessor.js');

    console.log('🔄 Admin: Processing all pending orders...');
    const result = await paymentProcessor.processAllPendingOrders();

    res.json({
      status: 'success',
      message: `Processed ${result.processed} orders successfully, ${result.failed} failed`,
      data: result
    });
  } catch (error) {
    console.error('Admin process pending orders error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process pending orders',
      error: error.message
    });
  }
});

router.post('/process-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { default: paymentProcessor } = await import('../services/paymentProcessor.js');

    console.log(`🔄 Admin: Processing order ${orderId}...`);
    await paymentProcessor.processOrder(orderId);

    res.json({
      status: 'success',
      message: `Order ${orderId} processed successfully`
    });
  } catch (error) {
    console.error(`Admin process order error for ${req.params.orderId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process order',
      error: error.message
    });
  }
});

router.post('/process-user-orders/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { default: paymentProcessor } = await import('../services/paymentProcessor.js');

    console.log(`🔄 Admin: Processing orders for user ${userId}...`);
    const processed = await paymentProcessor.processUserOrders(userId);

    res.json({
      status: 'success',
      message: `Processed ${processed} orders for user ${userId}`,
      data: { processed }
    });
  } catch (error) {
    console.error(`Admin process user orders error for ${req.params.userId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process user orders',
      error: error.message
    });
  }
});

// Get system status
router.get('/system-status', async (req, res) => {
  try {
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    const totalUsers = await User.countDocuments();
    const usersWithCourses = await User.countDocuments({ purchasedCourses: { $exists: true, $ne: [] } });

    res.json({
      status: 'success',
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders
        },
        users: {
          total: totalUsers,
          withCourses: usersWithCourses
        }
      }
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system status',
      error: error.message
    });
  }
});

export default router;