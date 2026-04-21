import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getFaculty,
  getFacultyById,
  getFacultyByDepartment,
  contactFaculty,
  getFacultySchedule,
  createFaculty,
  createUpdateRequest,
  updateFaculty,
  deleteFaculty,
  getPendingAdditions,
  getPendingUpdates,
  approveAddition,
  rejectAddition,
  approveUpdate,
  rejectUpdate,
} from '../controllers/facultyController.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/',                     getFaculty);
router.get('/:id',                  getFacultyById);
router.get('/department/:dept',     getFacultyByDepartment);

// Protected routes (auth required)
router.use(protect);
router.post('/contact',             contactFaculty);
router.get('/schedule/:id',         getFacultySchedule);

// User submissions (pending approval workflow)
router.post('/',                    createFaculty);              // Submit new faculty (pending)
router.post('/update-request',      createUpdateRequest);        // Submit update request (pending)

// Admin-only routes
router.get('/admin/pending',        adminOnly, getPendingAdditions);
router.get('/admin/updates',        adminOnly, getPendingUpdates);
router.post('/admin/:id/approve',   adminOnly, approveAddition);
router.post('/admin/:id/reject',    adminOnly, rejectAddition);
router.post('/admin/updates/:id/approve', adminOnly, approveUpdate);
router.post('/admin/updates/:id/reject',  adminOnly, rejectUpdate);

// Legacy admin routes (kept for compatibility)
router.put('/:id',                  adminOnly, updateFaculty);
router.delete('/:id',               adminOnly, deleteFaculty);

export default router;
