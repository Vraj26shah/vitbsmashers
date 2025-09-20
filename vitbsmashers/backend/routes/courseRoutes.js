import express from 'express';
import {
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
  getCoursesByCategory,
  searchCourses,
  getCategories,
  getCourseStats,
  bulkUpdateCourses,
  seedCourses,
  getUserPurchasedCourses
} from '../controllers/courseController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (authentication required) - put specific routes first
router.use(protect);

// User purchased courses route
router.get('/my-courses', getUserPurchasedCourses);

// Public routes (no authentication required)
router.get('/featured', getFeaturedCourses);
router.get('/categories', getCategories);
router.get('/stats', getCourseStats);
router.get('/search', searchCourses);
router.get('/category/:category', getCoursesByCategory);
router.get('/:id', getCourse);
router.get('/', getAllCourses);

// Admin only routes
router.post('/', adminOnly, createCourse);
router.post('/seed', adminOnly, seedCourses);
router.put('/bulk', adminOnly, bulkUpdateCourses);
router.put('/:id', adminOnly, updateCourse);
router.delete('/:id', adminOnly, deleteCourse);

export default router;
