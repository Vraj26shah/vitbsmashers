import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/mess/current ──────────────────────────────────────────────────
export const getCurrentMenu = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.schema('content').from('mess_menu')
      .select('*').lte('week_start', today)
      .order('week_start', { ascending: false }).limit(1).single();

    if (error || !data)
      return res.status(404).json({ status: 'error', message: 'No menu available for this week' });

    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve mess menu' });
  }
};

// aliases for old route names
export const getMenu    = getCurrentMenu;
export const getSchedule = getCurrentMenu;

// ── GET /api/v1/mess/menu/:date ───────────────────────────────────────────────
export const getMenuByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const { data, error } = await supabase.schema('content').from('mess_menu')
      .select('*').lte('week_start', date)
      .order('week_start', { ascending: false }).limit(1).single();

    if (error || !data)
      return res.status(404).json({ status: 'error', message: 'No menu found for this date' });

    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve mess menu for date' });
  }
};

// ── GET /api/v1/mess ──────────────────────────────────────────────────────────
export const getAllMenus = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('mess_menu')
      .select('*').order('week_start', { ascending: false }).limit(8);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve menus' });
  }
};

// ── POST /api/v1/mess (admin) ─────────────────────────────────────────────────
export const createMenu = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('mess_menu')
      .upsert(
        { ...req.body, updated_by: req.user.id, updated_at: new Date().toISOString() },
        { onConflict: 'week_start' }
      ).select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create/update menu' });
  }
};

export const submitFeedback = async (req, res) => {
  return res.status(201).json({ status: 'success', message: 'Feedback submitted successfully' });
};
