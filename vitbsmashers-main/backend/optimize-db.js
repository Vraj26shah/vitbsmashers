import mongoose from 'mongoose';
import User from './models/user.model.js';

// Database optimization script
async function optimizeDatabase() {
  try {
    console.log('🔧 Starting database optimization...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });

    console.log('✅ Connected to MongoDB');

    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // Create username index
    await User.collection.createIndex({ username: 1 }, { unique: true });
    console.log('✅ Username index created');
    
    // Create email index
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Email index created');
    
    // Create compound indexes
    await User.collection.createIndex({ username: 1, email: 1 });
    console.log('✅ Username-Email compound index created');
    
    await User.collection.createIndex({ email: 1, isVerified: 1 });
    console.log('✅ Email-Verification compound index created');

    // Test query performance
    console.log('⚡ Testing query performance...');
    
    const startTime = Date.now();
    const testUser = await User.findOne({}).maxTimeMS(3000);
    const endTime = Date.now();
    
    console.log(`✅ Test query completed in ${endTime - startTime}ms`);
    
    if (endTime - startTime > 1000) {
      console.log('⚠️  Warning: Query still taking longer than 1000ms');
      console.log('💡 Consider checking your MongoDB Atlas connection and IP whitelist');
    } else {
      console.log('🎉 Database optimization successful!');
    }

  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('💡 IP Whitelist Issue Detected!');
      console.log('📋 Steps to fix:');
      console.log('1. Go to MongoDB Atlas Dashboard');
      console.log('2. Navigate to Network Access');
      console.log('3. Add your current IP address');
      console.log('4. Or add 0.0.0.0/0 for all IPs (less secure)');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run optimization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  optimizeDatabase();
}

export default optimizeDatabase;
