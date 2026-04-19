import express from 'express';
import { signup, login, verifyGoogleToken, logout } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Public routes
router.post('/signup',       signup);
router.post('/login',        login);
router.post('/google-token', verifyGoogleToken);

// Logout
router.post('/logout', protect, logout);

// Profile — returns current user from middleware
router.get('/profile', protect, (req, res) => {
  return res.status(200).json({
    user: req.user,
    profileComplete: !!(req.user.phone && req.user.registration_number && req.user.branch),
  });
});

// Token validation
router.get('/validate-token', protect, (req, res) => {
  const token =
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null) ||
    req.cookies?.jwt;
  return res.status(200).json({ valid: true, user: req.user, token, message: 'Token is valid' });
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
