import express from 'express';
import { signup, verifyOTP, resendOTP, login } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();



// Authentication routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);//adding new route byy ai
router.post('/login', login);

// Protected routes (all routes after this middleware require authentication)
router.use(protect);

// Example protected route
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

export default router;