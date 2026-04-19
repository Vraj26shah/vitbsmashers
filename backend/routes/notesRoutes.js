import express from 'express';
import { getDocumentUrl } from '../controllers/notesController.js';
import { protect }        from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// GET /api/v1/courses/:courseId/notes/:moduleId
router.get('/:courseId/notes/:moduleId', getDocumentUrl);

export default router;
