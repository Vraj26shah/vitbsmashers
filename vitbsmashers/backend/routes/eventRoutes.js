import express from 'express';
import { protect, rateLimitUpdates, adminOnly } from '../middleware/authMiddleware.js';
import PendingEventUpdate from '../models/pendingEventUpdate.model.js';
import Event from '../models/event.model.js';
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
  rejectEventUpdate
} from '../controllers/eventController.js';

const router = express.Router();

// Public routes - anyone can access
router.get('/', getEvents);
router.get('/:id', getEventById);

// User-protected routes (require login)
router.use(protect);
router.post('/register', registerForEvent);
router.get('/registered', getRegisteredEvents); // Changed to use req.user instead of param

// User submission routes with rate limiting (5 updates per day)
router.post('/submit-addition', rateLimitUpdates, async (req, res) => {
  try {
    const { title, description, date, time, location, category, organizer, contactEmail } = req.body;
    const submittedBy = req.user._id;

    // Validate required fields
    if (!title || !description || !date || !time || !location || !category || !organizer || !contactEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'All event fields are required'
      });
    }

    // Create pending event addition
    
    const pendingAddition = await PendingEventUpdate.create({
      originalEventId: null, // New addition
      submittedBy,
      changes: {
        title: { old: null, new: title },
        description: { old: null, new: description },
        date: { old: null, new: date },
        time: { old: null, new: time },
        location: { old: null, new: location },
        category: { old: null, new: category },
        organizer: { old: null, new: organizer },
        contactEmail: { old: null, new: contactEmail }
      },
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Event addition request submitted successfully for admin review',
      data: { pendingUpdateId: pendingAddition._id }
    });
  } catch (error) {
    console.error('Event addition error:', error);
    res.status(500).json({
      error: 'Submission failed',
      message: 'Failed to submit event addition request'
    });
  }
});

router.post('/submit-update', rateLimitUpdates, async (req, res) => {
  try {
    const { eventId, title, description, date, time, location, category, organizer, contactEmail } = req.body;
    const submittedBy = req.user._id;

    // Validate required fields
    if (!eventId || !title || !description || !date || !time || !location || !category || !organizer || !contactEmail) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Event ID and all event fields are required'
      });
    }

    // Get current event data
    const currentEvent = await Event.findById(eventId);
    if (!currentEvent) {
      return res.status(404).json({
        error: 'Event not found',
        message: 'Event not found'
      });
    }

    // Prepare changes object
    const changes = {};
    if (currentEvent.title !== title) {
      changes.title = { old: currentEvent.title, new: title };
    }
    if (currentEvent.description !== description) {
      changes.description = { old: currentEvent.description, new: description };
    }
    if (currentEvent.date.toISOString().split('T')[0] !== date) {
      changes.date = { old: currentEvent.date.toISOString().split('T')[0], new: date };
    }
    if (currentEvent.time !== time) {
      changes.time = { old: currentEvent.time, new: time };
    }
    if (currentEvent.location !== location) {
      changes.location = { old: currentEvent.location, new: location };
    }
    if (currentEvent.category !== category) {
      changes.category = { old: currentEvent.category, new: category };
    }
    if (currentEvent.organizer !== organizer) {
      changes.organizer = { old: currentEvent.organizer, new: organizer };
    }
    if (currentEvent.contactEmail !== contactEmail) {
      changes.contactEmail = { old: currentEvent.contactEmail, new: contactEmail };
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({
        error: 'No changes detected',
        message: 'No changes detected in the submitted data'
      });
    }

    // Create pending update record
    
    const pendingUpdate = await PendingEventUpdate.create({
      originalEventId: eventId,
      submittedBy,
      changes,
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Event update request submitted successfully for admin review',
      data: { pendingUpdateId: pendingUpdate._id }
    });
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({
      error: 'Submission failed',
      message: 'Failed to submit event update request'
    });
  }
});

// Admin routes for pending management
router.get('/pending-additions', protect, adminOnly, async (req, res) => {
    try {
        const pendingAdditions = await PendingEventUpdate.find({ originalEventId: null, status: 'pending' }).populate('submittedBy', 'username email').sort({ submittedAt: -1 });
        res.status(200).json({
            status: 'success',
            results: pendingAdditions.length,
            data: { pendingAdditions }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve pending additions',
            message: error.message
        });
    }
});

router.get('/pending-updates', protect, adminOnly, async (req, res) => {
    try {
        const pendingUpdates = await PendingEventUpdate.find({ originalEventId: { $ne: null }, status: 'pending' }).populate('submittedBy', 'username email').sort({ submittedAt: -1 });
        res.status(200).json({
            status: 'success',
            results: pendingUpdates.length,
            data: { pendingUpdates }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve pending updates',
            message: error.message
        });
    }
});

router.post('/approve-addition', protect, adminOnly, approveEventRegistration);
router.post('/reject-addition', protect, adminOnly, rejectEventRegistration);
router.post('/approve-update', protect, adminOnly, approveEventUpdate);
router.post('/reject-update', protect, adminOnly, rejectEventUpdate);

// Admin-only routes (create, update, delete) - commented out until admin middleware is implemented
// router.use(adminOnly);
// router.post('/', createEvent);
// router.put('/:id', updateEvent);
// router.delete('/:id', deleteEvent);

export default router;
