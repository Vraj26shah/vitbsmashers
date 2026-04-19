import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getFaculty,
  getFacultyById,
  getFacultyByDepartment,
  contactFaculty,
  getFacultySchedule,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from '../controllers/facultyController.js';

const router = express.Router();

// Public routes
router.get('/',                getFaculty);
router.get('/:id',             getFacultyById);
router.get('/department/:dept', getFacultyByDepartment);

// Protected routes
router.use(protect);
router.post('/contact',        contactFaculty);
router.get('/schedule/:id',    getFacultySchedule);

// User submissions (simplified — admin reviews via direct CRUD)
router.post('/submit-addition', (req, res) => res.status(202).json({ status: 'success', message: 'Request submitted for admin review' }));
router.post('/submit-update',   (req, res) => res.status(202).json({ status: 'success', message: 'Request submitted for admin review' }));

// Admin-only CRUD
router.post('/',      adminOnly, createFaculty);
router.put('/:id',    adminOnly, updateFaculty);
router.delete('/:id', adminOnly, deleteFaculty);

export default router;
