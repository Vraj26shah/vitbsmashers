import User from '../models/user.model.js';
import jwt from 'jsonwebtoken'

export const registerUser = async (username, email, password) => {
  console.log('🔄 AUTH SERVICE: registerUser called with:', { username, email, hasPassword: !!password });

  try {
    console.log('🔍 AUTH SERVICE: Checking for existing user...');
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('❌ AUTH SERVICE: User already exists:', existingUser.username === username ? 'username' : 'email');
      throw new Error('Username or email already exists');
    }

    console.log('✅ AUTH SERVICE: No existing user found, creating new user...');
    const newUser = await User.create({ username, email, password });
    console.log('✅ AUTH SERVICE: User created successfully with ID:', newUser._id);
    return newUser;
  } catch (error) {
    console.error('❌ AUTH SERVICE: registerUser error:', error.message);
    throw error;
  }
};

export const verifyUserOTP = async (email, otp) => {
  console.log('🔄 AUTH SERVICE: verifyUserOTP called with:', { email, hasOtp: !!otp });

  try {
    console.log('🔍 AUTH SERVICE: Looking up user by email...');
    const user = await User.findOne({ email }).select('+otp +otpExpires');
    if (!user) {
      console.log('❌ AUTH SERVICE: User not found:', email);
      throw new Error('User not found');
    }

    console.log('✅ AUTH SERVICE: User found, checking OTP...');
    const currentTime = Date.now();
    const isExpired = user.otpExpires < currentTime;
    const isMatch = user.otp === otp;

    console.log('🔍 AUTH SERVICE: OTP validation:', {
      providedOtp: otp,
      storedOtp: user.otp,
      expiresAt: new Date(user.otpExpires).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      isExpired,
      isMatch
    });

    if (!isMatch) {
      console.log('❌ AUTH SERVICE: OTP does not match');
      throw new Error('Invalid OTP code');
    }

    if (isExpired) {
      console.log('❌ AUTH SERVICE: OTP has expired');
      throw new Error('OTP has expired');
    }

    console.log('✅ AUTH SERVICE: OTP valid, updating user...');
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    console.log('✅ AUTH SERVICE: User verified successfully');

    return user;
  } catch (error) {
    console.error('❌ AUTH SERVICE: verifyUserOTP error:', error.message);
    throw error;
  }
};

export const loginUser = async (username, password) => {
  console.log('🔄 AUTH SERVICE: loginUser called with:', { username, hasPassword: !!password });

  try {
    console.log('🔍 AUTH SERVICE: Looking up user by username...');
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      console.log('❌ AUTH SERVICE: User not found:', username);
      throw new Error('User not found');
    }

    console.log('✅ AUTH SERVICE: User found, checking password...');
    const isMatch = await user.correctPassword(password);

    if (!isMatch) {
      console.log('❌ AUTH SERVICE: Incorrect password for user:', username);
      throw new Error('Incorrect password');
    }

    console.log('✅ AUTH SERVICE: Password correct, checking verification...');
    if (!user.isVerified) {
      console.log('❌ AUTH SERVICE: User not verified:', username);
      throw new Error('Email not verified');
    }

    console.log('✅ AUTH SERVICE: User authentication successful');
    return user;
  } catch (error) {
    console.error('❌ AUTH SERVICE: loginUser error:', error.message);
    throw error;
  }
};

 export const signToken = (id, email = null) => {
  console.log('🔄 AUTH SERVICE: signToken called with:', { id, email: email ? 'present' : 'null' });

  try {
    const payload = { id };
    if (email) {
      payload.email = email;
    }

    console.log('🔄 AUTH SERVICE: Creating JWT token...');
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });
    console.log('✅ AUTH SERVICE: JWT token created successfully');

    return token;
  } catch (error) {
    console.error('❌ AUTH SERVICE: signToken error:', error.message);
    throw error;
  }
};
// Optionally export all services as an object
export default {
  registerUser,
  verifyUserOTP,
  loginUser,
  signToken
};