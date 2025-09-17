import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugProfileCompletion() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Find all users
    const allUsers = await User.find({});
    console.log(`\n📊 Found ${allUsers.length} users in database\n`);

    let issuesFound = 0;

    for (const user of allUsers) {
      console.log(`🔍 Checking user: ${user.username} (${user.email})`);

      // Check current profile completion status
      const currentIsComplete = user.isProfileComplete();
      console.log(`   Current profileComplete status: ${currentIsComplete}`);

      // Check individual fields
      const hasPhone = !!(user.phone && user.phone.trim());
      const hasRegistrationNumber = !!(user.registrationNumber && user.registrationNumber.trim());
      const hasBranch = !!(user.branch && user.branch.trim());

      console.log(`   Phone: ${hasPhone ? '✅' : '❌'} (${user.phone || 'empty'})`);
      console.log(`   Registration Number: ${hasRegistrationNumber ? '✅' : '❌'} (${user.registrationNumber || 'empty'})`);
      console.log(`   Branch: ${hasBranch ? '✅' : '❌'} (${user.branch || 'empty'})`);

      // Check if profileCompleted field matches actual status
      const actualIsComplete = hasPhone && hasRegistrationNumber && hasBranch;
      const fieldMatches = user.profileCompleted === actualIsComplete;

      if (!fieldMatches) {
        console.log(`   ⚠️  MISMATCH: profileCompleted field (${user.profileCompleted}) doesn't match actual status (${actualIsComplete})`);
        issuesFound++;

        // Fix the mismatch
        user.profileCompleted = actualIsComplete;
        await user.save();
        console.log(`   ✅ Fixed: Updated profileCompleted to ${actualIsComplete}`);
      } else {
        console.log(`   ✅ Field matches actual status`);
      }

      // Check if user can proceed with payment
      const canProceed = user.isVerified && actualIsComplete;
      console.log(`   Email Verified: ${user.isVerified ? '✅' : '❌'}`);
      console.log(`   Can proceed with payment: ${canProceed ? '✅' : '❌'}`);

      if (!canProceed) {
        if (!user.isVerified) {
          console.log(`   🚫 BLOCKED: Email not verified`);
        } else {
          console.log(`   🚫 BLOCKED: Profile incomplete`);
        }
      }

      console.log(''); // Empty line between users
    }

    console.log(`\n🎯 Summary:`);
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Issues found and fixed: ${issuesFound}`);

    // Show final status
    console.log(`\n📈 Final Status:`);
    const finalUsers = await User.find({}, 'username email isVerified profileCompleted phone registrationNumber branch');
    finalUsers.forEach(user => {
      const status = user.isVerified && user.profileCompleted ? '✅ Ready' : '❌ Blocked';
      console.log(`${status} - ${user.username}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Debug complete. Database connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugProfileCompletion();