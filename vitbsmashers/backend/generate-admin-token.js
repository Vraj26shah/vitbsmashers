import mongoose from 'mongoose';
import User from './models/user.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function generateAdminToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    const user = await User.findOne({ email: 'admin@vitbhopal.ac.in' });
    if (!user) {
      console.log('Admin user not found, creating one...');
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@vitbhopal.ac.in',
        password: 'password123',
        fullName: 'Admin User',
        registrationNumber: 'ADMIN001',
        branch: 'ADMIN',
        year: '2024',
        phone: '9999999999',
        role: 'admin'
      });
      console.log('Admin user created');
    }

    const admin = await User.findOne({ email: 'admin@vitbhopal.ac.in' });
    const token = jwt.sign(
      { _id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
    );

    console.log('ADMIN TOKEN:', token);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

generateAdminToken();