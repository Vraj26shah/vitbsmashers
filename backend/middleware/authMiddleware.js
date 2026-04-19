import { supabase } from '../lib/supabase.js';

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
      error: err,
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({ status: err.status, message: err.message });
  }

  console.error('ERROR', err);
  return res.status(500).json({ status: 'error', message: 'Something went wrong!' });
};

export const notFound = (req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.originalUrl} not found` });
};

export const protect = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null) ||
      req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You are not logged in! Please log in to get access.',
        redirect: '/login',
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid or expired authentication token.',
        redirect: '/login',
      });
    }

    const { data: profile, error: profileError } = await supabase
      .schema('business').from('users').select('*').eq('id', user.id).single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User profile not found.',
        redirect: '/login',
      });
    }

    if (profile.is_banned) {
      return res.status(403).json({ error: 'Account banned', message: `Account is banned: ${profile.ban_reason}` });
    }

    req.user = profile;
    next();
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Auth check failed' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Admin access required' });
  }
  next();
};

export const requireCompleteProfile = (req, res, next) => {
  const { phone, registration_number, branch } = req.user;
  if (!phone || !registration_number || !branch) {
    return res.status(403).json({
      status: 'error',
      error: 'incomplete_profile',
      message: 'Please complete your profile before making a purchase',
      redirect: '/features/profile/profile.html',
      requiredFields: ['phone', 'registration_number', 'branch'],
    });
  }
  next();
};

export default { errorHandler, notFound, protect, adminOnly, requireCompleteProfile };
