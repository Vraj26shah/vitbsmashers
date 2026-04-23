import { GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { google }         from 'googleapis';
import { supabase }       from '../lib/supabase.js';
import { getR2SignedUrl, r2, BUCKET } from '../lib/r2.js';
import { findAccessiblePurchase } from '../utils/branchPackAccess.js';

/** Normalize R2 GetObject body to a Node.js Readable for piping. */
function toNodeReadable(body) {
  if (!body) return null;
  if (typeof body.pipe === 'function') return body;
  if (typeof body.transformToWebStream === 'function') {
    return Readable.fromWeb(body.transformToWebStream());
  }
  return null;
}

let cachedDrive = null;
function getDriveClient() {
  if (cachedDrive) return cachedDrive;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  cachedDrive = google.drive({ version: 'v3', auth });
  return cachedDrive;
}

async function getLegacyDrivePdfBuffer(fileId) {
  const drive = getDriveClient();
  if (!drive || !fileId) return null;

  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType,name',
    supportsAllDrives: true,
  });

  const mimeType = meta?.data?.mimeType || '';
  const isGoogleDoc = mimeType.startsWith('application/vnd.google-apps.');

  if (isGoogleDoc) {
    const exported = await drive.files.export(
      { fileId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    );
    return Buffer.from(exported.data);
  }

  const downloaded = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(downloaded.data);
}

function sendPdfBuffer(req, res, buffer) {
  const totalLength = buffer.length;
  const rangeHeader = req.headers.range;

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'private, max-age=1800');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (rangeHeader) {
    const match = String(rangeHeader).match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : totalLength - 1;
      const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
      const safeEnd = Number.isFinite(end) ? Math.min(end, totalLength - 1) : totalLength - 1;

      if (safeStart <= safeEnd) {
        const chunk = buffer.subarray(safeStart, safeEnd + 1);
        res.status(206);
        res.setHeader('Content-Length', String(chunk.length));
        res.setHeader('Content-Range', `bytes ${safeStart}-${safeEnd}/${totalLength}`);
        res.end(chunk);
        return;
      }
    }
  }

  res.status(200);
  res.setHeader('Content-Length', String(totalLength));
  res.end(buffer);
}

// ── GET /api/v1/courses/:courseId/notes/test-r2 ──────────────────────────────
// Test R2 connectivity
export const testR2Connection = async (req, res) => {
  try {
    const { getR2SignedUrl } = await import('../lib/r2.js');
    await getR2SignedUrl('__r2_connectivity_probe__.pdf', 60);
    return res.status(200).json({
      status: 'success',
      message: 'R2 signing is configured (URL not returned).',
    });
  } catch (error) {
    console.error('R2 test failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'R2 connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Configuration error',
    });
  }
};

// ── GET /api/v1/courses/:courseId/notes/:moduleId ────────────────────────────
// Verifies purchase → fetches r2_key → returns 5-min signed URL + watermark data
export const getDocumentUrl = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user.id;

    const { resolvedCourse, purchase } = await findAccessiblePurchase(userId, courseId);

    if (!resolvedCourse)
      return res.status(404).json({
        status: 'error',
        error: 'course_not_found',
        message: 'Course record not found. This subject may not be seeded in the database yet.',
      });

    if (!purchase)
      return res.status(403).json({ status: 'error', error: 'not_purchased', message: 'You have not purchased this course.' });

    // Fetch module
    const { data: mod, error } = await supabase.schema('business').from('course_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('course_id', resolvedCourse.id)
      .eq('is_active', true)
      .single();

    if (error || !mod)
      return res.status(404).json({ status: 'error', error: 'module_not_found' });

    if (!mod.r2_key && !mod.drive_file_id)
      return res.status(404).json({ status: 'error', error: 'file_not_uploaded', message: 'PDF not yet uploaded for this module.' });

    const signedUrl = mod.r2_key
      ? await getR2SignedUrl(mod.r2_key, 1800)
      : `${req.protocol}://${req.get('host')}/api/v1/courses/${courseId}/notes/${moduleId}/stream`;

    return res.status(200).json({
      status: 'success',
      data: {
        signedUrl,
        expiresIn: 1800, // Updated to match actual expiration time
        watermark: {
          name:      req.user.full_name || req.user.username,
          email:     req.user.email,
          userId:    req.user.id,
          timestamp: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    console.error('getDocumentUrl error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Internal error' });
  }
};

// Keep old export name as alias for backward compatibility
export const getNoteSignedUrl = getDocumentUrl;

// ── GET /api/v1/courses/:courseId/notes/:moduleId/stream ─────────────────────
// Verifies purchase → streams PDF directly from R2 through the backend.
// Avoids browser-side R2 CORS entirely — no signed URL exposed to client.
export const streamDocument = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;

    const { resolvedCourse, purchase } = await findAccessiblePurchase(req.user.id, courseId);

    if (!resolvedCourse)
      return res.status(404).json({
        status: 'error',
        error: 'course_not_found',
        message: 'Course record not found. This subject may not be seeded in the database yet.',
      });

    if (!purchase)
      return res.status(403).json({ status: 'error', error: 'not_purchased', message: 'You have not purchased this course.' });

    const { data: mod, error } = await supabase.schema('business').from('course_modules')
      .select('*')
      .eq('id', moduleId)
      .eq('course_id', resolvedCourse.id)
      .eq('is_active', true)
      .single();

    if (error || !mod)
      return res.status(404).json({ status: 'error', error: 'module_not_found' });

    if (!mod.r2_key && !mod.drive_file_id)
      return res.status(404).json({ status: 'error', error: 'file_not_uploaded', message: 'PDF not yet uploaded for this module.' });

    if (!mod.r2_key && mod.drive_file_id) {
      const legacyBuffer = await getLegacyDrivePdfBuffer(mod.drive_file_id);
      if (!legacyBuffer || !legacyBuffer.length) {
        return res.status(404).json({
          status: 'error',
          error: 'file_not_uploaded',
          message: 'PDF not found in legacy storage for this module.',
        });
      }
      sendPdfBuffer(req, res, legacyBuffer);
      return;
    }

    const rangeHeader = req.headers.range;
    const cmdParams = { Bucket: BUCKET, Key: mod.r2_key };
    if (rangeHeader) cmdParams.Range = rangeHeader;

    const cmd = new GetObjectCommand(cmdParams);
    let output;
    try {
      output = await r2.send(cmd);
    } catch (s3Err) {
      const code = s3Err.name || s3Err.Code;
      if (code === 'NoSuchKey' || code === 'NotFound' || s3Err.$metadata?.httpStatusCode === 404) {
        return res.status(404).json({
          status: 'error',
          error: 'file_not_uploaded',
          message: 'PDF not found in storage for this module.',
        });
      }
      throw s3Err;
    }

    const { Body, ContentLength, ContentType, ContentRange } = output;
    const nodeStream = toNodeReadable(Body);
    if (!nodeStream) {
      return res.status(500).json({ status: 'error', message: 'Invalid object stream from storage' });
    }

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', ContentType || 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=1800');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (ContentLength != null) res.setHeader('Content-Length', String(ContentLength));
    if (ContentRange) res.setHeader('Content-Range', ContentRange);

    res.status(rangeHeader ? 206 : 200);

    nodeStream.on('error', (err) => {
      console.error('R2 stream read error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ status: 'error', message: 'Stream failed' });
      } else {
        res.destroy(err);
      }
    });

    try {
      await pipeline(nodeStream, res);
    } catch (pipeErr) {
      if (!res.headersSent) {
        console.error('streamDocument pipeline error:', pipeErr.message);
        res.status(500).json({ status: 'error', message: 'Failed to stream document' });
      }
    }
  } catch (err) {
    console.error('streamDocument error:', err.message);
    if (!res.headersSent)
      res.status(500).json({ status: 'error', message: 'Failed to stream document' });
  }
};

export default { getDocumentUrl, getNoteSignedUrl, streamDocument };
