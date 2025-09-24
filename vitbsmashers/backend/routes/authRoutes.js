import express from 'express';
import { signup, verifyOTP, resendOTP, login, verifyGoogleToken } from '../controllers/authController.js';
import authMiddlewareModule from '../middleware/authMiddleware.js';
import User from '../models/user.model.js';
import passport from '../config/passport.js';
import { signToken } from '../service/authService.js';
const router = express.Router();




// Google OAuth routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=google_auth_failed' }),
  (req, res) => {
    console.log('🔄 OAUTH CALLBACK: ===== STARTING OAUTH CALLBACK =====');
    console.log('📝 OAUTH CALLBACK: Request received at:', new Date().toISOString());
    console.log('📝 OAUTH CALLBACK: Query params:', req.query);
    console.log('📝 OAUTH CALLBACK: User object:', req.user ? {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username
    } : 'null');

    try {
      console.log('✅ OAUTH CALLBACK: Passport authentication successful');

      if (!req.user) {
        console.error('❌ OAUTH CALLBACK: No user object from passport');
        const errorUrl = `${process.env.FRONTEND_URL || 'https://vitbsmashers.vercel.app'}?error=no_user_object`;
        console.log('🔗 OAUTH CALLBACK: Redirecting to error page:', errorUrl);
        return res.redirect(errorUrl);
      }

      console.log('✅ OAUTH CALLBACK: User authenticated:', req.user.email);

      // Generate JWT token
      console.log('🔄 OAUTH CALLBACK: Generating JWT token...');
      const token = signToken(req.user._id, req.user.email);

      if (!token) {
        console.error('❌ OAUTH CALLBACK: Token generation failed');
        const errorUrl = `${process.env.FRONTEND_URL || 'https://vitbsmashers.vercel.app'}?error=token_generation_failed&email=${encodeURIComponent(req.user.email)}`;
        console.log('🔗 OAUTH CALLBACK: Redirecting to error page:', errorUrl);
        return res.redirect(errorUrl);
      }

      console.log('✅ OAUTH CALLBACK: JWT token generated successfully, length:', token.length);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'https://vitbsmashers.vercel.app';
      const profileUrl = `${frontendUrl}/features/profile/profile.html?token=${token}&google_success=true&sidebar=active&method=oauth`;

      console.log('🎉 OAUTH CALLBACK: ===== AUTHENTICATION SUCCESSFUL =====');
      console.log('📊 OAUTH CALLBACK: User:', req.user.username, 'Method: oauth_redirect');
      console.log('🔗 OAUTH CALLBACK: Redirecting to:', profileUrl);

      res.redirect(profileUrl);

    } catch (error) {
      console.error('❌ OAUTH CALLBACK: ===== CALLBACK FAILED =====');
      console.error('❌ OAUTH CALLBACK: Error message:', error.message);
      console.error('❌ OAUTH CALLBACK: Error stack:', error.stack);
      console.error('❌ OAUTH CALLBACK: Error details:', error);

      const frontendUrl = process.env.FRONTEND_URL || 'https://vitbsmashers.vercel.app';
      const errorUrl = `${frontendUrl}?error=oauth_callback_error&message=${encodeURIComponent(error.message)}`;

      console.log('🔗 OAUTH CALLBACK: Redirecting to error page:', errorUrl);
      res.redirect(errorUrl);
    }
  }
);

// Test OAuth callback endpoint (for development testing)
router.get('/test-oauth-callback', async (req, res) => {
  try {
    console.log('🧪 TEST OAUTH CALLBACK: Starting test OAuth callback');

    // Create a test user or use existing one
    let testUser = await User.findOne({ email: 'test@vitbhopal.ac.in' });

    if (!testUser) {
      console.log('🧪 TEST OAUTH CALLBACK: Creating test user');
      testUser = await User.create({
        googleId: 'test_google_id_123',
        email: 'test@vitbhopal.ac.in',
        username: 'testuser',
        fullName: 'Test User',
        profilePicture: null,
        isVerified: true,
        role: 'user'
      });
    }

    console.log('🧪 TEST OAUTH CALLBACK: Test user found/created:', testUser.email);

    // Generate JWT token
    const token = signToken(testUser._id, testUser.email);
    if (!token) {
      console.error('🧪 TEST OAUTH CALLBACK: Token generation failed');
      return res.status(500).json({ error: 'Token generation failed' });
    }

    console.log('🧪 TEST OAUTH CALLBACK: Token generated successfully');

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    console.log('🧪 TEST OAUTH CALLBACK: FRONTEND_URL env var:', process.env.FRONTEND_URL);
    console.log('🧪 TEST OAUTH CALLBACK: Using frontendUrl:', frontendUrl);
    const profileUrl = `${frontendUrl}/features/profile/profile.html?token=${token}&google_success=true&sidebar=active&method=oauth&test_mode=true`;

    console.log('🧪 TEST OAUTH CALLBACK: Redirecting to:', profileUrl);

    res.redirect(profileUrl);

  } catch (error) {
    console.error('🧪 TEST OAUTH CALLBACK: Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Google ID Token verification route (for client-side Google Sign-In)
router.post('/google-token', verifyGoogleToken);

// Authentication routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);//adding new route byy ai
router.post('/login', login);

// Logout route
router.post('/logout', authMiddlewareModule.protect, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Protected routes (all routes after this middleware require authentication)
router.use(authMiddlewareModule.protect);

// Example protected route
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

// Profile endpoint for frontend compatibility
router.get('/profile', authMiddlewareModule.protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpires -passwordChangedAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: user,
      profileComplete: user.isProfileComplete()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Token validation endpoint
router.get('/validate-token', authMiddlewareModule.protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otp -otpExpires -passwordChangedAt');
    if (!user) return res.status(404).json({ error: 'User not found', valid: false });

    res.json({
      valid: true,
      user: user,
      message: 'Token is valid'
    });
  } catch (err) {
    res.status(500).json({ error: err.message, valid: false });
  }
});

// Admin verification endpoint
router.get('/admin-status', authMiddlewareModule.protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('email');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isAdmin = user.email === 'vitbsmashers@gmail.com';

    res.json({
      isAdmin: isAdmin,
      email: user.email,
      adminEmail: 'vitbsmashers@gmail.com'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;