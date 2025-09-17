import mongoose from 'mongoose';
import User from './models/user.model.js';
import { checkUserStatusForPayment } from './controllers/paymentController.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testPaymentValidation = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vitbsmashers');
    console.log('Connected to MongoDB for testing');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users for testing`);

    for (const user of users) {
      console.log(`\n--- Testing User: ${user.username} ---`);
      console.log(`Email: ${user.email}`);
      console.log(`Verified: ${user.isVerified}`);
      console.log(`Profile fields - Phone: ${!!user.phone}, RegistrationNumber: ${!!user.registrationNumber}, Branch: ${!!user.branch}`);

      // Test the validation function
      const result = await checkUserStatusForPayment(user._id);
      console.log('Validation Result:', result);
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

// Run test
testPaymentValidation();