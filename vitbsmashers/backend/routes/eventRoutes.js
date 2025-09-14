import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getEvents, 
  getEventById, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  registerForEvent, 
  getRegisteredEvents 
} from '../controllers/eventController.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes
router.use(protect);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/register', registerForEvent);
router.get('/registered/:userId', getRegisteredEvents);

export default router;
