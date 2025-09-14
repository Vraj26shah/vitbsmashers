import express from 'express';
import { 
  getFaculty, 
  getFacultyById, 
  getFacultyByDepartment, 
  contactFaculty, 
  getFacultySchedule 
} from '../controllers/facultyController.js';

const router = express.Router();

// Faculty routes (public - no authentication required)
router.get('/', getFaculty);
router.get('/:id', getFacultyById);
router.get('/department/:dept', getFacultyByDepartment);
router.post('/contact', contactFaculty);
router.get('/schedule/:id', getFacultySchedule);

export default router;
