import { supabase } from '../lib/supabase.js';

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

    if (!email.endsWith('@vitbhopal.ac.in'))
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

    // Insert profile row (user may not be confirmed yet — that's fine)
    const { error: profileError } = await supabase.schema('business').from('users').insert({
      id:       authData.user.id,
      email:    email.toLowerCase(),
      username: username.toLowerCase(),
      role:     'student',
    });

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ status: 'error', message: 'Failed to create user profile' });
    }

    return res.status(201).json({
      status: 'success',
      message: 'Account created! Check your VIT email to confirm before logging in.',
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

    if (!user.email.endsWith('@vitbhopal.ac.in'))
      return res.status(403).json({ status: 'error', message: 'Must use VIT Bhopal Google account (@vitbhopal.ac.in)' });

    let { data: profile, error: upsertError } = await supabase.schema('business').from('users').upsert({
      id:          user.id,
      email:       user.email.toLowerCase(),
      username:    user.email.split('@')[0].toLowerCase(),
      full_name:   user.user_metadata?.full_name || null,
      role:        'student',
      is_verified: true,
    }, { onConflict: 'id' }).select().single();

    if (upsertError) {
      console.error('Google auth upsert error:', upsertError.message);
      // Row may already exist (e.g. username unique conflict) — try fetching it
      const { data: existing } = await supabase.schema('business').from('users')
        .select('*').eq('id', user.id).single();
      if (existing) {
        profile = existing;
        upsertError = null;
      } else {
        return res.status(500).json({ status: 'error', message: 'Failed to create user profile. Please try again.' });
      }
    }

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
        redirectTo: '/features/profile/profile.html?sidebar=active',
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

export default { signup, login, verifyGoogleToken, refreshToken, logout };
