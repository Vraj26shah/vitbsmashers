#!/usr/bin/env node

import 'dotenv/config.js';
import mongoose from 'mongoose';
import User from './models/user.model.js';

console.log('👥 User Database Checker');
console.log('='.repeat(50));

async function checkUsers() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({}).select('username email isVerified createdAt');
    
    if (users.length === 0) {
      console.log('📭 No users found in database');
      console.log('💡 You can sign up with any username/email');
    } else {
      console.log(`📊 Found ${users.length} user(s) in database:`);
      console.log('');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Verified: ${user.isVerified ? '✅ Yes' : '❌ No'}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log('');
      });
      
      console.log('💡 To avoid conflicts, use different username/email');
      console.log('💡 Or run: node clear-db.js to clear all users');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the check
checkUsers();
