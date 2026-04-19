import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getCurrentMenu,
  getMenuByDate,
  getAllMenus,
  createMenu,
  submitFeedback,
} from '../controllers/messController.js';

const router = express.Router();

// Public routes
router.get('/current',    getCurrentMenu);
router.get('/menu/:date', getMenuByDate);
router.get('/menu',       getCurrentMenu);
router.get('/schedule',   getCurrentMenu);
router.get('/',           getAllMenus);
router.post('/feedback',  submitFeedback);

// Admin
router.post('/', protect, adminOnly, createMenu);

export default router;
