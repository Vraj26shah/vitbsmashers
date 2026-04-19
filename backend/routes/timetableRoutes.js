import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getTimetable, 
  createTimetable, 
  updateTimetable, 
  deleteTimetable, 
  exportTimetable 
} from '../controllers/timetableController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Timetable routes
router.get('/:userId', getTimetable);
router.post('/create', createTimetable);
router.put('/update/:id', updateTimetable);
router.delete('/delete/:id', deleteTimetable);
router.get('/export/:id', exportTimetable);

export default router;
