// Payment Gateway Factory
import crypto from 'crypto';
import Order from '../models/orderModel.js';
import User from '../models/user.model.js'; // For updating purchased courses

// Mock Payment Gateway for Free Testing
class MockPaymentGateway {
  async createOrder(amount, currency = 'INR', receipt, notes) {
    const orderId = `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockOrder = {
      id: orderId,
      amount: amount,
      currency: currency,
      receipt: receipt,
      status: 'created',
      notes: notes,
      created_at: Date.now()
    };

    return mockOrder;
  }

  async verifyPayment(orderId, paymentId, signature) {
    // Mock verification - always return true for testing
    return true;
  }
}

// Razorpay Payment Gateway
class RazorpayPaymentGateway {
  constructor() {
    // Dynamic import to avoid errors when not using Razorpay
    this.Razorpay = null;
    this.stripe = null;
  }

  async initialize() {
    if (!this.Razorpay) {
      const { default: Razorpay } = await import('razorpay');
      this.Razorpay = Razorpay;
      this.razorpay = new this.Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
  }

  async createOrder(amount, currency = 'INR', receipt, notes) {
    await this.initialize();
    return await this.razorpay.orders.create({
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: notes
    });
  }

  async verifyPayment(orderId, paymentId, signature) {
    const sign = orderId + '|' + paymentId;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    return expectedSign === signature;
  }
}

// PhonePe Payment Gateway
class PhonePePaymentGateway {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID;
    this.saltKey = process.env.PHONEPE_SALT_KEY;
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || 1;
  }

  async createOrder(amount, currency = 'INR', receipt, notes) {
    const orderId = `phonepe_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // PhonePe order creation payload
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: orderId,
      merchantUserId: notes.orderId || 'user_' + Date.now(),
      amount: amount,
      redirectUrl: `${process.env.FRONTEND_URL}/payment/success`,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.FRONTEND_URL}/api/payments/phonepe/callback`,
      mobileNumber: notes.phone || '',
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Create base64 encoded payload
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // Create checksum
    const checksumString = base64Payload + '/pg/v1/pay' + this.saltKey;
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex') + '###' + this.saltIndex;

    // PhonePe API call would go here in production
    // For now, return mock response
    return {
      id: orderId,
      amount: amount,
      currency: currency,
      status: 'created',
      paymentUrl: `https://api.phonepe.com/apis/hermes/pg/v1/pay?checksum=${checksum}`,
      checksum: checksum,
      payload: base64Payload
    };
  }

  async verifyPayment(orderId, paymentId, signature) {
    // PhonePe verification logic would go here
    // For now, return true for testing
    return true;
  }
}

// Payment Gateway Factory
class PaymentGatewayFactory {
  constructor() {
    this.gateways = {
      mock: new MockPaymentGateway(),
      razorpay: new RazorpayPaymentGateway(),
      phonepe: new PhonePePaymentGateway()
    };
  }

  getGateway() {
    const gatewayType = process.env.PAYMENT_GATEWAY || 'mock';
    return this.gateways[gatewayType];
  }
}

const gatewayFactory = new PaymentGatewayFactory();

class PaymentService {
  async createSingleCourseOrder(userId, courseId, subject, amount) {
    try {
      // Create order record first
      const order = await Order.create({
        user: userId,
        courseId: courseId,
        title: subject || courseId,
        amount: amount,
        status: 'pending',
      });

      // Get the configured payment gateway
      const gateway = gatewayFactory.getGateway();
      const gatewayType = process.env.PAYMENT_GATEWAY || 'mock';

      // Create payment order using the selected gateway
      const paymentOrder = await gateway.createOrder(
        amount, // Amount in paisa (₹1 = 100 paisa)
        'INR',
        `order_${order._id}`,
        {
          courseId: courseId,
          subject: subject || courseId,
          orderId: order._id.toString(),
          type: 'single_course'
        }
      );

      // Update order with gateway-specific order ID
      if (gatewayType === 'mock') {
        order.mockOrderId = paymentOrder.id;
      } else if (gatewayType === 'razorpay') {
        order.razorpayOrderId = paymentOrder.id;
      } else if (gatewayType === 'phonepe') {
        order.phonepeOrderId = paymentOrder.id;
      }
      await order.save();

      return {
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        key: gatewayType === 'razorpay' ? process.env.RAZORPAY_KEY_ID : 'mock_payment_key',
        order_id: order._id.toString(),
        gateway: gatewayType,
        paymentUrl: paymentOrder.paymentUrl || null // For PhonePe redirect
      };
    } catch (err) {
      throw new Error(`Failed to create single course order: ${err.message}`);
    }
  }

  async createCartOrder(userId, items) {
    try {
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      // Create order record
      const order = await Order.create({
        user: userId,
        items: items.map(item => ({
          courseId: item.courseId,
          title: item.subject || item.title,
          amount: item.amount,
          modules: item.modules || [],
        })),
        amount: totalAmount,
        status: 'pending',
      });

      // Get the configured payment gateway
      const gateway = gatewayFactory.getGateway();
      const gatewayType = process.env.PAYMENT_GATEWAY || 'mock';

      // Create payment order using the selected gateway
      const paymentOrder = await gateway.createOrder(
        totalAmount, // Amount in paisa
        'INR',
        `cart_order_${order._id}`,
        {
          orderType: 'cart',
          itemCount: items.length,
          orderId: order._id.toString(),
          type: 'cart'
        }
      );

      // Update order with gateway-specific order ID
      if (gatewayType === 'mock') {
        order.mockOrderId = paymentOrder.id;
      } else if (gatewayType === 'razorpay') {
        order.razorpayOrderId = paymentOrder.id;
      } else if (gatewayType === 'phonepe') {
        order.phonepeOrderId = paymentOrder.id;
      }
      await order.save();

      return {
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        key: gatewayType === 'razorpay' ? process.env.RAZORPAY_KEY_ID : 'mock_payment_key',
        order_id: order._id.toString(),
        gateway: gatewayType,
        paymentUrl: paymentOrder.paymentUrl || null // For PhonePe redirect
      };
    } catch (err) {
      throw new Error(`Failed to create cart order: ${err.message}`);
    }
  }

  async handleWebhook(event) {
    try {
      console.log('🔄 Processing webhook event:', event.event || event.type);

      // Import the payment processor
      const { default: paymentProcessor } = await import('../services/paymentProcessor.js');

      // Handle Razorpay payment.captured event
      if (event.event === 'payment.captured' && event.payload?.payment?.entity) {
        const paymentEntity = event.payload.payment.entity;
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;

        console.log('💳 Razorpay payment captured:', { orderId, paymentId });

        // Find order by Razorpay order ID
        const order = await Order.findOne({ razorpayOrderId: orderId });
        if (order) {
          if (order.status === 'completed') {
            console.log('ℹ️ Order already completed');
            return;
          }

          // Use payment processor to handle the order
          await paymentProcessor.processOrder(order._id);
          console.log('✅ Razorpay order processed successfully via webhook');
        } else {
          console.log('❌ Order not found for Razorpay order ID:', orderId);
        }
      }

      // Handle PhonePe payment success (if implemented)
      else if (event.event === 'phonepe_payment_success') {
        console.log('📱 PhonePe payment success event received');
        // PhonePe webhook handling would go here
      }

      // Mock webhook - simulate payment completion
      else if (event.type === 'mock_payment_success') {
        const orderId = event.orderId;
        console.log('🎭 Mock payment success:', orderId);

        // Find order by mock order ID
        const order = await Order.findOne({ mockOrderId: orderId });
        if (order) {
          if (order.status === 'completed') {
            console.log('ℹ️ Mock order already completed');
            return;
          }

          // Use payment processor to handle the order
          await paymentProcessor.processOrder(order._id);
          console.log('✅ Mock order processed successfully');
        } else {
          console.log('❌ Mock order not found:', orderId);
        }
      }

      // Handle order completion by order ID (fallback mechanism)
      else if (event.type === 'order_complete' && event.orderId) {
        console.log('🔄 Processing order completion:', event.orderId);
        await paymentProcessor.processOrder(event.orderId);
        console.log('✅ Order processed via fallback mechanism');
      }

      // Unknown event type
      else {
        console.log('⚠️ Unknown webhook event type:', event.event || event.type);
      }

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      throw error;
    }
  }

  // Method to verify payment using configured gateway
  async verifyPayment(orderId, paymentId, signature) {
    try {
      const gatewayType = process.env.PAYMENT_GATEWAY || 'mock';
      const nodeEnv = process.env.NODE_ENV || 'development';

      console.log(`🔍 Payment verification debug:`, {
        gatewayType,
        nodeEnv,
        orderId: orderId.substring(0, 20) + '...',
        paymentId,
        signature: signature.substring(0, 20) + '...'
      });

      // Always return true for development/testing
      if (nodeEnv === 'development' || nodeEnv === 'test') {
        console.log(`🎭 ${gatewayType.toUpperCase()} payment verification (dev/test mode) - returning true`);
        return true;
      }

      // For mock gateway, always return true
      if (gatewayType === 'mock') {
        console.log(`🎭 Mock payment verification - returning true`);
        return true;
      }

      const gateway = gatewayFactory.getGateway();
      const result = await gateway.verifyPayment(orderId, paymentId, signature);
      console.log(`🔐 ${gatewayType.toUpperCase()} payment verification:`, result);
      return result;
    } catch (error) {
      console.error('Payment verification error:', error);
      // In case of error, return true for development to allow testing
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv === 'development' || nodeEnv === 'test') {
        console.log('⚠️ Payment verification error in dev mode - allowing payment');
        return true;
      }
      return false;
    }
  }

  // Method to simulate payment completion for testing
  async simulatePaymentSuccess(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (order && order.status !== 'completed') {
        order.status = 'completed';
        order.mockPaymentId = `mock_payment_${Date.now()}`;
        await order.save();

        // Grant course access
        const user = await User.findById(order.user);
        if (user) {
          let courseIds = [];
          if (order.items && order.items.length > 0) {
            courseIds = order.items.map(item => item.courseId);
          } else if (order.courseId) {
            courseIds = [order.courseId];
          }

          const newCourses = courseIds.filter(courseId => !user.purchasedCourses.includes(courseId));
          if (newCourses.length > 0) {
            user.purchasedCourses.push(...newCourses);
            await user.save();
          }
        }

        return { success: true, message: 'Payment completed successfully' };
      }
      return { success: false, message: 'Order not found or already completed' };
    } catch (error) {
      console.error('Payment simulation error:', error);
      return { success: false, message: 'Payment simulation failed' };
    }
  }
}

export default new PaymentService();