import mongoose from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    unique: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    index: true, // Index for faster username lookups
  },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    index: true, // Index for search by name
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index: true, // Index for faster email lookups
    validate: {
      validator: function(value) {
        return (
          value.endsWith('@vitbhopal.ac.in') &&
          validator.isEmail(value) &&
          /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)?@vitbhopal\.ac\.in$/.test(value)
        );
      },
      message: 'Email must be a valid VIT Bhopal email',
    },
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        return validator.isMobilePhone(value, 'en-IN'); // Validate Indian phone numbers
      },
      message: 'Please provide a valid Indian phone number',
    },
    sparse: true, // Allow null/undefined values with unique constraint
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters long'],
    select: false,
  },
  purchasedCourses: {
    type: [String], // Array of course IDs
    default: [],
    index: true, // Index for faster lookup of purchased courses
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'instructor'], // Add roles as needed
    default: 'student',
    index: true, // Index for role-based queries
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpires: {
    type: Date,
    select: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  passwordChangedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt and hash password on document save
userSchema.pre('save', async function(next) {
  try {
    if (this.isModified()) {
      this.updatedAt = getISTTime(); // Use IST time as defined earlier
    }
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 10);
    this.passwordChangedAt = new Date(getISTTime().getTime() - 1000); // Use IST time
    next();
  } catch (error) {
    next(error); // Pass any errors to Mongoose
  }
});

// Method to compare passwords
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Compound indexes for better query performance
userSchema.index({ email: 1, isVerified: 1 });
userSchema.index({ username: 1, role: 1 }); // Useful for role-based username queries

const User = mongoose.model('User', userSchema);

export default User;