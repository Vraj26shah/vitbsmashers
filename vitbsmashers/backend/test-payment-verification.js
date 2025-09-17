import 'dotenv/config.js';
import mongoose from 'mongoose';
import paymentService from './service/paymentService.js';

// Test payment verification
async function testPaymentVerification() {
    try {
        console.log('🧪 Testing Payment Verification...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Database connected');

        // Test 1: Create a test order first
        console.log('\n📋 Test 1: Create Test Order');
        const mockUserId = new mongoose.Types.ObjectId();

        const orderData = await paymentService.createSingleCourseOrder(
            mockUserId,
            'test-course-verify',
            'Test Verification Course',
            10000 // ₹100 in paisa
        );

        console.log('✅ Test order created:', orderData.orderId);

        // Test 2: Simulate payment verification
        console.log('\n🔐 Test 2: Payment Verification');

        // Mock Razorpay payment response
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = 'mock_signature_for_testing';

        // Test the verification
        const isValid = await paymentService.verifyPayment(
            orderData.orderId,
            mockPaymentId,
            mockSignature
        );

        if (isValid) {
            console.log('✅ Payment verification passed');
        } else {
            console.log('❌ Payment verification failed (expected for mock data)');
        }

        // Test 3: Test with real signature format (this will fail but test the logic)
        console.log('\n🔐 Test 3: Signature Format Test');

        // Generate a proper signature for testing
        const crypto = await import('crypto');
        const sign = orderData.orderId + '|' + mockPaymentId;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        console.log('Expected signature format generated successfully');

        // Test with correct signature
        const isValidWithRealSig = await paymentService.verifyPayment(
            orderData.orderId,
            mockPaymentId,
            expectedSign
        );

        if (isValidWithRealSig) {
            console.log('✅ Payment verification with correct signature passed');
        } else {
            console.log('❌ Payment verification with correct signature failed');
        }

        console.log('\n🎉 Payment verification tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database disconnected');
        process.exit(0);
    }
}

// Run tests
testPaymentVerification();