import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

console.log('Testing Razorpay Configuration...\n');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('Key ID:', keyId);
console.log('Key Secret:', keySecret ? '***' + keySecret.slice(-4) : 'NOT SET');
console.log('Key Type:', keyId?.startsWith('rzp_test_') ? 'TEST MODE' : 'LIVE MODE');
console.log('');

if (!keyId || !keySecret) {
  console.error('❌ Razorpay credentials are missing!');
  console.error('Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file');
  process.exit(1);
}

try {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  
  console.log('✓ Razorpay instance created successfully');
  
  // Try to create a test order
  console.log('\nCreating test order...');
  const order = await razorpay.orders.create({
    amount: 10000, // ₹100 in paise
    currency: 'INR',
    receipt: 'test_' + Date.now(),
  });
  
  console.log('✓ Test order created successfully!');
  console.log('\nOrder Details:');
  console.log('  Order ID:', order.id);
  console.log('  Amount:', order.amount / 100, 'INR');
  console.log('  Currency:', order.currency);
  console.log('  Status:', order.status);
  console.log('');
  console.log('✅ Razorpay is configured correctly and working!');
  
} catch (error) {
  console.error('❌ Razorpay Error:', error.message);
  
  if (error.statusCode === 401) {
    console.error('\n⚠️  Authentication failed!');
    console.error('Your Razorpay Key ID or Key Secret is incorrect.');
    console.error('Please verify your credentials at: https://dashboard.razorpay.com/app/keys');
  } else if (error.statusCode === 400) {
    console.error('\n⚠️  Bad Request!');
    console.error('The request format is incorrect.');
  } else {
    console.error('\nFull error:', error);
  }
  
  process.exit(1);
}

process.exit(0);
