import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 OAuth Configuration Debug');
console.log('=============================');

console.log('Environment Variables:');
console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL || 'Using default: http://localhost:4000/api/v1/auth/google/callback');

console.log('\nOAuth Strategy Configuration:');
console.log('- Client ID length:', process.env.GOOGLE_CLIENT_ID?.length || 0);
console.log('- Client Secret length:', process.env.GOOGLE_CLIENT_SECRET?.length || 0);

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('\n✅ OAuth configuration appears valid');
  console.log('\nNext steps:');
  console.log('1. Check Google Cloud Console OAuth settings');
  console.log('2. Ensure callback URL is registered: https://vitbsmashers.onrender.com/api/v1/auth/google/callback');
  console.log('3. Ensure scopes are enabled: openid, profile, email');
  console.log('4. Check if domain restriction (hd=vitbhopal.ac.in) is properly configured');
} else {
  console.log('\n❌ OAuth configuration is incomplete');
  console.log('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
}

console.log('\nTest OAuth URL generation:');
const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback')}&` +
  `scope=${encodeURIComponent('openid profile email')}&` +
  `response_type=code&` +
  `access_type=offline&` +
  `prompt=select_account&` +
  `hd=vitbhopal.ac.in`;

console.log('Generated URL:', testUrl);