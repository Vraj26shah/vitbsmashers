import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../lib/supabase.js';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'vitbsmashers@gmail.com').toLowerCase();

function getOAuthClient() {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.PUBLIC_API_BASE}/api/v1/auth/google/callback`
  );
}

// ── GET /api/v1/auth/google ──────────────────────────────────────────────────
export const startGoogleOAuth = (req, res) => {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
  res.redirect(url);
};

// ── GET /api/v1/auth/google/callback ────────────────────────────────────────
export const googleCallback = async (req, res) => {
  const FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:4000';

  try {
    const { code, error: oauthError } = req.query;

    if (oauthError || !code) {
      return res.redirect(`${FRONTEND_URL}/index.html?error=google_auth_failed`);
    }

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return res.redirect(`${FRONTEND_URL}/index.html?error=no_id_token`);
    }

    // Exchange Google ID token for a real Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (sessionError || !sessionData?.session) {
      console.error('Google OAuth signInWithIdToken error:', sessionError?.message);
      return res.redirect(`${FRONTEND_URL}/index.html?error=supabase_session_failed`);
    }

    const { session, user } = sessionData;
    const emailLower = user.email?.toLowerCase() || '';

    // Enforce VIT Bhopal email restriction
    const isAdmin = emailLower === ADMIN_EMAIL;
    if (!isAdmin && !emailLower.endsWith('@vitbhopal.ac.in')) {
      return res.redirect(`${FRONTEND_URL}/index.html?error=invalid_email_domain`);
    }

    const userRole = isAdmin ? 'admin' : 'student';
    const baseUsername = emailLower.split('@')[0].replace(/[^a-z0-9_.-]/g, '') || 'student';
    const hasValue = (v) => typeof v === 'string' ? v.trim().length > 0 : !!v;

    // Upsert profile in business.users
    let profile = null;
    const { data: upserted, error: upsertError } = await supabase
      .schema('business').from('users').upsert({
        id:          user.id,
        email:       emailLower,
        username:    baseUsername,
        full_name:   user.user_metadata?.full_name || null,
        avatar_url:  user.user_metadata?.avatar_url || null,
        role:        userRole,
        is_verified: true,
      }, { onConflict: 'id' }).select().maybeSingle();

    if (upsertError) {
      console.error('Google OAuth profile upsert error:', upsertError.message);
    }
    profile = upserted || {
      id: user.id,
      email: emailLower,
      username: baseUsername,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      role: userRole,
      is_verified: true,
    };

    // Auto-upgrade admin role if needed
    if (isAdmin && profile.role !== 'admin') {
      await supabase.schema('business').from('users').update({ role: 'admin' }).eq('id', profile.id);
      profile.role = 'admin';
    }

    const isProfileComplete = hasValue(profile.phone) &&
      hasValue(profile.registration_number) &&
      hasValue(profile.branch);

    const accessToken = session.access_token;
    const refreshToken = session.refresh_token || '';

    // Set httpOnly cookie
    res.cookie('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const extraParams = new URLSearchParams({
      token: accessToken,
      google_success: '1',
      refresh: refreshToken,
    });

    const destination = isProfileComplete
      ? `/features/marketplace/market.html?sidebar=active&${extraParams}`
      : `/features/profile/complete-profile.html?${extraParams}`;

    return res.redirect(`${FRONTEND_URL}${destination}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    const FRONTEND_URL = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:4000';
    return res.redirect(`${FRONTEND_URL}/index.html?error=server_error`);
  }
};
