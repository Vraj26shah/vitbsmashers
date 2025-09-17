import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateOldUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('🔄 Starting migration for old users...\n');

    // Find all users
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} users to check\n`);

    let updatedCount = 0;
    let oldCompleteCount = 0;

    for (const user of allUsers) {
      console.log(`🔍 Checking: ${user.username} (${user.email})`);

      // Check old requirements (5 fields)
      const hadOldRequirements = !!(
        user.fullName &&
        user.phone &&
        user.rollNumber && // Old field name
        user.branch &&
        user.year
      );

      // Check new requirements (3 fields)
      const hasNewRequirements = !!(
        user.phone &&
        user.registrationNumber && // New field name
        user.branch
      );

      // Check current profile completion status
      const currentStatus = user.isProfileComplete();

      console.log(`   Old system (5 fields): ${hadOldRequirements ? '✅' : '❌'}`);
      console.log(`   New system (3 fields): ${hasNewRequirements ? '✅' : '❌'}`);
      console.log(`   Current status: ${currentStatus ? '✅' : '❌'}`);

      // Handle migration scenarios
      if (hadOldRequirements && !hasNewRequirements) {
        // User had old requirements but missing new ones
        console.log(`   🔄 MIGRATION NEEDED: User had old complete profile`);

        // Copy rollNumber to registrationNumber if it exists
        if (user.rollNumber && !user.registrationNumber) {
          user.registrationNumber = user.rollNumber;
          console.log(`   📝 Copied rollNumber (${user.rollNumber}) to registrationNumber`);
        }

        // Recalculate completion status
        const newStatus = !!(user.phone && user.registrationNumber && user.branch);
        user.profileCompleted = newStatus;

        await user.save();
        updatedCount++;
        oldCompleteCount++;

        console.log(`   ✅ Updated: profileCompleted = ${newStatus}`);
      } else if (!hadOldRequirements && hasNewRequirements && !currentStatus) {
        // User has new requirements but status not updated
        user.profileCompleted = true;
        await user.save();
        updatedCount++;
        console.log(`   ✅ Fixed: Set profileCompleted = true`);
      } else if (currentStatus !== hasNewRequirements) {
        // Status mismatch
        user.profileCompleted = hasNewRequirements;
        await user.save();
        updatedCount++;
        console.log(`   ✅ Fixed mismatch: profileCompleted = ${hasNewRequirements}`);
      } else {
        console.log(`   ✅ No changes needed`);
      }

      console.log(''); // Empty line
    }

    console.log('🎯 Migration Summary:');
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Updated users: ${updatedCount}`);
    console.log(`   Old complete profiles migrated: ${oldCompleteCount}`);

    // Final verification
    console.log('\n📈 Final Verification:');
    const finalUsers = await User.find({}, 'username email profileCompleted phone registrationNumber branch');
    finalUsers.forEach(user => {
      const canProceed = user.profileCompleted;
      console.log(`${canProceed ? '✅' : '❌'} ${user.username} - Phone: ${!!user.phone}, RegNum: ${!!user.registrationNumber}, Branch: ${!!user.branch}`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateOldUsers();