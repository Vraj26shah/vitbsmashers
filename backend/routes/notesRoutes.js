import express from 'express';
import { getDocumentUrl, testR2Connection, streamDocument } from '../controllers/notesController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// GET /api/v1/courses/:courseId/notes/test-r2 (admin diagnostics only)
router.get('/:courseId/notes/test-r2', adminOnly, testR2Connection);

// GET /api/v1/courses/:courseId/notes/:moduleId/stream  ← streams PDF through backend (no R2 CORS needed)
router.get('/:courseId/notes/:moduleId/stream', streamDocument);

// GET /api/v1/courses/:courseId/notes/:moduleId  ← returns signed URL (legacy)
router.get('/:courseId/notes/:moduleId', getDocumentUrl);

export default router;
