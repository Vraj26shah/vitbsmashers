import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import { supabase } from './lib/supabase.js';

dotenv.config();

console.log('=== Payment System Diagnostic ===\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
console.log('   RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('   RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');
console.log('   Key Type:', process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') ? 'Test Mode' : 'Live Mode');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Missing');
console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing');
console.log('');

// 2. Test Razorpay connection
console.log('2. Testing Razorpay Connection:');
try {
  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  
  console.log('   Razorpay instance created: ✓');
  
  // Try to create a test order
  const testOrder = await razorpay.orders.create({
    amount: 10000, // ₹100 in paise
    currency: 'INR',
    receipt: 'test_receipt_' + Date.now(),
  });
  
  console.log('   Test order created: ✓');
  console.log('   Order ID:', testOrder.id);
  console.log('   Amount:', testOrder.amount / 100, 'INR');
  console.log('');
} catch (error) {
  console.log('   ✗ Razorpay Error:', error.message);
  console.log('   Error Details:', error.error || error);
  console.log('');
}

// 3. Test Supabase connection
console.log('3. Testing Supabase Connection:');
try {
  // Check if business schema exists
  const { data: courses, error: coursesError } = await supabase
    .schema('business')
    .from('courses')
    .select('id, pid, title, price')
    .limit(3);
  
  if (coursesError) {
    console.log('   ✗ Courses table error:', coursesError.message);
  } else {
    console.log('   Courses table accessible: ✓');
    console.log('   Sample courses:', courses?.length || 0);
  }
  
  // Check razorpay_orders table
  const { data: orders, error: ordersError } = await supabase
    .schema('business')
    .from('razorpay_orders')
    .select('*')
    .limit(1);
  
  if (ordersError) {
    console.log('   ✗ Razorpay orders table error:', ordersError.message);
  } else {
    console.log('   Razorpay orders table accessible: ✓');
  }
  
  // Check purchases table
  const { data: purchases, error: purchasesError } = await supabase
    .schema('business')
    .from('purchases')
    .select('*')
    .limit(1);
  
  if (purchasesError) {
    console.log('   ✗ Purchases table error:', purchasesError.message);
  } else {
    console.log('   Purchases table accessible: ✓');
  }
  
  console.log('');
} catch (error) {
  console.log('   ✗ Supabase Error:', error.message);
  console.log('');
}

// 4. Check database schema
console.log('4. Checking Database Schema:');
try {
  const { data, error } = await supabase.rpc('pg_get_tabledef', {
    table_name: 'razorpay_orders',
    schema_name: 'business'
  }).single();
  
  if (error) {
    console.log('   Could not fetch schema details (this is okay)');
  }
} catch (error) {
  // This is expected if the function doesn't exist
}

// Check table structure manually
const { data: tableInfo, error: tableError } = await supabase
  .schema('business')
  .from('razorpay_orders')
  .select('*')
  .limit(0);

if (!tableError) {
  console.log('   razorpay_orders table exists: ✓');
}

console.log('');
console.log('=== Diagnostic Complete ===');
console.log('\nIf all checks pass, the payment system should work correctly.');
console.log('If you see errors, please share them for troubleshooting.');

process.exit(0);
