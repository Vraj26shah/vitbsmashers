import dotenv from 'dotenv';
dotenv.config();

console.log('=== Payment Endpoint Test ===\n');

const API_BASE = process.env.FRONTEND_URL || 'http://localhost:4000';
const API_URL = `${API_BASE}/api/v1/payment/create-order`;

console.log('Testing endpoint:', API_URL);
console.log('');

// Test 1: Without authentication (should fail with 401)
console.log('Test 1: Without authentication');
try {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      courseId: 'test-course-id',
      subject: 'Test Course',
      amount: 100
    })
  });
  
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
  
  if (response.status === 401) {
    console.log('✓ Correctly requires authentication\n');
  } else {
    console.log('⚠️  Expected 401, got', response.status, '\n');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Is the backend server running? Start it with: npm run dev\n');
  process.exit(1);
}

console.log('=== Test Complete ===');
console.log('\nTo test with authentication:');
console.log('1. Start the backend: npm run dev');
console.log('2. Open the frontend in a browser');
console.log('3. Log in and try to purchase a course');
console.log('4. Check the browser console for any errors');

process.exit(0);
