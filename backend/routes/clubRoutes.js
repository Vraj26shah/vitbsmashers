import express                from 'express';
import multer                 from 'multer';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getClubs,
  getClubById,
  createClub,
  createUpdateRequest,
  getPendingClubs,
  getPendingUpdates,
  approveClub,
  rejectClub,
  approveUpdate,
  rejectUpdate,
  clubDiagnostics,
  clubDiagnosticsPublic,
  seedSampleClubs,
  smokeUpdateClub,
} from '../controllers/clubController.js';

const router = express.Router();

// multer: store logo in memory (max 3 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',    getClubs);
router.get('/diagnostics', clubDiagnosticsPublic);
router.get('/:id', getClubById);

// ── Protected — user submissions ──────────────────────────────────────────────
router.use(protect);
router.post('/',              upload.single('logo'), createClub);
router.post('/update-request', upload.single('logo'), createUpdateRequest);

// ── Admin only ────────────────────────────────────────────────────────────────
router.get('/admin/diagnostics',          adminOnly, clubDiagnostics);
router.post('/admin/seed-sample',         adminOnly, seedSampleClubs);
router.post('/admin/smoke-update',        adminOnly, smokeUpdateClub);
router.get('/admin/pending',              adminOnly, getPendingClubs);
router.get('/admin/updates',              adminOnly, getPendingUpdates);
router.post('/admin/:id/approve',         adminOnly, approveClub);
router.post('/admin/:id/reject',          adminOnly, rejectClub);
router.post('/admin/updates/:id/approve', adminOnly, approveUpdate);
router.post('/admin/updates/:id/reject',  adminOnly, rejectUpdate);

export default router;
