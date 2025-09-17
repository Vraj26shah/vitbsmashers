// Check user profile completion status
import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    const users = await User.find({}, 'username email phone registrationNumber branch profileCompleted');

    console.log('Total users:', users.length);
    console.log('User profile status:');
    users.forEach(user => {
      const hasPhone = !!(user.phone && user.phone.trim());
      const hasRegistrationNumber = !!(user.registrationNumber && user.registrationNumber.trim());
      const hasBranch = !!(user.branch && user.branch.trim());
      const isComplete = user.profileCompleted;

      console.log(`${user.username} (${user.email}):`);
      console.log(`  Phone: ${hasPhone ? '✓' : '✗'} (${user.phone || 'empty'})`);
      console.log(`  Registration Number: ${hasRegistrationNumber ? '✓' : '✗'} (${user.registrationNumber || 'empty'})`);
      console.log(`  Branch: ${hasBranch ? '✓' : '✗'} (${user.branch || 'empty'})`);
      console.log(`  Profile Completed: ${isComplete ? '✓' : '✗'}`);
      console.log(`  Should be complete: ${hasPhone && hasRollNumber && hasBranch ? '✓' : '✗'}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
