import express from 'express';
import { 
  getMenu, 
  getMenuByDate, 
  submitFeedback, 
  getSchedule 
} from '../controllers/messController.js';

const router = express.Router();

// Mess routes (public - no authentication required)
router.get('/menu', getMenu);
router.get('/menu/:date', getMenuByDate);
router.post('/feedback', submitFeedback);
router.get('/schedule', getSchedule);

export default router;
