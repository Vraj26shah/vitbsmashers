// Test Google OAuth Configuration
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing Google OAuth Configuration...\n');

// Check required environment variables
const requiredVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'FRONTEND_URL'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = value && value.trim() !== '';

  console.log(`${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'Set' : 'NOT SET'}`);

  if (!isSet) {
    allPresent = false;
  }

  // Show actual values (partially masked for security)
  if (isSet) {
    if (varName.includes('SECRET')) {
      console.log(`   Value: ${value.substring(0, 10)}...${value.substring(value.length - 5)}`);
    } else {
      console.log(`   Value: ${value}`);
    }
  }
});

console.log('\n📋 Configuration Summary:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   All required variables present: ${allPresent ? '✅ YES' : '❌ NO'}`);

if (allPresent) {
  console.log('\n🎯 Next Steps:');
  console.log('   1. Go to Google Cloud Console');
  console.log('   2. Add this callback URL to Authorized redirect URIs:');
  console.log(`      ${process.env.GOOGLE_CALLBACK_URL}`);
  console.log('   3. Test authentication from your frontend (not backend directly)');
  console.log('   4. Clear browser cache and cookies');
} else {
  console.log('\n❌ Missing Environment Variables!');
  console.log('   Please set all required variables in your deployment platform.');
}

console.log('\n🔗 Test URLs:');
console.log(`   Frontend: ${process.env.FRONTEND_URL}`);
console.log(`   Backend: ${process.env.GOOGLE_CALLBACK_URL.replace('/api/v1/auth/google/callback', '')}`);
console.log(`   Google OAuth: ${process.env.GOOGLE_CALLBACK_URL.replace('/callback', '')}`);