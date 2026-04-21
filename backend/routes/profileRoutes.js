import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAchievements,
  addAchievement,
  submitQueryTicket,
} from '../controllers/profileController.js';

const router = express.Router();
const uploadQueryScreenshot = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

router.use(protect);

router.get('/me',                    getProfile);
router.put('/update',                updateProfile);
router.post('/upload-avatar',        uploadAvatar);
router.post('/query',                uploadQueryScreenshot.single('screenshot'), submitQueryTicket);
router.get('/achievements/:userId',  getAchievements);
router.post('/achievements',         addAchievement);
// Keep /:userId last to avoid shadowing named routes above
router.get('/:userId',               getProfile);

export default router;
