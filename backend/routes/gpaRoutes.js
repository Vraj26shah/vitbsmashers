import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getGpaData,
  saveGpaData,
  getGPA,
  calculateGPA,
  updateGPA,
  getGPAHistory,
} from '../controllers/gpaController.js';

const router = express.Router();

router.use(protect);

router.get('/',               getGpaData);
router.post('/calculate',     calculateGPA);
router.put('/update',         updateGPA);
router.get('/history/:userId', getGPAHistory);
router.get('/:userId',        getGPA);
router.put('/:semester',      saveGpaData);

export default router;
