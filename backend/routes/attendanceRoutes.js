import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAttendance,
  updateAttendance,
  deleteAttendance,
  calculateAttendance,
  getAttendanceHistory,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.use(protect);

router.get('/',                   getAttendance);
router.post('/calculate',         calculateAttendance);
router.put('/update',             updateAttendance);
router.get('/history/:userId',    getAttendanceHistory);
router.put('/:subjectCode',       updateAttendance);
router.delete('/:subjectCode',    deleteAttendance);

export default router;
