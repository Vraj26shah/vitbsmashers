import mongoose from 'mongoose';
import User from './models/user.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const migrateProfileCompletion = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to check`);

    let updatedCount = 0;

    for (const user of users) {
      // Check if profile is actually complete based on current data (required fields only)
      const isComplete = !!(user.phone && user.registrationNumber && user.branch);

      // Update profileCompleted field if it doesn't match
      if (user.profileCompleted !== isComplete) {
        user.profileCompleted = isComplete;
        await user.save();
        updatedCount++;
        console.log(`Updated user ${user.username}: profileCompleted = ${isComplete}`);
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} users.`);

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateProfileCompletion();