import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getClubs, 
  getClubById, 
  joinClub, 
  leaveClub, 
  getClubMembers, 
  createClubEvent 
} from '../controllers/clubController.js';

const router = express.Router();

// Public routes
router.get('/', getClubs);
router.get('/:id', getClubById);

// Protected routes
router.use(protect);
router.post('/join', joinClub);
router.post('/leave', leaveClub);
router.get('/members/:id', getClubMembers);
router.post('/events', createClubEvent);

export default router;
