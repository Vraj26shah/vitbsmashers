import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import User from '../models/user.model.js';

class PaymentProcessor {
  constructor() {
    this.processing = new Set();
  }

  // Process a single order
  async processOrder(orderId) {
    if (this.processing.has(orderId)) {
      console.log(`⚠️ Order ${orderId} is already being processed`);
      return;
    }

    this.processing.add(orderId);

    try {
      console.log(`🔄 Processing order: ${orderId}`);

      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      if (order.status === 'completed') {
        console.log(`ℹ️ Order ${orderId} is already completed`);
        return;
      }

      // Get user
      const user = await User.findById(order.user);
      if (!user) {
        throw new Error(`User not found for order ${orderId}`);
      }

      // Mark order as completed
      order.status = 'completed';
      if (order.razorpayOrderId) {
        order.razorpayPaymentId = `pay_processed_${Date.now()}`;
      } else if (order.mockOrderId) {
        order.mockPaymentId = `pay_processed_${Date.now()}`;
      }

      await order.save();
      console.log(`✅ Order ${orderId} marked as completed`);

      // Extract course IDs
      let courseIds = [];
      if (order.items && order.items.length > 0) {
        courseIds = order.items.map(item => item.courseId);
      } else if (order.courseId) {
        courseIds = [order.courseId];
      }

      // Add courses to user
      const newCourses = courseIds.filter(courseId => !user.purchasedCourses.includes(courseId));
      if (newCourses.length > 0) {
        user.purchasedCourses.push(...newCourses);
        await user.save();
        console.log(`✅ Added ${newCourses.length} courses to user ${user.username}: ${newCourses.join(', ')}`);
      } else {
        console.log(`ℹ️ All courses already purchased by user ${user.username}`);
      }

    } catch (error) {
      console.error(`❌ Error processing order ${orderId}:`, error.message);
    } finally {
      this.processing.delete(orderId);
    }
  }

  // Process all pending orders
  async processAllPendingOrders() {
    try {
      console.log('🔄 Processing all pending orders...');

      const pendingOrders = await Order.find({ status: 'pending' });
      console.log(`Found ${pendingOrders.length} pending orders`);

      let processed = 0;
      let failed = 0;

      for (const order of pendingOrders) {
        try {
          await this.processOrder(order._id);
          processed++;
        } catch (error) {
          console.error(`Failed to process order ${order._id}:`, error.message);
          failed++;
        }
      }

      console.log(`✅ Processed ${processed} orders successfully`);
      if (failed > 0) {
        console.log(`❌ Failed to process ${failed} orders`);
      }

      return { processed, failed };

    } catch (error) {
      console.error('Error in processAllPendingOrders:', error);
      return { processed: 0, failed: 0 };
    }
  }

  // Process orders for a specific user
  async processUserOrders(userId) {
    try {
      console.log(`🔄 Processing orders for user: ${userId}`);

      const userOrders = await Order.find({
        user: userId,
        status: 'pending'
      });

      console.log(`Found ${userOrders.length} pending orders for user`);

      let processed = 0;
      for (const order of userOrders) {
        await this.processOrder(order._id);
        processed++;
      }

      return processed;

    } catch (error) {
      console.error(`Error processing user orders for ${userId}:`, error);
      return 0;
    }
  }

  // Get processing status
  getStatus() {
    return {
      currentlyProcessing: Array.from(this.processing),
      processingCount: this.processing.size
    };
  }
}

export default new PaymentProcessor();