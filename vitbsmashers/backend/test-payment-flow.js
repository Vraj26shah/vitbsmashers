import mongoose from 'mongoose';
import fetch from 'node-fetch';
import User from './models/user.model.js';
import Order from './models/orderModel.js';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:4000/api/v1';

async function testPaymentFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Get or create test user
    let testUser = await User.findOne({ username: 'testuser' });
    if (!testUser) {
      testUser = await User.create({
        username: 'testuser',
        email: 'test@vitbhopal.ac.in',
        password: 'password123',
        fullName: 'Test User',
        registrationNumber: 'TEST001',
        branch: 'CSE',
        year: '2024',
        phone: '9999999999',
        isVerified: true,
        profileCompleted: true
      });
      console.log('Created test user');
    }

    // Clear any existing purchased courses for clean test
    testUser.purchasedCourses = [];
    testUser.profileCompleted = true;
    await testUser.save();
    console.log('Cleared existing purchased courses and ensured profile is complete');
    console.log('User profile completion status:', testUser.isProfileComplete());

    // Generate token for test user
    const tokenResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.token) {
      throw new Error('Failed to get auth token');
    }

    const token = tokenData.token;
    console.log('Got auth token');

    // Test multiple course purchases (cart)
    const cartItems = [
      { courseId: 'CSE001', subject: 'Data Structures & Algorithms', amount: 129900 },
      { courseId: 'CSE002', subject: 'Web Development Bootcamp', amount: 139900 },
      { courseId: 'CSE003', subject: 'Machine Learning Fundamentals', amount: 189900 }
    ];

    console.log(`Testing purchase of ${cartItems.length} courses for total amount ${cartItems.reduce((sum, item) => sum + item.amount, 0)}`);

    // Create checkout session for cart
    const checkoutResponse = await fetch(`${API_BASE}/payment/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: cartItems
      })
    });

    const checkoutData = await checkoutResponse.json();
    console.log('Checkout response:', checkoutData);

    if (!checkoutData.orderId) {
      throw new Error('Failed to create checkout session');
    }

    // Simulate payment verification (mock payment)
    const verifyResponse = await fetch(`${API_BASE}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        order_id: checkoutData.order_id, // MongoDB ObjectId
        payment_id: `mock_payment_${Date.now()}`,
        signature: 'mock_signature'
      })
    });

    const verifyData = await verifyResponse.json();
    console.log('Verification response:', verifyData);

    if (!verifyData.success) {
      throw new Error('Payment verification failed');
    }

    // Wait a moment for database updates
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if course was added to user's purchased courses
    const updatedUser = await User.findById(testUser._id);
    console.log('User purchased courses:', updatedUser.purchasedCourses);

    const expectedCourses = cartItems.map(item => item.courseId);
    const allCoursesAdded = expectedCourses.every(courseId => updatedUser.purchasedCourses.includes(courseId));

    if (allCoursesAdded) {
      console.log('✅ SUCCESS: All courses were added to purchased courses');
    } else {
      console.log('❌ FAILED: Some courses were not added to purchased courses');
      console.log('Expected:', expectedCourses);
      console.log('Found:', updatedUser.purchasedCourses);
    }

    // Test fetching my-courses
    const myCoursesResponse = await fetch(`${API_BASE}/courses/my-courses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const myCoursesData = await myCoursesResponse.json();
    console.log('My courses response:', myCoursesData);

    if (myCoursesData.status === 'success' && myCoursesData.data.courses.length > 0) {
      console.log('✅ SUCCESS: My courses API returned purchased courses');
      console.log('Courses found:', myCoursesData.data.courses.map(c => c.title));
    } else {
      console.log('❌ FAILED: My courses API did not return purchased courses');
    }

    console.log('🎉 Payment flow test completed');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testPaymentFlow();