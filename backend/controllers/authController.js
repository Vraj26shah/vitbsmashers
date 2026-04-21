import { supabase } from '../lib/supabase.js';
const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;

// ── POST /api/v1/auth/signup ─────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ status: 'error', message: 'username, email and password required' });

    if (username.length < 3)
      return res.status(400).json({ status: 'error', message: 'Username must be at least 3 characters long' });

    if (password.length < 6)
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long' });

    if (!email.endsWith('@vitbhopal.ac.in') && email !== 'vitbsmashers@gmail.com')
      return res.status(400).json({ status: 'error', message: 'Only VIT Bhopal emails (@vitbhopal.ac.in) are allowed' });

    // Check username not taken
    const { data: existing } = await supabase
      .schema('business').from('users').select('id').eq('username', username.toLowerCase()).maybeSingle();
    if (existing)
      return res.status(409).json({ status: 'error', message: 'Username already taken' });

    // Create Supabase Auth user + send confirmation email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.toLowerCase() } },
    });

    if (authError)
      return res.status(400).json({ status: 'error', message: authError.message });

    if (!authData.user)
      return res.status(400).json({ status: 'error', message: 'Signup failed. Try again.' });

    // Determine role: admin for vitbsmashers@gmail.com, student for others
    const userRole = email.toLowerCase() === 'vitbsmashers@gmail.com' ? 'admin' : 'student';

    // Insert profile row (user may not be confirmed yet — that's fine)
    const { error: profileError } = await supabase.schema('business').from('users').insert({
      id:       authData.user.id,
      email:    email.toLowerCase(),
      username: username.toLowerCase(),
      role:     userRole,
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ status: 'error', message: 'Failed to create user profile' });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Account created! Check your email to confirm before logging in.',
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/login ──────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!password)
      return res.status(400).json({ status: 'error', message: 'Password is required' });

    if (!username && !email)
      return res.status(400).json({ status: 'error', message: 'Username or email is required' });

    let loginEmail = email;
    if (!loginEmail && username) {
      const { data: user } = await supabase
        .schema('business').from('users').select('email').eq('username', username.toLowerCase()).maybeSingle();
      if (!user)
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      loginEmail = user.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

    if (error)
      return res.status(401).json({ status: 'error', message: error.message });

    const { data: profile } = await supabase
      .schema('business').from('users').select('*').eq('id', data.user.id).single();

    if (!profile)
      return res.status(401).json({ status: 'error', message: 'User profile not found' });

    if (profile.is_banned)
      return res.status(403).json({ status: 'error', message: `Account banned: ${profile.ban_reason}` });

    // Auto-upgrade to admin if email matches
    if (profile.email.toLowerCase() === 'vitbsmashers@gmail.com' && profile.role !== 'admin') {
      await supabase.schema('business').from('users').update({ role: 'admin' }).eq('id', profile.id);
      profile.role = 'admin';
    }

    res.cookie('jwt', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      token:   data.session.access_token,
      refresh: data.session.refresh_token,
      data: { user: profile },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/google-token ──────────────────────────────────────────
export const verifyGoogleToken = async (req, res) => {
  try {
    const { access_token, idToken, refresh_token } = req.body;
    const tokenToUse = access_token || idToken;

    if (!tokenToUse)
      return res.status(400).json({ status: 'error', message: 'Token is required' });

    const { data: { user }, error } = await supabase.auth.getUser(tokenToUse);
    if (error || !user)
      return res.status(401).json({ status: 'error', message: 'Invalid token' });

    // Allow vitbsmashers@gmail.com or @vitbhopal.ac.in emails
    const isAdmin = user.email.toLowerCase() === 'vitbsmashers@gmail.com';
    if (!isAdmin && !user.email.endsWith('@vitbhopal.ac.in'))
      return res.status(403).json({ status: 'error', message: 'Must use VIT Bhopal Google account (@vitbhopal.ac.in) or authorized admin account' });

    // Determine role
    const userRole = isAdmin ? 'admin' : 'student';
    const emailLower = user.email.toLowerCase();
    const baseUsername = emailLower.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'student';
    const isPolicyRecursionError = (err) =>
      Boolean(err?.message && String(err.message).toLowerCase().includes('infinite recursion detected in policy'));

    // Keep Google login resilient even when DB policies are temporarily inconsistent.
    let profile = null;

    const { data: byId, error: byIdError } = await supabase
      .schema('business').from('users').select('*').eq('id', user.id).maybeSingle();
    if (byIdError && !isPolicyRecursionError(byIdError)) {
      console.error('Google auth profile lookup error:', byIdError.message);
    }
    if (byId) {
      profile = byId;
    }

    if (!profile) {
      const { data: byEmail, error: byEmailError } = await supabase
        .schema('business').from('users').select('*').eq('email', emailLower).maybeSingle();
      if (byEmailError && !isPolicyRecursionError(byEmailError)) {
        console.error('Google auth email lookup error:', byEmailError.message);
      }
      if (byEmail) {
        profile = byEmail;
      }
    }

    if (!profile) {
      const { data: inserted, error: insertError } = await supabase
        .schema('business').from('users').insert({
          id:          user.id,
          email:       emailLower,
          username:    baseUsername,
          full_name:   user.user_metadata?.full_name || null,
          avatar_url:  user.user_metadata?.avatar_url || null,
          role:        userRole,
          is_verified: true,
        }).select().maybeSingle();

      if (insertError && !isPolicyRecursionError(insertError)) {
        console.error('Google auth profile insert error:', insertError.message);
      }
      if (inserted) {
        profile = inserted;
      }
    }

    if (profile && isAdmin && profile.role !== 'admin') {
      const { error: roleUpdateError } = await supabase
        .schema('business').from('users').update({ role: 'admin' }).eq('id', profile.id);
      if (!roleUpdateError) {
        profile.role = 'admin';
      }
    }

    // Fallback profile so login is not blocked by a DB policy misconfiguration.
    if (!profile) {
      profile = {
        id: user.id,
        email: emailLower,
        username: baseUsername,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: userRole,
        is_verified: true,
        profileCompleted: false,
      };
    }

    const isProfileComplete = hasValue(profile.phone) &&
      hasValue(profile.registration_number || profile.registrationNumber || profile.regNumber) &&
      hasValue(profile.branch || profile.program);

    res.cookie('jwt', tokenToUse, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status:  'success',
      token:   tokenToUse,
      refresh: refresh_token || null,
      data: {
        user:       profile,
        authMethod: 'google',
        redirectTo: isProfileComplete
          ? '/features/profile/profile.html?sidebar=active'
          : '/features/profile/complete-profile.html',
      },
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/refresh-token ─────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token)
      return res.status(400).json({ status: 'error', message: 'refresh_token required' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error || !data.session)
      return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });

    res.cookie('jwt', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status:  'success',
      token:   data.session.access_token,
      refresh: data.session.refresh_token,
    });
  } catch (err) {
    console.error('Token refresh error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ── POST /api/v1/auth/logout ─────────────────────────────────────────────────
export const logout = (req, res) => {
  res.clearCookie('jwt', { path: '/' });
  return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
};

// Dedupe rapid duplicate POSTs (e.g. keydown+keyup quirks) — still clear cookie; log once.
const recentProtectedRevokes = new Map();

const MYCOURSES_REDIRECT = '/features/mycourses/mycourses.html';

// ── POST /api/v1/auth/revoke-protected-session ────────────────────────────────
// Policy violation: clear app cookie, revoke Supabase refresh sessions (global), then log.
export const revokeProtectedSession = async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 64) : 'unknown';
  const userId = req.user?.id;
  const accessToken =
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null) || req.cookies?.jwt;

  const now = Date.now();
  let duplicate = false;
  if (userId) {
    const last = recentProtectedRevokes.get(userId);
    if (last != null && now - last < 3000) {
      duplicate = true;
    } else {
      recentProtectedRevokes.set(userId, now);
      setTimeout(() => recentProtectedRevokes.delete(userId), 4000);
    }
  }

  res.clearCookie('jwt', { path: '/' });

  if (!duplicate && accessToken) {
    try {
      const { error } = await supabase.auth.admin.signOut(accessToken, 'global');
      if (error) console.error('[protected-session-revoked] supabase.admin.signOut', error.message);
    } catch (err) {
      console.error('[protected-session-revoked] supabase.admin.signOut failed', err?.message || err);
    }
  }

  if (!duplicate) {
    console.warn('[protected-session-revoked]', {
      userId,
      reason,
      redirectTo: MYCOURSES_REDIRECT,
      sessionsRevoked: Boolean(accessToken),
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'success',
    message: 'Session ended due to protected content policy.',
    requiresLogin: true,
    duplicate: duplicate || undefined,
    redirectTo: MYCOURSES_REDIRECT,
    policy: 'protected_content_violation',
  });
};

export default { signup, login, verifyGoogleToken, refreshToken, logout, revokeProtectedSession };
