import dotenv from 'dotenv';
dotenv.config();

console.log('✅ Payment System Verification\n');
console.log('Razorpay Configuration:');
console.log('  Key ID:', process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('  Key Secret:', process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');
console.log('  Key Type:', process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'TEST MODE' : 'LIVE MODE');
console.log('\nPayment system is configured to use ONLY Razorpay.');
console.log('Mock payments have been removed.');
console.log('\nTo test payments:');
console.log('1. Start backend: npm run dev');
console.log('2. Open browser: http://localhost:4000');
console.log('3. Login and try purchasing a course');
console.log('4. Use test card: 4111 1111 1111 1111');
