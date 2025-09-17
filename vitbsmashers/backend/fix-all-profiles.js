import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixAllProfiles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Find all users
    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} users to check`);

    let updatedCount = 0;

    for (const user of allUsers) {
      // Check if profile is actually complete based on current requirements
      const hasPhone = !!(user.phone && user.phone.trim());
      const hasRegistrationNumber = !!(user.registrationNumber && user.registrationNumber.trim());
      const hasBranch = !!(user.branch && user.branch.trim());

      const shouldBeComplete = hasPhone && hasRegistrationNumber && hasBranch;

      // Update profileCompleted field if it doesn't match
      if (user.profileCompleted !== shouldBeComplete) {
        user.profileCompleted = shouldBeComplete;
        await user.save();
        updatedCount++;

        console.log(`✅ Fixed user ${user.username}:`);
        console.log(`   - Phone: ${hasPhone ? '✓' : '✗'} (${user.phone || 'missing'})`);
        console.log(`   - Registration Number: ${hasRegistrationNumber ? '✓' : '✗'} (${user.registrationNumber || 'missing'})`);
        console.log(`   - Branch: ${hasBranch ? '✓' : '✗'} (${user.branch || 'missing'})`);
        console.log(`   - Profile Completed: ${shouldBeComplete}`);
        console.log('');
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} users.`);

    // Show final status of all users
    console.log('\n📊 Final status of all users:');
    const finalUsers = await User.find({}, 'username email phone registrationNumber branch isVerified profileCompleted');
    finalUsers.forEach(user => {
      const status = user.profileCompleted ? '✅ Complete' : '❌ Incomplete';
      console.log(`${status} - ${user.username} (${user.email})`);
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAllProfiles();