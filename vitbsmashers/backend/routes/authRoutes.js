import express from 'express';
import { signup, verifyOTP, resendOTP, login } from '../controllers/authController.js';
import authMiddlewareModule from '../middleware/authMiddleware.js';
import User from '../models/user.model.js';
const router = express.Router();




// Authentication routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);//adding new route byy ai
router.post('/login', login);

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
// router.get('/profile', authMiddlewareModule.authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('name email phone');
//     if (!user) return res.status(404).json({ error: 'User not found' });
//     res.json(user);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Admin verification endpoint
// router.get('/admin-status', authMiddlewareModule.authMiddleware, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id).select('email');
//     if (!user) return res.status(404).json({ error: 'User not found' });
    
//     const isAdmin = user.email === 'vitbsmashers@gmail.com';
    
//     res.json({
//       isAdmin: isAdmin,
//       email: user.email,
//       adminEmail: 'vitbsmashers@gmail.com'
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
export default router;