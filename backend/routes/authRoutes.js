import express from 'express';
import { signup, login, verifyGoogleToken, refreshToken, logout, revokeProtectedSession } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, strictAuthLimiter } from '../middleware/securityMiddleware.js';

const router = express.Router();
const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : !!value;

// Public routes (rate-limited — protects Supabase + user accounts from brute force)
router.post('/signup',        strictAuthLimiter, signup);
router.post('/login',         strictAuthLimiter, login);
router.post('/google-token',  authLimiter, verifyGoogleToken);
router.post('/refresh-token', authLimiter, refreshToken);

// Logout
router.post('/logout', protect, logout);

// Policy violation on protected course pages — clears httpOnly session (same as logout)
router.post('/revoke-protected-session', protect, revokeProtectedSession);

// Profile — returns current user from middleware
router.get('/profile', protect, (req, res) => {
  return res.status(200).json({
    user: req.user,
    profileComplete: hasValue(req.user.phone) && hasValue(req.user.registration_number) && hasValue(req.user.branch),
  });
});

// Token validation (never return JWT in JSON — avoids XSS / log leakage)
router.get('/validate-token', protect, (req, res) => {
  return res.status(200).json({ valid: true, user: req.user, message: 'Token is valid' });
});

// Admin status
router.get('/admin-status', protect, (req, res) => {
  return res.status(200).json({ isAdmin: req.user.role === 'admin', email: req.user.email });
});

// Dashboard
router.get('/dashboard', protect, (req, res) => {
  return res.status(200).json({ status: 'success', data: { user: req.user } });
});

export default router;
