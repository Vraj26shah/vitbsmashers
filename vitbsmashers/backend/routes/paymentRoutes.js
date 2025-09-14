import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  createOrder, 
  verifyPayment, 
  getPaymentHistory, 
  processRefund 
} from '../controllers/paymentController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Payment routes
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history/:userId', getPaymentHistory);
router.post('/refund', processRefund);

export default router;
