import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getCourses, 
  enrollCourse, 
  updateCourse, 
  dropCourse, 
  getCourseSchedule 
} from '../controllers/courseController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);



// Course routes
router.get('/:userId', getCourses);
router.post('/enroll', enrollCourse);
router.put('/update/:id', updateCourse);
router.delete('/drop/:id', dropCourse);
router.get('/schedule/:userId', getCourseSchedule);

export default router;
