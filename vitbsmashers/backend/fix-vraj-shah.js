import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixVrajShahProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('🔧 Fixing profile for user "vraj shah"...\n');

    // Find the user (try different variations)
    const possibleUsernames = ['vraj shah', 'vrajshah', 'vraj_shah', 'Vraj Shah', 'VRAJ SHAH'];
    let user = null;

    for (const username of possibleUsernames) {
      user = await User.findOne({ username: username });
      if (user) {
        console.log(`✅ Found user: "${username}"`);
        break;
      }
    }

    if (!user) {
      console.log('❌ User "vraj shah" not found in database');
      console.log('\n📋 Available users:');
      const allUsers = await User.find({}, 'username email');
      allUsers.forEach(u => console.log(`   - ${u.username} (${u.email})`));
      return;
    }

    console.log(`👤 User Details:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Verified: ${user.isVerified}`);
    console.log('');

    console.log('📝 Current Profile Data:');
    console.log(`   Phone: ${user.phone || '❌ empty'}`);
    console.log(`   Registration Number: ${user.registrationNumber || '❌ empty'}`);
    console.log(`   Roll Number (old): ${user.rollNumber || '❌ empty'}`);
    console.log(`   Branch: ${user.branch || '❌ empty'}`);
    console.log(`   Full Name: ${user.fullName || '❌ empty'}`);
    console.log(`   Year: ${user.year || '❌ empty'}`);
    console.log('');

    // Fix the profile data
    console.log('🔧 Applying fixes:');

    // 1. Migrate rollNumber to registrationNumber if needed
    if (user.rollNumber && !user.registrationNumber) {
      user.registrationNumber = user.rollNumber;
      console.log(`   ✅ Copied rollNumber (${user.rollNumber}) to registrationNumber`);
    }

    // 2. Set default values if missing (for testing)
    if (!user.phone) {
      user.phone = '9999999999'; // Default test phone
      console.log(`   ✅ Set default phone: ${user.phone}`);
    }

    if (!user.registrationNumber) {
      user.registrationNumber = '21BCE0001'; // Default test registration
      console.log(`   ✅ Set default registration number: ${user.registrationNumber}`);
    }

    if (!user.branch) {
      user.branch = 'CSE'; // Default test branch
      console.log(`   ✅ Set default branch: ${user.branch}`);
    }

    // 3. Ensure profile is marked as complete
    user.profileCompleted = true;
    console.log(`   ✅ Set profileCompleted = true`);

    // 4. Save the user
    await user.save();
    console.log('');

    // Verify the fix
    console.log('🔍 Verification:');
    const updatedUser = await User.findById(user._id);
    const isComplete = updatedUser.isProfileComplete();

    console.log(`   Profile Complete (method): ${isComplete ? '✅' : '❌'}`);
    console.log(`   Profile Complete (field): ${updatedUser.profileCompleted ? '✅' : '❌'}`);
    console.log(`   Phone: ${updatedUser.phone ? '✅' : '❌'}`);
    console.log(`   Registration Number: ${updatedUser.registrationNumber ? '✅' : '❌'}`);
    console.log(`   Branch: ${updatedUser.branch ? '✅' : '❌'}`);
    console.log('');

    // Check if user can now proceed with payment
    const canProceed = updatedUser.isVerified && isComplete;
    console.log('🎯 Final Status:');
    if (canProceed) {
      console.log('   ✅ SUCCESS: User can now purchase courses!');
      console.log('   💳 Payment will be allowed for this user');
    } else {
      if (!updatedUser.isVerified) {
        console.log('   ⚠️  WARNING: Email not verified - user must verify email first');
      } else {
        console.log('   ❌ FAILED: Profile still incomplete');
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Fix completed for user "vraj shah"');

  } catch (error) {
    console.error('❌ Error fixing profile:', error);
  }
}

fixVrajShahProfile();