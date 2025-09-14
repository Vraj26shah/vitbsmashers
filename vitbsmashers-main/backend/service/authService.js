import User from '../models/user.model.js';
import jwt from 'jsonwebtoken'
export const registerUser = async (username, email, password) => {
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  const newUser = await User.create({ username, email, password });
  return newUser;
};

export const verifyUserOTP = async (email, otp) => {
  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) {
    throw new Error('User not found');
  }

  if (user.otp !== otp || user.otpExpires < Date.now()) {
    throw new Error('Invalid or expired OTP');
  }

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  return user;
};

export const loginUser = async (username, password) => {
  const user = await User.findOne({ username }).select('+password');
  
  if (!user) {
    throw new Error('User not found');
  }

  const isMatch = await user.correctPassword(password);

  if (!isMatch) {
    throw new Error('Incorrect password');
  }

  if (!user.isVerified) {
    throw new Error('Email not verified');
  }

  return user;
};

 export const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};
// Optionally export all services as an object
export default {
  registerUser,
  verifyUserOTP,
  loginUser,
  signToken
};