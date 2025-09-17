import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserProfile(username) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Find user by username
    const user = await User.findOne({ username: username });

    if (!user) {
      console.log(`❌ User "${username}" not found in database`);
      console.log('\n📋 Available users:');
      const allUsers = await User.find({}, 'username email');
      allUsers.forEach(u => console.log(`   - ${u.username} (${u.email})`));
      return;
    }

    console.log(`\n🔍 User Profile Analysis for: ${user.username}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`✅ Verified: ${user.isVerified}`);
    console.log('');

    // Check profile fields
    console.log('📝 Profile Fields:');
    console.log(`   Phone: ${user.phone ? '✅ ' + user.phone : '❌ empty'}`);
    console.log(`   Registration Number: ${user.registrationNumber ? '✅ ' + user.registrationNumber : '❌ empty'}`);
    console.log(`   Branch: ${user.branch ? '✅ ' + user.branch : '❌ empty'}`);
    console.log(`   Full Name: ${user.fullName ? '✅ ' + user.fullName : '❌ empty'}`);
    console.log(`   Year: ${user.year ? '✅ ' + user.year : '❌ empty'}`);
    console.log('');

    // Check profile completion
    const isComplete = user.isProfileComplete();
    console.log('🔍 Profile Completion Check:');
    console.log(`   Method result: ${isComplete ? '✅ Complete' : '❌ Incomplete'}`);
    console.log(`   profileCompleted field: ${user.profileCompleted ? '✅ true' : '❌ false'}`);
    console.log('');

    // Check what blocks payment
    console.log('🚫 Payment Blocking Analysis:');
    if (!user.isVerified) {
      console.log('   ❌ BLOCKED: Email not verified');
    } else if (!isComplete) {
      console.log('   ❌ BLOCKED: Profile incomplete');
      const missing = [];
      if (!user.phone) missing.push('phone');
      if (!user.registrationNumber) missing.push('registrationNumber');
      if (!user.branch) missing.push('branch');
      console.log(`   Missing fields: ${missing.join(', ')}`);
    } else {
      console.log('   ✅ READY: Can proceed with payment');
    }

    console.log('');
    console.log('💡 Recommendations:');
    if (!user.isVerified) {
      console.log('   - Verify your email address');
    }
    if (!user.phone) {
      console.log('   - Add phone number to profile');
    }
    if (!user.registrationNumber) {
      console.log('   - Add registration number to profile');
    }
    if (!user.branch) {
      console.log('   - Add branch to profile');
    }
    if (user.isVerified && isComplete) {
      console.log('   - Profile is complete! Try purchasing a course again');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get username from command line argument
const username = process.argv[2];
if (!username) {
  console.log('Usage: node check-user-profile.js <username>');
  console.log('Example: node check-user-profile.js vrajshah');
  process.exit(1);
}

checkUserProfile(username);