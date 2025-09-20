import paymentService from '../service/paymentService.js';
import crypto from 'crypto';
import Order from '../models/orderModel.js';
import User from '../models/user.model.js';

// Function to check user status for payment
export const checkUserStatusForPayment = async (userId) => {
  try {
    const user = await User.findById(userId).select('email phone registrationNumber branch isVerified');

    if (!user) {
      return {
        status: 'user_not_found',
        canProceed: false,
        message: 'User account not found',
        redirect: '/login'
      };
    }

    // Check if email exists (user is authenticated)
    if (!user.email) {
      return {
        status: 'not_authenticated',
        canProceed: false,
        message: 'Please log in to proceed with payment',
        redirect: '/login'
      };
    }

    // Check if user is verified
    if (!user.isVerified) {
      return {
        status: 'not_verified',
        canProceed: false,
        message: 'Please verify your email before making purchases',
        redirect: '/verify-email'
      };
    }

    // Check profile completion (only phone, registrationNumber, and branch required)
    const hasPhone = !!(user.phone && user.phone.trim());
    const hasRegistrationNumber = !!(user.registrationNumber && user.registrationNumber.trim());
    const hasBranch = !!(user.branch && user.branch.trim());

    const isProfileComplete = hasPhone && hasRegistrationNumber && hasBranch;

    if (!isProfileComplete) {
      return {
        status: 'profile_incomplete',
        canProceed: false,
        message: 'Please complete your profile before purchasing courses',
        redirect: '/features/profile/profile.html',
        missingFields: {
          phone: !hasPhone,
          registrationNumber: !hasRegistrationNumber,
          branch: !hasBranch
        }
      };
    }

    return {
      status: 'ready_for_payment',
      canProceed: true,
      message: 'Profile is complete and verified'
    };
  } catch (error) {
    console.error('User status check error:', error);
    return {
      status: 'error',
      canProceed: false,
      message: 'Error checking user status',
      redirect: '/login'
    };
  }
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { courseId, subject, amount, items } = req.body;
    const userId = req.user._id;

    // Check comprehensive user status for payment
    const userStatus = await checkUserStatusForPayment(userId);

    if (!userStatus.canProceed) {
      const statusCode = userStatus.status === 'not_authenticated' ? 401 :
                        userStatus.status === 'not_verified' ? 403 :
                        userStatus.status === 'profile_incomplete' ? 403 : 500;

      return res.status(statusCode).json({
        status: 'error',
        error: userStatus.status,
        message: userStatus.message,
        redirect: userStatus.redirect,
        ...(userStatus.missingFields && { missingFields: userStatus.missingFields })
      });
    }

    // Handle single course payment
    if (courseId && amount) {
      const orderData = await paymentService.createSingleCourseOrder(userId, courseId, subject, amount);
      return res.status(200).json({
        status: 'success',
        ...orderData
      });
    }

    // Handle cart-based payment
    if (items && Array.isArray(items) && items.length > 0) {
      const orderData = await paymentService.createCartOrder(userId, items);
      return res.status(200).json({
        status: 'success',
        ...orderData
      });
    }

    return res.status(400).json({ error: 'Invalid payment request' });
  } catch (err) {
    console.error('Payment controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

export const webhook = (req, res) => {
  // Razorpay webhook handling
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  try {
    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('⚠️ Webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      console.log('✅ Webhook signature verified');
    } else if (secret && !signature) {
      console.warn('⚠️ Webhook secret configured but no signature provided');
      return res.status(400).json({ error: 'Signature required' });
    } else {
      console.log('ℹ️ Webhook signature verification skipped (no secret configured)');
    }

    // Process the webhook
    paymentService.handleWebhook(req.body);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Default export with all payment controller functions
export default {
  createCheckoutSession,
  webhook
};
