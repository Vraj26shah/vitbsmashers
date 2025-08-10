import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { signToken } from '../service/authService.js';



// Signup Controller
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 1) Check if user already exists by Findone user
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
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
    next(err);
  }
};




// Verify OTP Controller
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1) Find user by email
    const user = await User.findOne({ email }).select('+otp +otpExpires');
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

    // 2) Check if user exists and password is correct
    const user = await User.findOne({ username }).select('+password');

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
    next(err);
  }
};



// Export all functions as named exports
export default {
  signup,
  verifyOTP,
  login,
};