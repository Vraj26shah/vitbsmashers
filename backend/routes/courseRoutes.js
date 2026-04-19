import express from 'express';
import {
  getCourses,
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
  getMyCourses,
  getUserPurchasedCourses,
  getCourseModules,
  uploadDocument,
} from '../controllers/courseController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (no auth required for course listing)
router.get('/featured',          getFeaturedCourses);
router.get('/categories',        getCategories);
router.get('/stats',             getCourseStats);
router.get('/search',            searchCourses);
router.get('/category/:category', getCoursesByCategory);

// Protected routes
router.get('/my-courses', protect, getMyCourses);
router.get('/:courseId/modules', protect, getCourseModules);
router.post('/:courseId/modules/:moduleId/upload', protect, adminOnly, ...uploadDocument);

// Public course detail
router.get('/:id', getCourse);
router.get('/',    getCourses);

// Admin only
router.post('/',      protect, adminOnly, createCourse);
router.post('/seed',  protect, adminOnly, seedCourses);
router.put('/bulk',   protect, adminOnly, bulkUpdateCourses);
router.put('/:id',    protect, adminOnly, updateCourse);
router.delete('/:id', protect, adminOnly, deleteCourse);

export default router;
