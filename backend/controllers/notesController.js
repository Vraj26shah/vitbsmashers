import { GetObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
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

    if (!mod.r2_key)
      return res.status(404).json({ status: 'error', error: 'file_not_uploaded', message: 'PDF not yet uploaded for this module.' });

    const signedUrl = await getR2SignedUrl(mod.r2_key, 1800);

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

    if (!mod.r2_key)
      return res.status(404).json({ status: 'error', error: 'file_not_uploaded', message: 'PDF not yet uploaded for this module.' });

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
