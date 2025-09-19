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
    index: true // Add index for faster username lookups
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    index: true, // Add index for faster email lookups
    validate: {
      validator: function(value) {
        return value.endsWith('@vitbhopal.ac.in') &&
                validator.isEmail(value) &&
                /^[a-zA-Z0-9._-]+@vitbhopal\.ac\.in$/.test(value);
      },
      message: 'Email must be a valid VIT Bhopal email'
    }
  },
  password: {
    type: String,
    required: function() {
      // Password is required only if user is not authenticated via Google
      return !this.googleId;
    },
    minlength: [4, 'Password must be at least 4 characters long'],
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness for non-null values
    index: true
  },
  otp: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: {
    type: Date
  },
  // Rate limiting for updates
  updateCount: {
    type: Number,
    default: 0
  },
  lastUpdateDate: {
    type: Date,
    default: Date.now
  },
  // Profile completion fields for purchases
  profileCompleted: {
    type: Boolean,
    default: false
  },
  phone: {
    type: String,
    required: false
  },
  fullName: {
    type: String,
    required: false
  },
  registrationNumber: {
    type: String,
    required: false
  },
  branch: {
    type: String,
    required: false
  },
  year: {
    type: String,
    required: false
  },
  // Purchased courses for marketplace
  purchasedCourses: [{
    type: String, // Course IDs
    default: []
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
});

// Hash password before saving (only if password exists)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token was issued before password change
  next();
});


// Method to compare passwords
userSchema.methods.correctPassword = async function(candidatePassword) {
  if (!this.password) return false; // OAuth users don't have passwords
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user is authenticated via Google
userSchema.methods.isGoogleUser = function() {
  return !!this.googleId;
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
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to check and increment update count (rate limiting)
userSchema.methods.canUpdateToday = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastUpdate = new Date(this.lastUpdateDate);
  lastUpdate.setHours(0, 0, 0, 0);

  // Reset count if it's a new day
  if (today > lastUpdate) {
    this.updateCount = 0;
    this.lastUpdateDate = new Date();
    return true;
  }

  // Check if under limit (5 updates per day)
  return this.updateCount < 5;
};

userSchema.methods.incrementUpdateCount = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastUpdate = new Date(this.lastUpdateDate);
  lastUpdate.setHours(0, 0, 0, 0);

  // Reset count if it's a new day
  if (today > lastUpdate) {
    this.updateCount = 1;
  } else {
    this.updateCount += 1;
  }

  this.lastUpdateDate = new Date();
};

// Method to check if profile is complete for purchases
userSchema.methods.isProfileComplete = function() {
  // Use the stored profileCompleted field if it exists, otherwise check individual fields
  if (this.profileCompleted !== undefined) {
    return this.profileCompleted;
  }
  return !!(this.phone &&
            this.registrationNumber &&
            this.branch);
};

// Add compound indexes for better query performance
userSchema.index({ username: 1, email: 1 });
userSchema.index({ email: 1, isVerified: 1 });

const User = mongoose.model('User', userSchema);

export default User;