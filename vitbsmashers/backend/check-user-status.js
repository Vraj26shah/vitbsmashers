import mongoose from 'mongoose';
import User from './models/user.model.js';
import { checkUserStatusForPayment } from './controllers/paymentController.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Find user by username 'vraj shah' or similar variations
    let user = await User.findOne({ username: 'vraj shah' });
    if (!user) user = await User.findOne({ username: 'vrajshah' });
    if (!user) user = await User.findOne({ username: 'vraj_shah' });
    if (!user) {
      // Try to find users with vraj or shah in username or email
      const usersWithVraj = await User.find({
        $or: [
          { username: { $regex: /vraj/i } },
          { email: { $regex: /vraj/i } },
          { username: { $regex: /shah/i } },
          { email: { $regex: /shah/i } }
        ]
      });
      if (usersWithVraj.length > 0) {
        user = usersWithVraj[0]; // Use the first match
        console.log(`Found user with similar name: ${user.username}`);
      }
    }

    // Also check for any VIT Bhopal emails that might be the user
    if (!user) {
      const vitUsers = await User.find({ email: { $regex: /@vitbhopal\.ac\.in$/ } });
      if (vitUsers.length > 0) {
        console.log('\nVIT Bhopal users found:');
        vitUsers.forEach(u => {
          console.log(`- ${u.username}: ${u.email}, verified=${u.isVerified}, profileComplete=${u.profileCompleted}`);
        });
      }
    }

    if (!user) {
      console.log('User "vraj shah" not found');

      // List all users
      const allUsers = await User.find({}, 'username email phone registrationNumber branch isVerified profileCompleted');
      console.log('\nAll users in database:');
      allUsers.forEach(u => {
        console.log(`- ${u.username}: email=${u.email}, verified=${u.isVerified}, phone=${!!u.phone}, regNum=${!!u.registrationNumber}, branch=${!!u.branch}, profileComplete=${u.profileCompleted}`);
      });
    } else {
      console.log('User found:');
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Verified: ${user.isVerified}`);
      console.log(`Phone: ${user.phone || 'NOT SET'}`);
      console.log(`Registration Number: ${user.registrationNumber || 'NOT SET'}`);
      console.log(`Branch: ${user.branch || 'NOT SET'}`);
      console.log(`Profile Completed: ${user.profileCompleted}`);

      // Check what the validation function returns
      const result = await checkUserStatusForPayment(user._id);
      console.log('\nValidation Result:', JSON.stringify(result, null, 2));
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();