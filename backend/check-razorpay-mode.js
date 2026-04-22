import dotenv from 'dotenv';
import Razorpay from 'razorpay';

dotenv.config();

console.log('═══════════════════════════════════════════════════════');
console.log('🔍 RAZORPAY CONFIGURATION CHECK');
console.log('═══════════════════════════════════════════════════════\n');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// Check if keys are set
if (!keyId || !keySecret) {
  console.log('❌ ERROR: Razorpay keys are not set in .env file\n');
  console.log('Please add the following to backend/.env:');
  console.log('RAZORPAY_KEY_ID=your_key_id');
  console.log('RAZORPAY_KEY_SECRET=your_key_secret\n');
  process.exit(1);
}

// Check mode
const isTestMode = keyId.startsWith('rzp_test_');
const isLiveMode = keyId.startsWith('rzp_live_');

console.log('📋 Current Configuration:');
console.log('─────────────────────────────────────────────────────\n');
console.log('Key ID:', keyId);
console.log('Key Secret:', '***' + keySecret.slice(-4));
console.log('');

if (isTestMode) {
  console.log('🧪 MODE: TEST MODE');
  console.log('─────────────────────────────────────────────────────');
  console.log('Status: ⚠️  You are in TEST mode');
  console.log('');
  console.log('What this means:');
  console.log('  ❌ Real netbanking will NOT work');
  console.log('  ❌ Real UPI will NOT work');
  console.log('  ❌ Real cards will NOT work');
  console.log('  ✅ Test card works: 4111 1111 1111 1111');
  console.log('  ✅ Test UPI works: success@razorpay');
  console.log('');
  console.log('To enable REAL payments:');
  console.log('  1. Login to https://dashboard.razorpay.com/');
  console.log('  2. Complete KYC verification (if not done)');
  console.log('  3. Go to Settings → API Keys');
  console.log('  4. Generate LIVE keys (starts with rzp_live_)');
  console.log('  5. Update backend/.env with live keys');
  console.log('  6. Restart backend: npm run dev');
  console.log('');
} else if (isLiveMode) {
  console.log('💰 MODE: LIVE MODE');
  console.log('─────────────────────────────────────────────────────');
  console.log('Status: ✅ You are in LIVE mode');
  console.log('');
  console.log('What this means:');
  console.log('  ✅ Real netbanking WILL work');
  console.log('  ✅ Real UPI WILL work');
  console.log('  ✅ Real cards WILL work');
  console.log('  ✅ All payment methods available');
  console.log('  ⚠️  Real money will be deducted!');
  console.log('');
} else {
  console.log('❌ MODE: UNKNOWN');
  console.log('─────────────────────────────────────────────────────');
  console.log('Status: ⚠️  Invalid key format');
  console.log('');
  console.log('Your key should start with:');
  console.log('  - rzp_test_* for test mode');
  console.log('  - rzp_live_* for live mode');
  console.log('');
}

// Test connection
console.log('🔌 Testing Razorpay Connection...');
console.log('─────────────────────────────────────────────────────\n');

try {
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  
  console.log('Creating test order...');
  const order = await razorpay.orders.create({
    amount: 10000, // ₹100
    currency: 'INR',
    receipt: 'test_' + Date.now(),
  });
  
  console.log('✅ Connection successful!');
  console.log('');
  console.log('Test Order Created:');
  console.log('  Order ID:', order.id);
  console.log('  Amount: ₹' + (order.amount / 100));
  console.log('  Status:', order.status);
  console.log('');
  
  if (isTestMode) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  IMPORTANT: You are still in TEST MODE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('To accept REAL payments (netbanking, UPI, etc.):');
    console.log('');
    console.log('1. Get your LIVE keys from Razorpay Dashboard');
    console.log('2. Update backend/.env:');
    console.log('   RAZORPAY_KEY_ID=rzp_live_YOUR_KEY');
    console.log('   RAZORPAY_KEY_SECRET=YOUR_SECRET');
    console.log('3. Restart: npm run dev');
    console.log('');
  } else if (isLiveMode) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ READY FOR REAL PAYMENTS!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Your payment system is now configured for:');
    console.log('  ✅ Real netbanking');
    console.log('  ✅ Real UPI');
    console.log('  ✅ Real credit/debit cards');
    console.log('  ✅ Wallets and all payment methods');
    console.log('');
    console.log('⚠️  Remember: Real money will be deducted!');
    console.log('');
  }
  
} catch (error) {
  console.log('❌ Connection failed!');
  console.log('');
  console.log('Error:', error.message);
  console.log('');
  
  if (error.statusCode === 401) {
    console.log('⚠️  Authentication Error!');
    console.log('');
    console.log('Your Razorpay keys are incorrect or invalid.');
    console.log('');
    console.log('Please:');
    console.log('1. Login to https://dashboard.razorpay.com/');
    console.log('2. Go to Settings → API Keys');
    console.log('3. Copy the correct keys');
    console.log('4. Update backend/.env');
    console.log('5. Restart backend');
    console.log('');
  }
  
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════');
process.exit(0);
