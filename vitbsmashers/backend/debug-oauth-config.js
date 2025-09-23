// Debug OAuth Configuration
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 OAuth Configuration Debug');
console.log('============================');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET');
console.log('GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('============================');

// Test if client ID format is correct
const clientId = process.env.GOOGLE_CLIENT_ID;
if (clientId) {
    if (clientId.includes('\n') || clientId.includes(' ')) {
        console.log('❌ CLIENT_ID contains whitespace/newlines - this will cause errors!');
    }
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
        console.log('❌ CLIENT_ID format looks incorrect - should end with .apps.googleusercontent.com');
    }
    if (clientId.length < 50) {
        console.log('❌ CLIENT_ID seems too short - typical length is 70+ characters');
    }
}

const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (clientSecret) {
    if (clientSecret.includes('\n') || clientSecret.includes(' ')) {
        console.log('❌ CLIENT_SECRET contains whitespace/newlines - this will cause errors!');
    }
    if (clientSecret.length < 20) {
        console.log('❌ CLIENT_SECRET seems too short');
    }
}

console.log('✅ Run this script on Render to debug OAuth configuration');