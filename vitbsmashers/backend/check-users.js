import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    const users = await User.find({}).select('username email purchasedCourses');
    console.log('Users in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}): ${user.purchasedCourses?.length || 0} courses`);
      if (user.purchasedCourses?.length > 0) {
        console.log(`  Courses: ${user.purchasedCourses.join(', ')}`);
      }
    });
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
