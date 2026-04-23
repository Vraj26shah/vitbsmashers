import { supabase } from '../lib/supabase.js';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'vitbsmashers@gmail.com').toLowerCase();

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

    const isPolicyRecursionError = (err) =>
      Boolean(err?.message && String(err.message).toLowerCase().includes('infinite recursion detected in policy'));

    let { data: profile, error: profileError } = await supabase
      .schema('business').from('users').select('*').eq('id', user.id).maybeSingle();
    if (profileError && !isPolicyRecursionError(profileError)) {
      console.error('Auth profile lookup (id) error:', profileError.message);
    }

    if (!profile && user.email) {
      const emailLower = user.email.toLowerCase();
      const { data: profileByEmail, error: byEmailError } = await supabase
        .schema('business').from('users').select('*').eq('email', emailLower).maybeSingle();
      if (byEmailError && !isPolicyRecursionError(byEmailError)) {
        console.error('Auth profile lookup (email) error:', byEmailError.message);
      }
      if (profileByEmail) {
        profile = profileByEmail;
        profileError = null;
      }
    }

    // Auto-create profile for valid auth users whose business.users row is missing
    // (happens when Google OAuth upsert failed on first login)
    if (!profile && user.email) {
      const emailLower = user.email.toLowerCase();
      const baseUsername = emailLower.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'student';

      let createdProfile = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const username = attempt === 0
          ? baseUsername
          : `${baseUsername}_${Math.random().toString(36).slice(2, 6)}`;

        const { data: created, error: createError } = await supabase
          .schema('business').from('users').insert({
            id:          user.id,
            email:       emailLower,
            username,
            full_name:   user.user_metadata?.full_name || null,
            avatar_url:  user.user_metadata?.avatar_url || null,
            role:        user.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student',
            is_verified: true,
          }).select().maybeSingle();

        if (!createError && created) {
          createdProfile = created;
          break;
        }
        if (createError && !isPolicyRecursionError(createError)) {
          console.error('Auth profile auto-create error:', createError.message);
        }
      }

      if (createdProfile) {
        profile = createdProfile;
        profileError = null;
      }
    }

    if (!profile && profileError && isPolicyRecursionError(profileError)) {
      profile = {
        id: user.id,
        email: user.email?.toLowerCase() || null,
        username: user.email?.split('@')?.[0]?.toLowerCase() || 'student',
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: user.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'student',
        is_verified: true,
      };
    }

    if (!profile) {
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
  const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;
  const { phone, registration_number, branch } = req.user;

  if (!hasValue(phone) || !hasValue(registration_number) || !hasValue(branch)) {
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
