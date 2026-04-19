import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getMyTimetable,
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  exportTimetable,
} from '../controllers/timetableController.js';

const router = express.Router();

router.use(protect);

router.get('/my',            getMyTimetable);
router.get('/export/:id',    exportTimetable);
router.get('/:userId',       getTimetable);

router.post('/create', adminOnly, createTimetable);
router.post('/',       adminOnly, createTimetable);
router.put('/update/:id', adminOnly, updateTimetable);
router.put('/:id',        adminOnly, updateTimetable);
router.delete('/delete/:id', adminOnly, deleteTimetable);
router.delete('/:id',        adminOnly, deleteTimetable);

export default router;
