import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { signToken } from '../service/authService.js';
import { OAuth2Client } from 'google-auth-library';

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Signup Controller
export const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log('🔐 SIGNUP REQUEST RECEIVED:');
    console.log('   👤 Username:', username);
    console.log('   📧 Email:', email);
    console.log('   🔑 Password: *** (hidden for security)');

    // 1) Check if user already exists by Findone user (optimized with timeout)
    console.log('🔍 DATABASE QUERY: Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ username }, { email }] })
      .maxTimeMS(5000) // 5 second timeout
      .lean(); // Use lean() for better performance

    if (existingUser) {
      console.log('❌ DATABASE RESULT: User already exists!');
      console.log('   📋 Existing user details:', {
        username: existingUser.username,
        email: existingUser.email,
        isVerified: existingUser.isVerified
      });
      return next(new AppError('Username or email already exists', 400));
    }
    console.log('✅ DATABASE RESULT: No existing user found, proceeding...');

    // 2) Create new user with timeout
    console.log('👤 DATABASE OPERATION: Creating new user...');
    let newUser;
    try {
      newUser = await User.create({
        username,
        email,
        password
      });
      console.log('✅ DATABASE SUCCESS: User created successfully!');
    } catch (createErr) {
      console.error('❌ DATABASE ERROR: Failed to create user:', createErr.message);
      if (createErr.name === 'MongoServerError' && createErr.code === 11000) {
        return next(new AppError('Username or email already exists', 400));
      }
      return next(new AppError('Failed to create user - database issue', 500));
    }
    console.log('   🆔 User ID:', newUser._id);
    console.log('   👤 Username:', newUser.username);
    console.log('   📧 Email:', newUser.email);
    console.log('   ✅ Verified:', newUser.isVerified);

    // 3) Generate OTP and send email
    console.log('🔢 OTP GENERATION: Generating OTP for user...');
    const otp = newUser.generateOTP();
    console.log('   🔢 Generated OTP:', otp);
    console.log('   ⏰ OTP Expires:', new Date(newUser.otpExpires).toLocaleString());

    // OTP is now displayed only on the website frontend, not in terminal

    console.log('💾 DATABASE OPERATION: Saving user with OTP...');
    try {
      await newUser.save({ validateBeforeSave: false });
      console.log('✅ DATABASE SUCCESS: User with OTP saved successfully!');
    } catch (saveErr) {
      console.error('❌ DATABASE ERROR: Failed to save OTP:', saveErr.message);
      // In development, still continue even if save fails - OTP is already displayed
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Database save failed, but OTP is displayed above for testing');
      } else {
        return next(new AppError('Failed to save user data', 500));
      }
    }

    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      // Skip email if configured
      if (process.env.SKIP_EMAIL === 'true') {
        res.status(201).json({
          status: 'success',
          message: 'OTP ready for verification! (Email skipped)',
          development: {
            otp: otp,
            email: newUser.email
          }
        });
        return;
      }

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

      // In development, already showed OTP above
    } catch (err) {
      console.error('Email error details:', err);
      // In development, don't clear OTP on email failure - keep for manual testing
      if (process.env.NODE_ENV !== 'development') {
        newUser.otp = undefined;
        newUser.otpExpires = undefined;
        await newUser.save({ validateBeforeSave: false });
      } else {
        console.log('⚠️ Email failed in dev - OTP still available in console for testing');
      }
      return next(new AppError(`Email sending failed: ${err.message}`, 500));
    }
      console.log('   🔢 Generated OTP:', otp);

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
    console.log('🔍 DATABASE QUERY: Finding user by email for OTP verification...');
    console.log('   📧 Email:', email);
    const user = await User.findOne({ email })
      .select('+otp +otpExpires')
      .maxTimeMS(5000); // 5 second timeout

    if (!user) {
      console.log('❌ DATABASE RESULT: No user found with email:', email);
      return next(new AppError('No user found with that email', 404));
    }
    console.log('✅ DATABASE RESULT: User found!');
    console.log('   🆔 User ID:', user._id);
    console.log('   👤 Username:', user.username);
    console.log('   📧 Email:', user.email);

    // 2) Check if OTP matches and is not expired
    console.log('🔍 OTP VALIDATION: Checking OTP...');
    console.log('   🔢 Provided OTP:', otp);
    console.log('   🔢 Stored OTP:', user.otp);
    console.log('   ⏰ OTP Expires:', new Date(user.otpExpires).toLocaleString());
    console.log('   🕐 Current Time:', new Date().toLocaleString());

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      console.log('❌ OTP VALIDATION: Invalid or expired OTP!');
      if (user.otp !== otp) {
        console.log('   ❌ Reason: OTP does not match');
      } else {
        console.log('   ❌ Reason: OTP has expired');
      }
      return next(new AppError('Invalid or expired OTP', 400));
    }
    console.log('✅ OTP VALIDATION: OTP is valid!');

    // 3) Mark user as verified and clear OTP
    console.log('💾 DATABASE OPERATION: Updating user verification status...');
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log('✅ DATABASE SUCCESS: User verification updated!');
    console.log('   ✅ User is now verified:', user.isVerified);
    console.log('   🔢 OTP cleared from database');

    // 4) Log the user in
    const token = signToken(user._id, user.email);

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
    console.log('   🔢 New OTP Generated:', otp);
    console.log('   ⏰ OTP Expires:', new Date(user.otpExpires).toLocaleString());

    // OTP is now displayed only on the website frontend, not in terminal

    try {
      await user.save({ validateBeforeSave: false });
      console.log('✅ DATABASE SUCCESS: New OTP saved for resend');
    } catch (saveErr) {
      console.error('❌ DATABASE ERROR: Failed to save new OTP for resend:', saveErr.message);
      // In development, still continue even if save fails - OTP is already displayed
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Database save failed, but OTP is displayed above for testing');
      } else {
        return next(new AppError('Failed to update OTP', 500));
      }
    }

    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      // Skip email if configured
      if (process.env.SKIP_EMAIL === 'true') {
        return res.status(200).json({
          status: 'success',
          message: 'OTP re-sent! (Email skipped)',
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

      // In development, already showed OTP above
    } catch (err) {
      console.error('Email error details (resend):', err);
      // In development, don't clear OTP on email failure
      if (process.env.NODE_ENV !== 'development') {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
      } else {
        console.log('⚠️ Email resend failed in dev - OTP still available in console');
      }
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
    const token = signToken(user._id, user.email);

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

// Google ID Token Verification Controller (for client-side Google Sign-In)
export const verifyGoogleToken = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return next(new AppError('ID token is required', 400));
    }

    // Verify the ID token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const displayName = payload.name;
    const picture = payload.picture;

    console.log('🔍 GOOGLE TOKEN VERIFICATION:');
    console.log('   🆔 Google ID:', googleId);
    console.log('   📧 Email:', email);
    console.log('   👤 Name:', displayName);

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });

    if (user) {
      // User exists, return token
      console.log('✅ User found with Google ID');
      const token = signToken(user._id, user.email);
      return res.status(200).json({
        status: 'success',
        token,
        data: { user, authMethod: 'google' }
      });
    }

    // Check if user exists with the same email
    user = await User.findOne({ email });

    if (user) {
      // User exists with email but no Google ID - link the accounts
      user.googleId = googleId;
      user.fullName = displayName;
      user.profilePicture = picture;
      await user.save();
      console.log('✅ Linked existing user with Google account');
      const token = signToken(user._id, user.email);
      return res.status(200).json({
        status: 'success',
        token,
        data: { user, authMethod: 'google_linked' }
      });
    }

    // Validate that email is from VIT Bhopal
    console.log('🔍 Checking email domain:', email);
    if (!email) {
      console.log('❌ No email provided');
      return next(new AppError('❌ Authentication Error<br><strong>No email found in your Google account.</strong><br><small>Please ensure your Google account has a valid email address.</small>', 401));
    }

    if (!email.endsWith('@vitbhopal.ac.in')) {
      console.log('❌ Non-VIT email detected:', email);
      const domain = email.split('@')[1] || 'unknown';
      return next(new AppError(`❌ Invalid Account Type<br><strong>Only VIT Bhopal emails (@vitbhopal.ac.in) are allowed.</strong><br><small>You tried to sign in with: ${email}<br>Please use your institutional Google account.</small>`, 401));
    }
    console.log('✅ VIT email validated:', email);

    // Create new user
    const newUser = await User.create({
      googleId,
      email,
      username: displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
      fullName: displayName,
      profilePicture: picture,
      isVerified: true, // Google accounts are pre-verified
      role: email === 'vitbsmashers@gmail.com' ? 'admin' : 'user'
    });

    console.log('✅ New user created via Google auth');
    console.log('   🆔 User ID:', newUser._id);
    console.log('   👤 Username:', newUser.username);

    const token = signToken(newUser._id, newUser.email);
    res.status(201).json({
      status: 'success',
      token,
      data: { user: newUser, authMethod: 'google_new' }
    });
  } catch (err) {
    console.error('❌ Google token verification error:', err.message);
    if (err.message.includes('invalid_token') || err.message.includes('not a valid origin')) {
      return next(new AppError('Invalid Google token. Please try signing in again.', 401));
    }
    next(new AppError('Google authentication failed', 500));
  }
};

// Export all functions as named exports
export default {
  signup,
  verifyOTP,
  resendOTP,
  login,
  verifyGoogleToken
};