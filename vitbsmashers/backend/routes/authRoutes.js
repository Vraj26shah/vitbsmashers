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
    try {
      console.log('✅ OAuth callback reached, user:', req.user ? req.user.email : 'no user');

      // Successful authentication, redirect to profile page with token
      const token = req.user ? signToken(req.user._id, req.user.email) : null;

      if (token) {
        console.log('✅ OAuth success, generated token, redirecting to profile');

        // Redirect to the same domain (Render) to avoid CORS issues
        const profileUrl = `/features/profile/profile.html?token=${token}&google_success=true&sidebar=active`;

        console.log('🔗 Redirecting to:', profileUrl);
        res.redirect(profileUrl);
      } else {
        console.error('❌ Token generation failed - no user object');
        res.redirect('/?error=token_generation_failed');
      }
    } catch (error) {
      console.error('❌ OAuth callback error:', error);
      res.redirect('/?error=oauth_callback_failed');
    }
  }
);

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