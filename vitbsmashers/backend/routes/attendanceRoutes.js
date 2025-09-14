import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getAttendance, 
  calculateAttendance, 
  updateAttendance, 
  getAttendanceHistory 
} from '../controllers/attendanceController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Attendance routes
router.get('/:userId', getAttendance);
router.post('/calculate', calculateAttendance);
router.put('/update', updateAttendance);
router.get('/history/:userId', getAttendanceHistory);

export default router;
