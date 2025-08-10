import express from 'express';
import { signup, verifyOTP, login } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();



// Authentication routes
router.post('/signup', signup);
router.post('/verify-otp', verifyOTP);
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