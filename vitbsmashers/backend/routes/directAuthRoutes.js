import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model.js';
import { signToken } from '../service/authService.js';
import AppError from '../utils/appError.js';

const router = express.Router();

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Direct Google OAuth callback handler (bypasses Passport.js)
router.get('/google/direct-callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    console.log('🔍 Direct OAuth callback received');
    console.log('📋 Environment check:');
    console.log('  - GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set (' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : 'NOT SET');
    console.log('  - GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set (length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'NOT SET');
    
    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect('/?error=no_auth_code');
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Missing Google OAuth credentials');
      return res.redirect('/?error=missing_oauth_config');
    }

    // Exchange authorization code for tokens
    const { tokens } = await googleClient.getToken({
      code,
      redirect_uri: 'https://vitbsmashers.onrender.com/api/v1/auth/google/direct-callback'
    });

    console.log('✅ Tokens received from Google');

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const displayName = payload.name;
    const picture = payload.picture;

    console.log('✅ Google user verified:', { email, displayName });

    // Validate VIT Bhopal email
    if (!email || !email.endsWith('@vitbhopal.ac.in')) {
      console.error('❌ Non-VIT email:', email);
      return res.redirect('/?error=invalid_email');
    }

    // Check if user exists
    let user = await User.findOne({ googleId });

    if (user) {
      console.log('✅ Existing user found');
    } else {
      // Check if user exists with same email
      user = await User.findOne({ email });
      
      if (user) {
        // Link Google account
        user.googleId = googleId;
        user.fullName = displayName;
        user.profilePicture = picture;
        await user.save();
        console.log('✅ Google account linked to existing user');
      } else {
        // Create new user
        user = await User.create({
          googleId,
          email,
          username: displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
          fullName: displayName,
          profilePicture: picture,
          isVerified: true,
          role: email === 'vitbsmashers@gmail.com' ? 'admin' : 'user'
        });
        console.log('✅ New user created');
      }
    }

    // Generate JWT token
    const token = signToken(user._id, user.email);
    
    console.log('✅ JWT token generated, redirecting to profile');
    
    // Redirect to profile with token
    res.redirect(`/features/profile/profile.html?token=${token}&google_success=true&sidebar=active`);

  } catch (error) {
    console.error('❌ Direct OAuth callback error:', error);
    
    if (error.message.includes('invalid_client')) {
      console.error('❌ CRITICAL: Google OAuth client configuration error');
      return res.redirect('/?error=oauth_client_config_error');
    }
    
    res.redirect('/?error=oauth_callback_failed');
  }
});

export default router;