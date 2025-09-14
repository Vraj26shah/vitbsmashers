import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getProfile, 
  updateProfile, 
  uploadAvatar, 
  getAchievements, 
  addAchievement 
} from '../controllers/profileController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Profile routes
router.get('/:userId', getProfile);
router.put('/update', updateProfile);
router.post('/upload-avatar', uploadAvatar);
router.get('/achievements/:userId', getAchievements);
router.post('/achievements', addAchievement);

export default router;
