import express from 'express';
import { getNoteSignedUrl, streamNote } from '../controllers/notesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Stream endpoint — no JWT middleware needed, the stream token IS the auth
// Must be registered BEFORE the protect middleware block
router.get('/stream/:streamToken', streamNote);

// All other note routes require authentication
router.use(protect);

// GET /api/v1/courses/:courseId/notes/:fileId
// Returns a short-lived streamUrl for the iframe
router.get('/:courseId/notes/:fileId', getNoteSignedUrl);

export default router;
