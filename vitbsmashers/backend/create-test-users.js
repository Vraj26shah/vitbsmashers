import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Create test users with different states
    const testUsers = [
      {
        username: 'complete_user',
        email: 'complete@vitbhopal.ac.in',
        password: 'password123',
        fullName: 'Complete User',
        phone: '9876543210',
        registrationNumber: '21BCE0001',
        branch: 'CSE',
        year: '3rd Year',
        isVerified: true,
        profileCompleted: true
      },
      {
        username: 'incomplete_user',
        email: 'incomplete@vitbhopal.ac.in',
        password: 'password123',
        fullName: 'Incomplete User',
        phone: '', // Missing phone
        registrationNumber: '21BCE0002',
        branch: 'CSE',
        year: '3rd Year',
        isVerified: true,
        profileCompleted: false
      }
    ];

    for (const userData of testUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log('Created test user:', userData.username);
      } else {
        // Update existing user with new field structure
        existing.registrationNumber = userData.registrationNumber;
        existing.phone = userData.phone;
        existing.branch = userData.branch;
        existing.profileCompleted = userData.profileCompleted;
        await existing.save();
        console.log('Updated existing test user:', userData.username);
      }
    }

    console.log('Test users creation completed');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Test user creation failed:', error);
    process.exit(1);
  }
};

// Run the script
createTestUsers();