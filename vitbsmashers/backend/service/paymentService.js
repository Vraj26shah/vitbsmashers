import Stripe from 'stripe';
import Order from '../models/orderModel.js';
import User from '../models/user.model.js'; // For updating purchased courses

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  async createSingleCourseSession(userId, courseId, subject, amount) {
    try {
      const order = await Order.create({
        user: userId,
        courseId: courseId,
        title: subject || courseId,
        amount: amount,
        status: 'pending',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'inr',
            product_data: {
              name: subject ? `${courseId} - ${subject}` : courseId,
            },
            unit_amount: amount, // Amount is already in cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/features/marketplace/market.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/features/marketplace/market.html?payment=cancelled`,
        client_reference_id: order._id.toString(),
      });

      order.stripeSessionId = session.id;
      await order.save();

      return session;
    } catch (err) {
      throw new Error(`Failed to create single course session: ${err.message}`);
    }
  }

  async createCheckoutSession(userId, items) {
    try {
      // Create a single order for the entire cart
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const order = await Order.create({
        user: userId,
        items: items.map(item => ({
          courseId: item.courseId,
          title: item.subject || item.title, // Use subject if provided, otherwise title
          amount: item.amount,
          modules: item.modules || [], // Include modules if provided
        })),
        amount: totalAmount,
        status: 'pending',
      });

      const lineItems = items.map(item => ({
        price_data: {
          currency: 'inr', // Changed to INR to match ₹ symbol
          product_data: {
            name: item.subject ? `${item.courseId} - ${item.subject}` : item.title,
          },
          unit_amount: item.amount, // Amount is already in cents
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/features/marketplace/market.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/features/marketplace/market.html?payment=cancelled`,
        client_reference_id: order._id.toString(),
      });

      order.stripeSessionId = session.id;
      await order.save();

      return session;
    } catch (err) {
      throw new Error(`Failed to create checkout session: ${err.message}`);
    }
  }

  async handleWebhook(event) {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const order = await Order.findById(session.client_reference_id);
      if (order) {
        order.status = 'completed';
        await order.save();

        // Grant access to all purchased courses in the order
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
    }
  }
}

export default new PaymentService();