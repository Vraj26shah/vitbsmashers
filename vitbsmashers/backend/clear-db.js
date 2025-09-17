#!/usr/bin/env node

import 'dotenv/config.js';
import mongoose from 'mongoose';

console.log('🗑️  Database Cleanup Tool');
console.log('='.repeat(50));

async function clearDatabase() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📋 Found collections:', collections.map(c => c.name));

    // Clear users collection
    if (collections.some(c => c.name === 'users')) {
      console.log('\n🧹 Clearing users collection...');
      const result = await db.collection('users').deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} users`);
    } else {
      console.log('ℹ️  No users collection found');
    }

    console.log('\n🎉 Database cleanup completed!');
    console.log('💡 You can now sign up with any username/email');

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
clearDatabase();
