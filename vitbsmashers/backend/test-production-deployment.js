// Production Deployment Test Script
// Run this script to verify that all API endpoints work correctly in production

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.NODE_ENV === 'production'
    ? 'https://vitbsmashers.onrender.com/api/v1'
    : 'http://localhost:4000/api/v1';

console.log('🚀 Testing Production Deployment...');
console.log('📍 API Base URL:', API_BASE);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('');

// Test endpoints
const testEndpoints = [
    {
        name: 'Health Check',
        url: `https://vitbsmashers.onrender.com/`,
        method: 'GET',
        expectStatus: 200
    },
    {
        name: 'Auth Routes',
        url: `${API_BASE}/auth/status`,
        method: 'GET',
        expectStatus: 401 // Should return 401 without auth
    },
    {
        name: 'Courses Routes',
        url: `${API_BASE}/courses`,
        method: 'GET',
        expectStatus: 200
    },
    {
        name: 'Faculty Routes',
        url: `${API_BASE}/faculty`,
        method: 'GET',
        expectStatus: 200
    },
    {
        name: 'Events Routes',
        url: `${API_BASE}/events`,
        method: 'GET',
        expectStatus: 200
    },
    {
        name: 'Marketplace Routes',
        url: `${API_BASE}/marketplace`,
        method: 'GET',
        expectStatus: 200
    }
];

async function testEndpoint(test) {
    try {
        console.log(`🔍 Testing ${test.name}...`);

        const response = await fetch(test.url, {
            method: test.method,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const status = response.status;
        const success = status === test.expectStatus;

        console.log(`   ${success ? '✅' : '❌'} ${test.name}: ${status} ${success ? '(Expected)' : `(Expected ${test.expectStatus})`}`);

        if (!success) {
            console.log(`   📄 Response:`, await response.text().catch(() => 'Unable to read response'));
        }

        return success;
    } catch (error) {
        console.log(`   ❌ ${test.name}: Error - ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Running API Endpoint Tests...\n');

    let passed = 0;
    let total = testEndpoints.length;

    for (const test of testEndpoints) {
        const success = await testEndpoint(test);
        if (success) passed++;
        console.log(''); // Empty line between tests
    }

    console.log('📊 Test Results:');
    console.log(`   ✅ Passed: ${passed}/${total}`);
    console.log(`   ❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
        console.log('🎉 All tests passed! Production deployment looks good.');
    } else {
        console.log('⚠️  Some tests failed. Please check the deployment.');
    }

    // Test CORS headers
    console.log('\n🔒 Testing CORS Configuration...');
    try {
        const corsResponse = await fetch(`${API_BASE}/courses`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'https://vitbsmashers.vercel.app'
            }
        });

        const corsHeaders = corsResponse.headers;
        console.log('   CORS Headers:');
        console.log(`   - Access-Control-Allow-Origin: ${corsHeaders.get('access-control-allow-origin') || 'Not set'}`);
        console.log(`   - Access-Control-Allow-Credentials: ${corsHeaders.get('access-control-allow-credentials') || 'Not set'}`);
        console.log(`   - Access-Control-Allow-Methods: ${corsHeaders.get('access-control-allow-methods') || 'Not set'}`);

    } catch (error) {
        console.log('   ❌ CORS test failed:', error.message);
    }

    console.log('\n🏁 Production deployment test completed.');
}

runTests().catch(console.error);