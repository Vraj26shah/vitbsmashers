import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/gpa ───────────────────────────────────────────────────────────
export const getGpaData = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('academic').from('cgpa')
      .select('*').eq('user_id', req.user.id).order('semester');

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve GPA data' });
  }
};

// aliases for old route names
export const getGPA        = getGpaData;
export const getGPAHistory = getGpaData;

// ── PUT /api/v1/gpa/:semester ─────────────────────────────────────────────────
export const saveGpaData = async (req, res) => {
  try {
    const semester = parseInt(req.params.semester);
    const { grades, sgpa, cgpa, credits_earned } = req.body;

    if (isNaN(semester) || semester < 1 || semester > 8)
      return res.status(400).json({ status: 'error', message: 'Semester must be between 1 and 8' });

    const { data, error } = await supabase.schema('academic').from('cgpa')
      .upsert({
        user_id:        req.user.id,
        semester,
        grades:         grades         || {},
        sgpa:           sgpa           ? parseFloat(sgpa)           : null,
        cgpa:           cgpa           ? parseFloat(cgpa)           : null,
        credits_earned: credits_earned ? parseInt(credits_earned)   : 0,
        updated_at:     new Date().toISOString(),
      }, { onConflict: 'user_id,semester' })
      .select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to save GPA data' });
  }
};

// aliases for old route names
export const calculateGPA = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Use PUT /api/v1/gpa/:semester to save grades' });
};
export const updateGPA = saveGpaData;
