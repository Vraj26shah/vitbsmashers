import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getGPA, 
  calculateGPA, 
  updateGPA, 
  getGPAHistory 
} from '../controllers/gpaController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GPA routes
router.get('/:userId', getGPA);
router.post('/calculate', calculateGPA);
router.put('/update', updateGPA);
router.get('/history/:userId', getGPAHistory);

export default router;
