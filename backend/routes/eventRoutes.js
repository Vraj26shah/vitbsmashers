import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  getRegisteredEvents,
  submitEventRegistration,
  submitEventUpdate,
  approveEventRegistration,
  rejectEventRegistration,
  approveEventUpdate,
  rejectEventUpdate,
} from '../controllers/eventController.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes
router.use(protect);
router.post('/register',       registerForEvent);
router.get('/my',              getRegisteredEvents);
router.post('/submit-addition', submitEventRegistration);
router.post('/submit-update',   submitEventUpdate);

// Admin-only routes
router.post('/',                        adminOnly, createEvent);
router.put('/:id',                      adminOnly, updateEvent);
router.delete('/:id',                   adminOnly, deleteEvent);
router.post('/approve-addition',        adminOnly, approveEventRegistration);
router.post('/reject-addition',         adminOnly, rejectEventRegistration);
router.post('/approve-update',          adminOnly, approveEventUpdate);
router.post('/reject-update',           adminOnly, rejectEventUpdate);

export default router;
