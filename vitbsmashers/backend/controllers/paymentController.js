<<<<<<< HEAD
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
=======
// Payment Controller
export const createOrder = async (req, res) => {
  try {
    res.status(201).json({
      status: 'success',
      data: { message: 'Payment order created successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to create payment order'
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { message: 'Payment verified successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify payment'
    });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    res.status(200).json({
      status: 'success',
      data: { userId, message: 'Payment history retrieved successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve payment history'
    });
  }
};

export const processRefund = async (req, res) => {
  try {
    res.status(200).json({
      status: 'success',
      data: { message: 'Refund processed successfully' }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to process refund'
    });
  }
};
>>>>>>> fdd6e78948f8e4305d27bae3121f890b1b7be85a
