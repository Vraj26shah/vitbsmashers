import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Course from '../models/course.model.js';

const STREAM_TOKEN_SECRET = process.env.JWT_SECRET + '_stream';
const STREAM_TOKEN_TTL    = 15 * 60; // 15 minutes

// ── Disk cache config ─────────────────────────────────────────────────────────
// PDFs are stored on disk instead of RAM.
// Disk read of a 10 MB PDF from SSD ≈ 20ms — nearly as fast as memory,
// but uses ~0 extra RAM vs 300–600 MB for an in-memory buffer cache.
const CACHE_DIR    = path.join(os.tmpdir(), 'pdf-cache');
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
fs.mkdirSync(CACHE_DIR, { recursive: true });

// Lightweight in-memory index: fileId → { name, mimeType }
// Only stores strings (< 1 KB per entry), not the PDF bytes.
const metaIndex = new Map();

// Tracks in-progress Drive downloads so concurrent requests for the same
// file wait for one download instead of hammering Drive N times.
const inProgress = new Map(); // fileId → Promise

function safeName(fileId) {
  return fileId.replace(/[^a-zA-Z0-9_-]/g, '_');
}
function cachePdfPath(fileId)  { return path.join(CACHE_DIR, `${safeName(fileId)}.pdf`); }
function cacheMetaPath(fileId) { return path.join(CACHE_DIR, `${safeName(fileId)}.meta`); }

function isCacheValid(fileId) {
  try {
    const stat = fs.statSync(cachePdfPath(fileId));
    return (Date.now() - stat.mtimeMs) < CACHE_TTL_MS;
  } catch { return false; }
}

function readMeta(fileId) {
  if (metaIndex.has(fileId)) return metaIndex.get(fileId);
  try {
    const m = JSON.parse(fs.readFileSync(cacheMetaPath(fileId), 'utf8'));
    metaIndex.set(fileId, m);
    return m;
  } catch { return null; }
}

function writeMeta(fileId, name, mimeType) {
  const m = { name, mimeType };
  metaIndex.set(fileId, m);
  fs.writeFileSync(cacheMetaPath(fileId), JSON.stringify(m));
}

// ── Singleton Drive client ────────────────────────────────────────────────────
let _drive = null;
function getDrive() {
  if (_drive) return _drive;
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson || keyJson === '{JSON_KEY_OBJECT_HERE}') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
  }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  _drive = google.drive({ version: 'v3', auth });
  return _drive;
}

// ── Download one file from Drive and write to disk cache ─────────────────────
async function downloadToDisk(fileId) {
  const drive = getDrive();

  const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType' });
  let { name, mimeType } = meta.data;

  const isGoogleType = mimeType.startsWith('application/vnd.google-apps.');
  const isPptx       = mimeType.includes('presentationml') || mimeType.includes('ms-powerpoint');

  let buffer;
  if (isGoogleType || isPptx) {
    const res = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    );
    buffer   = Buffer.from(res.data);
    mimeType = 'application/pdf';
    if (!name.endsWith('.pdf')) name += '.pdf';
  } else {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    buffer = Buffer.from(res.data);
  }

  // Atomic write: write to .tmp then rename so a partial file is never served
  const tmpPath = cachePdfPath(fileId) + '.tmp';
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, cachePdfPath(fileId));
  writeMeta(fileId, name, mimeType);
}

// ── Course lookup ─────────────────────────────────────────────────────────────
async function findCourse(courseId) {
  try {
    return await Course.findOne({
      $or: [{ _id: courseId }, { pid: courseId.toUpperCase() }],
    }).select('pid modules pyqs');
  } catch {
    return Course.findOne({ pid: courseId.toUpperCase() }).select('pid modules pyqs');
  }
}

// ── GET /api/v1/courses/:courseId/notes/:fileId ───────────────────────────────
export const getNoteSignedUrl = async (req, res) => {
  try {
    const { courseId, fileId } = req.params;
    const user = req.user;

    const course = await findCourse(courseId);
    if (!course) {
      return res.status(404).json({ status: 'error', error: 'course_not_found' });
    }

    const pid = course.pid;
    const oid = course._id.toString();
    const hasPurchased = user.purchasedCourses.some(id => {
      const s = id.toString();
      return s === pid || s === oid;
    });

    if (!hasPurchased) {
      return res.status(403).json({ status: 'error', error: 'not_purchased', message: 'You have not purchased this course.' });
    }

    const allItems    = [...course.modules, ...course.pyqs];
    const matchedItem = allItems.find(
      i => i.driveFileId === fileId || i.storageKey === fileId
    );

    if (!matchedItem) {
      return res.status(403).json({ status: 'error', error: 'file_not_in_course' });
    }

    const resolvedFileId = matchedItem.driveFileId || fileId;

    const streamToken = jwt.sign(
      { userId: user._id.toString(), fileId: resolvedFileId, courseId: pid },
      STREAM_TOKEN_SECRET,
      { expiresIn: STREAM_TOKEN_TTL }
    );

    return res.status(200).json({
      status: 'success',
      data: {
        streamUrl: `/api/v1/courses/stream/${streamToken}`,
        expiresIn: STREAM_TOKEN_TTL,
      },
    });

  } catch (err) {
    console.error('Notes controller error:', err.message);
    if (err.message.includes('GOOGLE_SERVICE_ACCOUNT_KEY')) {
      return res.status(503).json({ status: 'error', error: 'service_not_configured' });
    }
    return res.status(500).json({ status: 'error', error: 'internal_error' });
  }
};

// ── GET /api/v1/courses/stream/:streamToken ───────────────────────────────────
export const streamNote = async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.params.streamToken, STREAM_TOKEN_SECRET);
  } catch {
    return res.status(401).send('Stream token expired or invalid. Please go back and try again.');
  }

  const { fileId } = payload;

  try {
    // ── Ensure file is on disk (download once, serve many times) ────────────
    if (!isCacheValid(fileId)) {
      // If another request is already downloading this file, wait for it
      if (!inProgress.has(fileId)) {
        const download = downloadToDisk(fileId).finally(() => inProgress.delete(fileId));
        inProgress.set(fileId, download);
      }
      await inProgress.get(fileId);
    }

    // ── Serve from disk — zero RAM cost, SSD speed ───────────────────────────
    const pdfPath = cachePdfPath(fileId);
    const meta    = readMeta(fileId);
    const stat    = fs.statSync(pdfPath);

    res.setHeader('Content-Type', meta?.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(meta?.name || 'notes.pdf')}"`);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    fs.createReadStream(pdfPath).pipe(res);

  } catch (err) {
    console.error('Stream error:', err.message);
    if (err.code === 404 || err.errors?.[0]?.reason === 'notFound') {
      return res.status(404).send('File not found or service account does not have access.');
    }
    return res.status(500).send('Failed to load file. Please try again.');
  }
};

export default { getNoteSignedUrl, streamNote };
