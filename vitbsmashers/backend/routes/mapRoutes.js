import express from 'express';
import { 
  getLocations, 
  getLocationById, 
  submitFeedback, 
  getNavigation 
} from '../controllers/mapController.js';

const router = express.Router();

// Map routes (public - no authentication required)
router.get('/locations', getLocations);
router.get('/location/:id', getLocationById);
router.post('/feedback', submitFeedback);
router.get('/navigation/:from/:to', getNavigation);

export default router;
