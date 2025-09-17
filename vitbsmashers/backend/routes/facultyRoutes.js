import express from 'express';
import { protect, rateLimitUpdates } from '../middleware/authMiddleware.js';
import {
  getFaculty,
  getFacultyById,
  getFacultyByDepartment,
  contactFaculty,
  getFacultySchedule,
  createFaculty,
  updateFaculty,
  deleteFaculty
} from '../controllers/facultyController.js';
import PendingFacultyUpdate from '../models/pendingFacultyUpdate.model.js';
import Faculty from '../models/faculty.model.js';

const router = express.Router();

// Public routes - anyone can access
router.get('/', getFaculty);
router.get('/:id', getFacultyById);
router.get('/department/:dept', getFacultyByDepartment);

// Protected routes (require login)
router.use(protect);
router.post('/contact', contactFaculty);
router.get('/schedule/:id', getFacultySchedule);

// User submission routes with rate limiting (5 updates per day)
router.post('/submit-addition', rateLimitUpdates, async (req, res) => {
  try {
    const { name, email, cabin } = req.body;
    const submittedBy = req.user._id;

    // Validate required fields
    if (!name || !email || !cabin) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, email, and cabin are required'
      });
    }

    // Create pending faculty addition
    
    const pendingAddition = await PendingFacultyUpdate.create({
      originalFacultyId: null, // New addition
      submittedBy,
      changes: {
        name: { old: null, new: name },
        email: { old: null, new: email },
        cabin: { old: null, new: cabin }
      },
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Faculty addition request submitted successfully for admin review',
      data: { pendingUpdateId: pendingAddition._id }
    });
  } catch (error) {
    console.error('Faculty addition error:', error);
    res.status(500).json({
      error: 'Submission failed',
      message: 'Failed to submit faculty addition request'
    });
  }
});

router.post('/submit-update', rateLimitUpdates, async (req, res) => {
  try {
    const { facultyId, name, email, cabin } = req.body;
    const submittedBy = req.user._id;

    // Validate required fields
    if (!facultyId || !name || !email || !cabin) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Faculty ID, name, email, and cabin are required'
      });
    }

    // Get current faculty data
    const currentFaculty = await Faculty.findById(facultyId);
    if (!currentFaculty) {
      return res.status(404).json({
        error: 'Faculty not found',
        message: 'Faculty member not found'
      });
    }

    // Prepare changes object
    const changes = {};
    if (currentFaculty.name !== name) {
      changes.name = { old: currentFaculty.name, new: name };
    }
    if (currentFaculty.email !== email) {
      changes.email = { old: currentFaculty.email, new: email };
    }
    if (currentFaculty.office !== cabin) {
      changes.office = { old: currentFaculty.office, new: cabin };
    }

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({
        error: 'No changes detected',
        message: 'No changes detected in the submitted data'
      });
    }

    // Create pending update record
    
    const pendingUpdate = await PendingFacultyUpdate.create({
      originalFacultyId: facultyId,
      submittedBy,
      changes,
      status: 'pending'
    });

    res.status(201).json({
      status: 'success',
      message: 'Faculty update request submitted successfully for admin review',
      data: { pendingUpdateId: pendingUpdate._id }
    });
  } catch (error) {
    console.error('Faculty update error:', error);
    res.status(500).json({
      error: 'Submission failed',
      message: 'Failed to submit faculty update request'
    });
  }
});

// Admin-only routes (CRUD) - commented out until admin middleware is implemented
// router.use(adminOnly);
// router.post('/approve-addition', approveFacultyAddition);
// router.post('/reject-addition', rejectFacultyAddition);
// router.post('/approve-update', approveFacultyUpdate);
// router.post('/reject-update', rejectFacultyUpdate);
// router.post('/', createFaculty);
// router.put('/:id', updateFaculty);
// router.delete('/:id', deleteFaculty);

export default router;
