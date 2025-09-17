import jwt from 'jsonwebtoken';
import AppError from '../utils/appError.js';
import User from '../models/user.model.js';

// Error Handling Middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Development mode: send full error stack
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err
    });
  } 
  // Production mode: send limited error info
  else {
    // Operational errors we trust: send to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } 
    // Unknown errors: don't leak details
    else {
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    }
  }
};

// 404 Not Found Middleware
export const notFound = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

// JWT Authentication Middleware
export const protect = async (req, res, next) => {
  try {
    // 1) Get token from header or cookie
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You are not logged in! Please log in to get access.',
        redirect: '/login' // Frontend should handle this redirect
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user belonging to this token no longer exists.',
        redirect: '/login'
      });
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        error: 'Password changed',
        message: 'User recently changed password! Please log in again.',
        redirect: '/login'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid authentication token.',
        redirect: '/login'
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Authentication token has expired.',
        redirect: '/login'
      });
    }
    next(err);
  }
};

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer token
    if (!token) throw new Error('No token provided');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id }; // Adjust based on your JWT payload
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
};

// Rate limiting middleware for updates (5 per day)
export const rateLimitUpdates = async (req, res, next) => {
  try {
    const User = (await import('../models/user.model.js')).default;
    const user = await User.findById(req.user._id);

    if (!user.canUpdateToday()) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Update limit exceeded. You can only make 5 updates per day.',
        limit: 5,
        resetTime: new Date(user.lastUpdateDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Increment the count
    user.incrementUpdateCount();
    await user.save({ validateBeforeSave: false });

    next();
  } catch (err) {
    next(err);
  }
};

// Profile completion check middleware for purchases
// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }
  next();
};

export const requireCompleteProfile = async (req, res, next) => {
  try {
    const User = (await import('../models/user.model.js')).default;
    const user = await User.findById(req.user._id);

    if (!user.isProfileComplete()) {
      return res.status(403).json({
        error: 'profile_incomplete',
        message: 'Please complete your profile before purchasing courses',
        redirect: '/features/profile/profile.html',
        requiredFields: ['phone', 'registrationNumber', 'branch']
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

// Export all middlewares
export default {
  errorHandler,
  notFound,
  protect,
  authMiddleware,
  rateLimitUpdates,
  requireCompleteProfile,
  adminOnly,
};