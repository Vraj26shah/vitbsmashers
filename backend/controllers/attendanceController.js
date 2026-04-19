import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/attendance ────────────────────────────────────────────────────
export const getAttendance = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('academic').from('attendance')
      .select('*').eq('user_id', req.user.id).order('subject_name');

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve attendance' });
  }
};

// ── PUT /api/v1/attendance/:subjectCode ──────────────────────────────────────
export const updateAttendance = async (req, res) => {
  try {
    const { subjectCode } = req.params;
    const { subject_name, total_classes, attended } = req.body;

    if (attended !== undefined && total_classes !== undefined && parseInt(attended) > parseInt(total_classes))
      return res.status(400).json({ status: 'error', message: 'Attended cannot exceed total classes' });

    const { data, error } = await supabase.schema('academic').from('attendance')
      .upsert({
        user_id:       req.user.id,
        subject_code:  subjectCode,
        subject_name:  subject_name || subjectCode,
        total_classes: parseInt(total_classes) || 0,
        attended:      parseInt(attended) || 0,
        last_updated:  new Date().toISOString(),
      }, { onConflict: 'user_id,subject_code' })
      .select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update attendance' });
  }
};

// ── DELETE /api/v1/attendance/:subjectCode ────────────────────────────────────
export const deleteAttendance = async (req, res) => {
  try {
    await supabase.schema('academic').from('attendance')
      .delete().eq('user_id', req.user.id).eq('subject_code', req.params.subjectCode);
    return res.status(200).json({ status: 'success', message: 'Subject removed' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete attendance record' });
  }
};

// ── POST /api/v1/attendance/calculate ─────────────────────────────────────────
export const calculateAttendance = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('academic').from('attendance')
      .select('*').eq('user_id', req.user.id);

    if (error) return res.status(500).json({ status: 'error', message: error.message });

    const summary = data.map(s => ({
      ...s,
      percentage: s.total_classes > 0 ? Math.round((s.attended / s.total_classes) * 100) : 0,
      safe_to_miss: s.total_classes > 0
        ? Math.max(0, Math.floor(s.total_classes * 0.25) - (s.total_classes - s.attended))
        : 0,
    }));

    return res.status(200).json({ status: 'success', data: summary });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to calculate attendance' });
  }
};

// ── GET /api/v1/attendance/history/:userId ────────────────────────────────────
export const getAttendanceHistory = async (req, res) => getAttendance(req, res);
