import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/timetable/my ──────────────────────────────────────────────────
export const getMyTimetable = async (req, res) => {
  try {
    const { branch, year, batch } = req.user;

    if (!branch || !year)
      return res.status(400).json({ status: 'error', message: 'Complete your profile (branch and year) first' });

    const today = new Date().toISOString().slice(0, 10);

    let query = supabase.schema('academic').from('timetable')
      .select('schedule, effective_from, effective_to, batch')
      .eq('branch', branch).eq('year', year)
      .lte('effective_from', today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order('effective_from', { ascending: false });

    if (batch) query = query.eq('batch', batch);

    const { data, error } = await query.limit(1);

    if (error)   return res.status(500).json({ status: 'error', message: error.message });
    if (!data || data.length === 0)
      return res.status(404).json({ status: 'error', message: 'No timetable found for your batch. Contact admin.' });

    return res.status(200).json({ status: 'success', data: data[0] });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve timetable' });
  }
};

// ── GET /api/v1/timetable/:userId ─────────────────────────────────────────────
// Kept for backward-compat (returns logged-in user's timetable)
export const getTimetable = async (req, res) => getMyTimetable(req, res);

// ── POST /api/v1/timetable (admin) ───────────────────────────────────────────
export const createTimetable = async (req, res) => {
  try {
    const { branch, year, batch, effective_from, effective_to, schedule } = req.body;

    if (!branch || !year || !batch || !effective_from || !schedule)
      return res.status(400).json({ status: 'error', message: 'branch, year, batch, effective_from and schedule are required' });

    const { data, error } = await supabase.schema('academic').from('timetable')
      .upsert({
        campus: 'vit-bhopal',
        branch, year, batch,
        effective_from, effective_to: effective_to || null,
        schedule,
        created_by: req.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'campus,branch,year,batch,effective_from' })
      .select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create timetable' });
  }
};

export const updateTimetable = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('academic').from('timetable')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update timetable' });
  }
};

export const deleteTimetable = async (req, res) => {
  try {
    await supabase.schema('academic').from('timetable').delete().eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Timetable deleted' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete timetable' });
  }
};

export const exportTimetable = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Export not yet implemented' });
};
