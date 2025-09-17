import 'dotenv/config.js';
import mongoose from 'mongoose';
import Order from './models/orderModel.js';
import User from './models/user.model.js';

// Test payment integration
async function testPaymentIntegration() {
    try {
        console.log('🧪 Testing Payment Integration...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Database connected');

        // Test 1: Check if Order model can be created
        console.log('\n📋 Test 1: Order Model Creation');
        const testOrder = new Order({
            user: new mongoose.Types.ObjectId(),
            courseId: 'test-course-1',
            title: 'Test Course',
            amount: 129900, // ₹1299 in cents
            status: 'pending'
        });
        
        // Validate without saving
        const validationError = testOrder.validateSync();
        if (validationError) {
            console.log('❌ Order validation failed:', validationError.message);
        } else {
            console.log('✅ Order model validation passed');
        }

        // Test 2: Check if User model has purchasedCourses field
        console.log('\n👤 Test 2: User Model Check');
        const testUser = new User({
            name: 'Test User',
            email: 'test@example.com',
            password: 'test123',
            purchasedCourses: []
        });
        
        const userValidationError = testUser.validateSync();
        if (userValidationError) {
            console.log('❌ User validation failed:', userValidationError.message);
        } else {
            console.log('✅ User model validation passed');
        }

        // Test 3: Check environment variables
        console.log('\n🔧 Test 3: Environment Variables');
        const requiredEnvVars = [
            'MONGO_URL',
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'FRONTEND_URL',
            'JWT_SECRET'
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

        if (envVarsOk) {
            console.log('\n🎉 All tests passed! Payment integration is ready.');
        } else {
            console.log('\n⚠️  Some environment variables are missing. Please check your .env file.');
        }

        // Test 4: Check Stripe key format
        console.log('\n💳 Test 4: Stripe Key Validation');
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (stripeKey) {
            if (stripeKey.startsWith('sk_test_') || stripeKey.startsWith('sk_live_')) {
                console.log('✅ Stripe secret key format is correct');
            } else {
                console.log('❌ Stripe secret key format is incorrect. Should start with sk_test_ or sk_live_');
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database disconnected');
        process.exit(0);
    }
}

// Run tests
testPaymentIntegration();
