import 'dotenv/config.js';
import mongoose from 'mongoose';
import paymentService from './service/paymentService.js';

// Test Razorpay integration
async function testRazorpayIntegration() {
    try {
        console.log('🧪 Testing Razorpay Integration...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Database connected');

        // Test 1: Check environment variables
        console.log('\n🔧 Test 1: Environment Variables');
        const requiredEnvVars = [
            'RAZORPAY_KEY_ID',
            'RAZORPAY_KEY_SECRET',
            'PAYMENT_GATEWAY'
        ];

        let envVarsOk = true;
        requiredEnvVars.forEach(envVar => {
            if (!process.env[envVar]) {
                console.log(`❌ Missing environment variable: ${envVar}`);
                envVarsOk = false;
            } else {
                console.log(`✅ ${envVar}: ${envVar.includes('SECRET') ? '***' : process.env[envVar]}`);
            }
        });

        if (!envVarsOk) {
            console.log('\n❌ Environment variables check failed');
            return;
        }

        // Test 2: Check payment gateway setting
        if (process.env.PAYMENT_GATEWAY !== 'razorpay') {
            console.log(`❌ PAYMENT_GATEWAY is set to '${process.env.PAYMENT_GATEWAY}', should be 'razorpay'`);
            return;
        }
        console.log('✅ Payment gateway is set to razorpay');

        // Test 3: Test Razorpay key format
        console.log('\n💳 Test 3: Razorpay Key Validation');
        const keyId = process.env.RAZORPAY_KEY_ID;
        if (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_')) {
            console.log('✅ Razorpay key ID format is correct');
        } else {
            console.log('❌ Razorpay key ID format is incorrect. Should start with rzp_test_ or rzp_live_');
        }

        // Test 4: Test creating a payment order (mock test)
        console.log('\n📋 Test 4: Payment Order Creation');
        try {
            // Create a mock user ID for testing
            const mockUserId = new mongoose.Types.ObjectId();

            const orderData = await paymentService.createSingleCourseOrder(
                mockUserId,
                'test-course-1',
                'Test Course',
                129900 // ₹1299 in paisa
            );

            console.log('✅ Payment order created successfully');
            console.log('Order ID:', orderData.orderId);
            console.log('Amount:', orderData.amount);
            console.log('Currency:', orderData.currency);
            console.log('Gateway:', orderData.gateway);

            if (orderData.key && orderData.key !== 'mock_payment_key') {
                console.log('✅ Razorpay key is being returned correctly');
            } else {
                console.log('❌ Razorpay key is not being returned correctly');
            }

        } catch (error) {
            console.log('❌ Payment order creation failed:', error.message);
        }

        console.log('\n🎉 Razorpay integration tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database disconnected');
        process.exit(0);
    }
}

// Run tests
testRazorpayIntegration();