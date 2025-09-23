import User from '../models/user.model.js';
import AppError from '../utils/appError.js';
import sendEmail from '../utils/email.js';
import { signToken } from '../service/authService.js';
import { OAuth2Client } from 'google-auth-library';

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Signup Controller
export const signup = async (req, res, next) => {
  console.log('🔄 SIGNUP: Starting signup process');
  console.log('📝 SIGNUP: Request body:', { username: req.body.username, email: req.body.email, hasPassword: !!req.body.password });

  try {
    const { username, email, password } = req.body;

    // Validate input data
    if (!username || !email || !password) {
      console.log('❌ SIGNUP: Missing required fields');
      return next(new AppError('Username, email, and password are required', 400));
    }

    if (!email.endsWith('@vitbhopal.ac.in')) {
      console.log('❌ SIGNUP: Invalid email domain:', email);
      return next(new AppError('Only VIT Bhopal emails (@vitbhopal.ac.in) are allowed', 400));
    }

    if (username.length < 3) {
      console.log('❌ SIGNUP: Username too short:', username);
      return next(new AppError('Username must be at least 3 characters long', 400));
    }

    if (password.length < 6) {
      console.log('❌ SIGNUP: Password too short');
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    console.log('🔍 SIGNUP: Checking for existing user...');

    // 1) Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] })
      .maxTimeMS(5000)
      .lean();

    if (existingUser) {
      console.log('❌ SIGNUP: User already exists:', existingUser.username === username ? 'username' : 'email');
      return next(new AppError('Username or email already exists', 400));
    }

    console.log('✅ SIGNUP: No existing user found, proceeding with creation');

    // 2) Create new user
    let newUser;
    try {
      console.log('🔄 SIGNUP: Creating new user in database...');
      newUser = await User.create({
        username,
        email,
        password
      });
      console.log('✅ SIGNUP: User created successfully with ID:', newUser._id);
    } catch (createErr) {
      console.error('❌ SIGNUP: User creation failed:', createErr.message);
      if (createErr.name === 'MongoServerError' && createErr.code === 11000) {
        console.log('❌ SIGNUP: Duplicate key error (race condition)');
        return next(new AppError('Username or email already exists', 400));
      }
      console.error('❌ SIGNUP: Database error during user creation:', createErr);
      return next(new AppError('Failed to create user - database issue', 500));
    }

    // 3) Generate OTP and send email
    console.log('🔄 SIGNUP: Generating OTP...');
    const otp = newUser.generateOTP();
    console.log('✅ SIGNUP: OTP generated successfully');

    try {
      console.log('🔄 SIGNUP: Saving user with OTP...');
      await newUser.save({ validateBeforeSave: false });
      console.log('✅ SIGNUP: User saved with OTP');
    } catch (saveErr) {
      console.error('❌ SIGNUP: Failed to save user with OTP:', saveErr.message);
      // In development, still continue even if save fails - OTP is already displayed
      if (process.env.NODE_ENV !== 'development') {
        console.log('❌ SIGNUP: Production mode - cannot continue without saving OTP');
        return next(new AppError('Failed to save user data', 500));
      }
      console.log('⚠️ SIGNUP: Development mode - continuing despite save failure');
    }

    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      // Skip email if configured
      if (process.env.SKIP_EMAIL === 'true') {
        console.log(`✅ SIGNUP: Email sending skipped (SKIP_EMAIL=true), OTP: ${otp}`);
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

      console.log('📧 SIGNUP: Sending email to:', newUser.email);
      // Send actual email
      await sendEmail({
        email: newUser.email,
        subject: 'VIT Bhopal Account Verification OTP',
        message
      });
      console.log('✅ SIGNUP: Email sent successfully');

      res.status(201).json({
        status: 'success',
        message: 'OTP sent to your VIT email!'
      });

    } catch (err) {
      console.error('❌ SIGNUP: Email sending failed:', err.message);
      // In development, don't clear OTP on email failure
      if (process.env.NODE_ENV !== 'development') {
        console.log('🔄 SIGNUP: Clearing OTP due to email failure (production mode)');
        newUser.otp = undefined;
        newUser.otpExpires = undefined;
        await newUser.save({ validateBeforeSave: false });
      }
      return next(new AppError(`Email sending failed: ${err.message}`, 500));
    }

  } catch (err) {
    console.error('❌ SIGNUP: Unexpected error:', err.message);
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      console.log('❌ SIGNUP: Database timeout error');
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};


// Verify OTP Controller
export const verifyOTP = async (req, res, next) => {
  console.log('🔄 VERIFY OTP: Starting OTP verification process');
  console.log('📝 VERIFY OTP: Request body:', { email: req.body.email, hasOtp: !!req.body.otp });

  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      console.log('❌ VERIFY OTP: Missing email or OTP');
      return next(new AppError('Email and OTP are required', 400));
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      console.log('❌ VERIFY OTP: Invalid OTP format:', otp);
      return next(new AppError('OTP must be a 6-digit number', 400));
    }

    console.log('🔍 VERIFY OTP: Looking up user by email...');

    // 1) Find user by email
    const user = await User.findOne({ email })
      .select('+otp +otpExpires')
      .maxTimeMS(5000);

    if (!user) {
      console.log('❌ VERIFY OTP: No user found with email:', email);
      return next(new AppError('No user found with that email', 404));
    }

    console.log('✅ VERIFY OTP: User found:', user.username);

    // 2) Check if OTP matches and is not expired
    console.log('🔍 VERIFY OTP: Checking OTP validity...');
    const currentTime = Date.now();
    const isExpired = user.otpExpires < currentTime;
    const isMatch = user.otp === otp;

    console.log('🔍 VERIFY OTP: OTP check details:', {
      providedOtp: otp,
      storedOtp: user.otp,
      expiresAt: new Date(user.otpExpires).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      isExpired,
      isMatch
    });

    if (!isMatch) {
      console.log('❌ VERIFY OTP: OTP does not match');
      return next(new AppError('Invalid OTP code', 400));
    }

    if (isExpired) {
      console.log('❌ VERIFY OTP: OTP has expired');
      return next(new AppError('OTP has expired. Please request a new one.', 400));
    }

    console.log('✅ VERIFY OTP: OTP is valid');

    // 3) Mark user as verified and clear OTP
    console.log('🔄 VERIFY OTP: Updating user verification status...');
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log('✅ VERIFY OTP: User verified and OTP cleared');

    // 4) Log the user in
    console.log('🔄 VERIFY OTP: Generating authentication token...');
    const token = signToken(user._id, user.email);
    console.log('✅ VERIFY OTP: Token generated successfully');

    console.log(`✅ OTP VERIFICATION: User ${user.username} verified successfully`);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    console.error('❌ VERIFY OTP: Unexpected error:', err.message);
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      console.log('❌ VERIFY OTP: Database timeout error');
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};


// Resend OTP Controller
export const resendOTP = async (req, res, next) => {
  console.log('🔄 RESEND OTP: Starting OTP resend process');
  console.log('📝 RESEND OTP: Request body:', { email: req.body.email });

  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      console.log('❌ RESEND OTP: Missing email');
      return next(new AppError('Email is required', 400));
    }

    if (!email.endsWith('@vitbhopal.ac.in')) {
      console.log('❌ RESEND OTP: Invalid email domain:', email);
      return next(new AppError('Only VIT Bhopal emails are allowed', 400));
    }

    console.log('🔍 RESEND OTP: Looking up user by email...');

    // 1) Find user by email
    const user = await User.findOne({ email })
      .select('+otp +otpExpires')
      .maxTimeMS(5000);

    if (!user) {
      console.log('❌ RESEND OTP: No user found with email:', email);
      return next(new AppError('No user found with that email', 404));
    }

    console.log('✅ RESEND OTP: User found:', user.username);

    // 2) If already verified, do not resend
    if (user.isVerified) {
      console.log('❌ RESEND OTP: User already verified');
      return next(new AppError('User already verified', 400));
    }

    console.log('🔄 RESEND OTP: Generating new OTP...');

    // 3) Generate new OTP and send
    const otp = user.generateOTP();
    console.log('✅ RESEND OTP: New OTP generated');

    try {
      console.log('🔄 RESEND OTP: Saving user with new OTP...');
      await user.save({ validateBeforeSave: false });
      console.log('✅ RESEND OTP: User saved with new OTP');
    } catch (saveErr) {
      console.error('❌ RESEND OTP: Failed to save user with new OTP:', saveErr.message);
      if (process.env.NODE_ENV !== 'development') {
        console.log('❌ RESEND OTP: Production mode - cannot continue without saving OTP');
        return next(new AppError('Failed to update OTP', 500));
      }
      console.log('⚠️ RESEND OTP: Development mode - continuing despite save failure');
    }

    const message = `Your OTP for verification is: ${otp}\nThis OTP is valid for 10 minutes.`;

    try {
      // Skip email if configured
      if (process.env.SKIP_EMAIL === 'true') {
        console.log(`📧 OTP RESEND: Email sending skipped (SKIP_EMAIL=true), OTP: ${otp}`);
        return res.status(200).json({
          status: 'success',
          message: 'OTP re-sent! (Email skipped)',
          development: { otp, email: user.email }
        });
      }

      console.log('📧 RESEND OTP: Sending email to:', user.email);
      await sendEmail({
        email: user.email,
        subject: 'VIT Bhopal Account Verification OTP (Resend)',
        message
      });
      console.log('✅ RESEND OTP: Email sent successfully');

      res.status(200).json({
        status: 'success',
        message: 'OTP re-sent to your email'
      });

    } catch (err) {
      console.error('❌ RESEND OTP: Email sending failed:', err.message);
      if (process.env.NODE_ENV !== 'development') {
        console.log('🔄 RESEND OTP: Clearing OTP due to email failure (production mode)');
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });
      }
      return next(new AppError(`Email sending failed: ${err.message}`, 500));
    }
  } catch (err) {
    console.error('❌ RESEND OTP: Unexpected error:', err.message);
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      console.log('❌ RESEND OTP: Database timeout error');
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};

// Login Controller
export const login = async (req, res, next) => {
  console.log('🔄 LOGIN: Starting login process');
  console.log('📝 LOGIN: Request body:', { username: req.body.username, hasPassword: !!req.body.password });

  try {
    const { username, password } = req.body;

    // 1) Check if username and password exist
    if (!username || !password) {
      console.log('❌ LOGIN: Missing username or password');
      return next(new AppError('Please provide username and password', 400));
    }

    if (username.length < 3) {
      console.log('❌ LOGIN: Username too short:', username);
      return next(new AppError('Username must be at least 3 characters long', 400));
    }

    console.log('🔍 LOGIN: Looking up user by username...');

    // 2) Check if user exists and password is correct
    const user = await User.findOne({ username })
      .select('+password')
      .maxTimeMS(3000);

    if (!user) {
      console.log('❌ LOGIN: User not found:', username);
      return next(new AppError('Incorrect username or password', 401));
    }

    console.log('✅ LOGIN: User found, checking password...');

    const isPasswordCorrect = await user.correctPassword(password);
    if (!isPasswordCorrect) {
      console.log('❌ LOGIN: Incorrect password for user:', username);
      return next(new AppError('Incorrect username or password', 401));
    }

    console.log('✅ LOGIN: Password correct');

    // 3) Check if user is verified
    if (!user.isVerified) {
      console.log('❌ LOGIN: User not verified:', username);
      return next(new AppError('Please verify your email first', 401));
    }

    console.log('✅ LOGIN: User is verified');

    // 4) If everything ok, send token to client
    console.log('🔄 LOGIN: Generating authentication token...');
    const token = signToken(user._id, user.email);
    console.log('✅ LOGIN: Token generated successfully');

    console.log(`✅ LOGIN: User ${username} logged in successfully`);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user
      }
    });
  } catch (err) {
    console.error('❌ LOGIN: Unexpected error:', err.message);
    // Handle database timeout errors specifically
    if (err.name === 'MongooseServerSelectionError' || err.message.includes('timeout')) {
      console.log('❌ LOGIN: Database timeout error');
      return next(new AppError('Database connection timeout. Please try again.', 408));
    }
    next(err);
  }
};

// Google ID Token Verification Controller (for client-side Google Sign-In)
export const verifyGoogleToken = async (req, res, next) => {
  console.log('🚀 GOOGLE AUTH: ===== STARTING GOOGLE TOKEN VERIFICATION =====');
  console.log('📝 GOOGLE AUTH: Request received at:', new Date().toISOString());
  console.log('📝 GOOGLE AUTH: Request body has idToken:', !!req.body.idToken);
  console.log('📝 GOOGLE AUTH: Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });

  try {
    const { idToken } = req.body;
    if (!idToken) {
      console.log('❌ GOOGLE AUTH: STEP 1 - Missing ID token in request body');
      console.log('❌ GOOGLE AUTH: Request body keys:', Object.keys(req.body));
      return res.status(400).json({
        status: 'error',
        message: 'ID token is required',
        step: 'validation',
        error: 'missing_token'
      });
    }

    console.log('✅ GOOGLE AUTH: STEP 1 - ID token received, length:', idToken.length);

    // Validate token format
    if (typeof idToken !== 'string' || idToken.split('.').length !== 3) {
      console.log('❌ GOOGLE AUTH: STEP 2 - Invalid token format');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid token format',
        step: 'validation',
        error: 'invalid_format'
      });
    }

    console.log('🔍 GOOGLE AUTH: STEP 2 - Verifying ID token with Google...');

    // Verify the ID token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    if (!ticket) {
      console.log('❌ GOOGLE AUTH: STEP 3 - Google token verification failed - no ticket returned');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid Google token. Please try signing in again.',
        step: 'google_verification',
        error: 'no_ticket'
      });
    }

    const payload = ticket.getPayload();
    console.log('✅ GOOGLE AUTH: STEP 3 - Token verified with Google, extracting payload...');

    const googleId = payload.sub;
    const email = payload.email;
    const displayName = payload.name;
    const picture = payload.picture;

    console.log('📝 GOOGLE AUTH: STEP 4 - Extracted user data:', {
      googleId: googleId ? 'present' : 'missing',
      email: email ? 'present' : 'missing',
      displayName: displayName ? 'present' : 'missing',
      picture: picture ? 'present' : 'missing',
      emailValue: email
    });

    // Validate that email is from VIT Bhopal
    if (!email) {
      console.log('❌ GOOGLE AUTH: STEP 5 - No email in Google payload');
      return res.status(401).json({
        status: 'error',
        message: 'No email found in your Google account. Please ensure your Google account has a valid email address.',
        step: 'email_validation',
        error: 'no_email'
      });
    }

    if (!email.endsWith('@vitbhopal.ac.in')) {
      console.log('❌ GOOGLE AUTH: STEP 5 - Invalid email domain:', email);
      const domain = email.split('@')[1] || 'unknown';
      return res.status(401).json({
        status: 'error',
        message: `Only VIT Bhopal emails (@vitbhopal.ac.in) are allowed. You tried to sign in with: ${email}`,
        step: 'email_validation',
        error: 'invalid_domain',
        providedDomain: domain
      });
    }

    console.log('✅ GOOGLE AUTH: STEP 5 - Email domain validated for VIT Bhopal');

    // Check if user already exists with this Google ID
    console.log('🔍 GOOGLE AUTH: STEP 6 - Checking for existing user with Google ID...');
    let user = await User.findOne({ googleId });

    if (user) {
      console.log('✅ GOOGLE AUTH: STEP 7 - Existing user found with Google ID:', user.username);
      console.log('🔄 GOOGLE AUTH: STEP 8 - Generating authentication token...');
      const token = signToken(user._id, user.email);
      console.log('✅ GOOGLE AUTH: STEP 8 - Token generated successfully for existing user');

      console.log('🎉 GOOGLE AUTH: ===== AUTHENTICATION SUCCESSFUL =====');
      console.log('📊 GOOGLE AUTH: User:', user.username, 'Method: existing_google_user');

      return res.status(200).json({
        status: 'success',
        message: 'Welcome back! Authentication successful.',
        token,
        data: {
          user,
          authMethod: 'google_existing',
          redirectTo: '/features/profile/profile.html?sidebar=active'
        },
        step: 'complete'
      });
    }

    console.log('🔍 GOOGLE AUTH: STEP 7 - No user with Google ID, checking email...');

    // Check if user exists with the same email
    user = await User.findOne({ email });

    if (user) {
      console.log('✅ GOOGLE AUTH: STEP 8 - Existing user found with email, linking accounts:', user.username);
      console.log('🔄 GOOGLE AUTH: STEP 9 - Linking Google account to existing user...');

      user.googleId = googleId;
      user.fullName = displayName;
      user.profilePicture = picture;
      await user.save();

      console.log('✅ GOOGLE AUTH: STEP 9 - Accounts linked successfully');
      console.log('🔄 GOOGLE AUTH: STEP 10 - Generating authentication token...');
      const token = signToken(user._id, user.email);
      console.log('✅ GOOGLE AUTH: STEP 10 - Token generated successfully for linked account');

      console.log('🎉 GOOGLE AUTH: ===== AUTHENTICATION SUCCESSFUL =====');
      console.log('📊 GOOGLE AUTH: User:', user.username, 'Method: linked_account');

      return res.status(200).json({
        status: 'success',
        message: 'Account linked successfully! Welcome back.',
        token,
        data: {
          user,
          authMethod: 'google_linked',
          redirectTo: '/features/profile/profile.html?sidebar=active'
        },
        step: 'complete'
      });
    }

    console.log('🔍 GOOGLE AUTH: STEP 8 - No existing user found, creating new user...');

    // Create new user
    console.log('🔄 GOOGLE AUTH: STEP 9 - Creating new user...');
    const username = displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000);
    console.log('📝 GOOGLE AUTH: STEP 9 - Generated username:', username);

    const newUser = await User.create({
      googleId,
      email,
      username,
      fullName: displayName,
      profilePicture: picture,
      isVerified: true, // Google accounts are pre-verified
      role: email === 'vitbsmashers@gmail.com' ? 'admin' : 'user'
    });

    console.log(`✅ GOOGLE AUTH: STEP 9 - New user ${newUser.username} created with role: ${newUser.role}`);

    console.log('🔄 GOOGLE AUTH: STEP 10 - Generating authentication token...');
    const token = signToken(newUser._id, newUser.email);
    console.log('✅ GOOGLE AUTH: STEP 10 - Token generated successfully for new user');

    console.log('🎉 GOOGLE AUTH: ===== AUTHENTICATION SUCCESSFUL =====');
    console.log('📊 GOOGLE AUTH: User:', newUser.username, 'Method: new_google_user');

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully! Welcome to Scholars Stack.',
      token,
      data: {
        user: newUser,
        authMethod: 'google_new',
        redirectTo: '/features/profile/profile.html?sidebar=active'
      },
      step: 'complete'
    });

  } catch (err) {
    console.error('❌ GOOGLE AUTH: ===== AUTHENTICATION FAILED =====');
    console.error('❌ GOOGLE AUTH: Error message:', err.message);
    console.error('❌ GOOGLE AUTH: Error stack:', err.stack);
    console.error('❌ GOOGLE AUTH: Error details:', err);

    // Handle specific Google authentication errors
    if (err.message.includes('invalid_token') || err.message.includes('not a valid origin')) {
      console.log('❌ GOOGLE AUTH: Invalid token error');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid Google token. Please try signing in again.',
        step: 'google_verification',
        error: 'invalid_token'
      });
    }

    if (err.message.includes('Token used too late')) {
      console.log('❌ GOOGLE AUTH: Token expired');
      return res.status(401).json({
        status: 'error',
        message: 'Google token has expired. Please try signing in again.',
        step: 'google_verification',
        error: 'token_expired'
      });
    }

    if (err.message.includes('Wrong number of segments')) {
      console.log('❌ GOOGLE AUTH: Malformed JWT token');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid token format received.',
        step: 'token_format',
        error: 'malformed_token'
      });
    }

    // Generic error
    console.log('❌ GOOGLE AUTH: Unexpected error during authentication');
    res.status(500).json({
      status: 'error',
      message: 'Google authentication failed. Please try again.',
      step: 'unexpected_error',
      error: 'server_error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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