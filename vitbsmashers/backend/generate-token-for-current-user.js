import mongoose from 'mongoose';
import User from './models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function generateTokenForCurrentUser() {
  try {
    await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI);

    // Get the current user who has courses
    const user = await User.findById('68ca2f48b7be77741bbc71cc');
    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    console.log('CURRENT USER TOKEN:', token);
    console.log('User:', user.username, '(' + user.email + ')');
    console.log('Courses:', user.purchasedCourses.join(', '));

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

generateTokenForCurrentUser();