import { supabase }       from '../lib/supabase.js';
import { getR2SignedUrl } from '../lib/r2.js';

// ── GET /api/v1/courses/:courseId/notes/:moduleId ────────────────────────────
// Verifies purchase → fetches r2_key → returns 5-min signed URL + watermark data
export const getDocumentUrl = async (req, res) => {
  try {
    const { courseId, moduleId } = req.params;
    const userId = req.user.id;

    // Verify purchase (also resolve course by pid if courseId is not a UUID)
    let resolvedCourseId = courseId;
    if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
      const { data: course } = await supabase.schema('business').from('courses')
        .select('id').eq('pid', courseId.toUpperCase()).maybeSingle();
      if (!course) return res.status(404).json({ status: 'error', error: 'course_not_found' });
      resolvedCourseId = course.id;
    }

    const { data: purchase } = await supabase.schema('business').from('purchases')
      .select('id').eq('user_id', userId).eq('course_id', resolvedCourseId).maybeSingle();

    if (!purchase)
      return res.status(403).json({ status: 'error', error: 'not_purchased', message: 'You have not purchased this course.' });

    // Fetch module
    const { data: mod, error } = await supabase.schema('business').from('course_modules')
      .select('id, title, r2_key, course_id')
      .eq('id', moduleId)
      .eq('course_id', resolvedCourseId)
      .eq('is_active', true)
      .single();

    if (error || !mod)
      return res.status(404).json({ status: 'error', error: 'module_not_found' });

    if (!mod.r2_key)
      return res.status(404).json({ status: 'error', error: 'file_not_uploaded', message: 'PDF not yet uploaded for this module.' });

    // Generate 5-minute signed URL
    const signedUrl = await getR2SignedUrl(mod.r2_key, 300);

    return res.status(200).json({
      status: 'success',
      data: {
        signedUrl,
        expiresIn: 300,
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

export default { getDocumentUrl, getNoteSignedUrl };
