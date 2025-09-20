import mongoose from 'mongoose';
import User from './models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function generateToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    const user = await User.findOne({ email: 'complete@vitbhopal.ac.in' });
    if (!user) {
      console.log('User not found');
      return;
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    console.log('TOKEN:', token);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

generateToken();