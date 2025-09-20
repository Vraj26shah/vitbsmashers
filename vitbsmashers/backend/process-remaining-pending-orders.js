import mongoose from 'mongoose';
import Order from './models/orderModel.js';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function processRemainingPendingOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI);

    // Find all pending orders
    const pendingOrders = await Order.find({ status: 'pending' }).sort({ createdAt: -1 });

    console.log(`Found ${pendingOrders.length} pending orders to process`);

    let totalCoursesAdded = 0;
    let processedOrders = 0;

    for (const order of pendingOrders) {
      console.log(`\n--- Processing Order ${order._id} ---`);

      // Get user information
      const user = await User.findById(order.user);
      if (!user) {
        console.log(`❌ User not found for order ${order._id}, skipping...`);
        continue;
      }

      console.log(`User: ${user.username} (${user.email})`);
      console.log(`Amount: ₹${(order.amount / 100).toFixed(2)}`);

      // Mark order as completed
      order.status = 'completed';
      if (order.razorpayOrderId) {
        order.razorpayPaymentId = `pay_auto_${Date.now()}`;
      } else if (order.mockOrderId) {
        order.mockPaymentId = `pay_auto_${Date.now()}`;
      }

      await order.save();
      console.log(`✅ Order marked as completed`);

      // Extract course IDs from order
      let courseIds = [];
      if (order.items && order.items.length > 0) {
        courseIds = order.items.map(item => item.courseId);
      } else if (order.courseId) {
        courseIds = [order.courseId];
      }

      console.log(`Courses in this order: ${courseIds.join(', ')}`);

      // Add courses to user's purchasedCourses if not already there
      const newCourses = courseIds.filter(courseId => !user.purchasedCourses.includes(courseId));
      if (newCourses.length > 0) {
        user.purchasedCourses.push(...newCourses);
        await user.save();
        totalCoursesAdded += newCourses.length;
        console.log(`✅ Added courses: ${newCourses.join(', ')}`);
      } else {
        console.log(`ℹ️ All courses already purchased`);
      }

      processedOrders++;
    }

    console.log(`\n🎉 SUCCESS! Processed ${processedOrders} orders`);
    console.log(`📚 Total courses added: ${totalCoursesAdded}`);

    // Verify final state for all users
    const allUsers = await User.find({ purchasedCourses: { $exists: true, $ne: [] } });
    console.log(`\n📊 Users with purchased courses:`);

    for (const user of allUsers) {
      console.log(`- ${user.username}: ${user.purchasedCourses.length} courses (${user.purchasedCourses.join(', ')})`);
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('Error:', error);
  }
}

processRemainingPendingOrders();