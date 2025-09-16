import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { signToken } from '../service/authService.js';



// Signup Controller
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log(username, email, password);
    // 1) Check if user already exists by Findone user (optimized with timeout)
    const existingUser = await User.findOne({ $or: [{ username }, { email }] })
      .maxTimeMS(5000) // 5 second timeout
      .lean(); // Use lean() for better performance
    if (existingUser) {
      return next(new AppError('Username or email already exists', 400));
    }

    // 2) Create new user
    const newUser = await User.create({
      username,
      email,
      password
    });


    // 3) Generate OTP and send email
    const otp = newUser.generateOTP();
    await newUser.save({ validateBeforeSave: false });
    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      // In development mode, you can skip email sending for testing
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAIL === 'true') {
        console.log('🔐 DEVELOPMENT MODE - Skipping email sending');
        console.log('📧 Email would be sent to:', newUser.email);
        console.log('🔢 OTP for testing:', otp);
        
        res.status(201).json({
          status: 'success',
          message: 'OTP sent to your VIT email! (Development mode - email skipped)',
          development: {
            otp: otp,
            email: newUser.email
          }
        });
      } else {
        // Send actual email
        await sendEmail({
          email: newUser.email,
          subject: 'VIT Bhopal Account Verification OTP',
          message
        });

        res.status(201).json({
          status: 'success',
          message: 'OTP sent to your VIT email!'
        });
        
        // Development: Log OTP to console for testing
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 DEVELOPMENT MODE - OTP for testing:', otp);
          console.log('📧 Email would be sent to:', newUser.email);
        }
      }
    } catch (err) {
      newUser.otp = undefined;
      newUser.otpExpires = undefined;
      await newUser.save({ validateBeforeSave: false });

      console.error('Email error details:', err);
      return next(new AppError(`Email sending failed: ${err.message}`, 500));
    }
  } catch (err) {
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};




// Verify OTP Controller
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1) Find user by email (optimized with timeout)
    const user = await User.findOne({ email })
      .select('+otp +otpExpires')
      .maxTimeMS(5000); // 5 second timeout
    if (!user) {
      return next(new AppError('No user found with that email', 404));
    }

    // 2) Check if OTP matches and is not expired
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return next(new AppError('Invalid or expired OTP', 400));
    }

    // 3) Mark user as verified and clear OTP

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // 4) Log the user in
    const token = signToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};


// Resend OTP Controller
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1) Find user by email (optimized with timeout)
    const user = await User.findOne({ email })
      .select('+otp +otpExpires')
      .maxTimeMS(5000); // 5 second timeout
    if (!user) {
      return next(new AppError('No user found with that email', 404));
    }

    // 2) If already verified, do not resend
    if (user.isVerified) {
      return next(new AppError('User already verified', 400));
    }

    // 3) Generate new OTP and send
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });
    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      if (process.env.NODE_ENV === 'development' && process.env.SKIP_EMAIL === 'true') {
        console.log('🔐 DEVELOPMENT MODE - Resend OTP (email skipped)');
        console.log('📧 Email would be sent to:', user.email);
        console.log('🔢 OTP for testing:', otp);

        return res.status(200).json({
          status: 'success',
          message: 'OTP re-sent! (Development mode - email skipped)',
          development: { otp, email: user.email }
        });
      }

      await sendEmail({
        email: user.email,
        subject: 'VIT Bhopal Account Verification OTP (Resend)',
        message
      });

      res.status(200).json({
        status: 'success',
        message: 'OTP re-sent to your email'
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 DEVELOPMENT MODE - Resent OTP for testing:', otp);
        console.log('📧 Email would be sent to:', user.email);
      }
    } catch (err) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Email error details (resend):', err);
      return next(new AppError(`Email sending failed: ${err.message}`, 500));
    }
  } catch (err) {
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};

// Login Controller
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 1) Check if username and password exist
    if (!username || !password) {
      return next(new AppError('Please provide username and password', 400));
    }

    // 2) Check if user exists and password is correct (optimized with timeout)
    const user = await User.findOne({ username })
      .select('+password')
      .maxTimeMS(3000); // 3 second timeout for login

    if (!user || !(await user.correctPassword(password))) {
      return next(new AppError('Incorrect username or password', 401));
    }

    // 3) Check if user is verified
    if (!user.isVerified) {
      return next(new AppError('Please verify your email first', 401));
    }

    // 4) If everything ok, send token to client
    const token = signToken(user._id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};



// Export all functions as named exports
export default {
  signup,
  verifyOTP,
  resendOTP,
  login,
};