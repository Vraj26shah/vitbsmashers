import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAchievements,
  addAchievement,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(protect);

router.get('/me',                    getProfile);
router.put('/update',                updateProfile);
router.post('/upload-avatar',        uploadAvatar);
router.get('/achievements/:userId',  getAchievements);
router.post('/achievements',         addAchievement);
// Keep /:userId last to avoid shadowing named routes above
router.get('/:userId',               getProfile);

export default router;
