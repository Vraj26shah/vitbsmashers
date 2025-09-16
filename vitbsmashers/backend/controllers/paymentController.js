import paymentService from '../service/paymentService.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { courseId, subject, amount, items } = req.body;
    const userId = req.user._id;

    // Handle single course payment
    if (courseId && amount) {
      const session = await paymentService.createSingleCourseSession(userId, courseId, subject, amount);
      return res.status(200).json({
        status: 'success',
        sessionUrl: session.url,
      });
    }

    // Handle cart-based payment
    if (items && Array.isArray(items) && items.length > 0) {
      const session = await paymentService.createCheckoutSession(userId, items);
      return res.status(200).json({
        status: 'success',
        sessionUrl: session.url,
      });
    }

    return res.status(400).json({ error: 'Invalid payment request' });
  } catch (err) {
    console.error('Payment controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const webhook = (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  paymentService.handleWebhook(event);
  res.status(200).json({ received: true });
};

// Default export with all payment controller functions
export default {
  createCheckoutSession,
  webhook
};
