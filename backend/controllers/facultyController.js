import { supabase }       from '../lib/supabase.js';
import { getR2SignedUrl } from '../lib/r2.js';

// ── GET /api/v1/faculty ───────────────────────────────────────────────────────
export const getFaculty = async (req, res) => {
  try {
    const { department, search } = req.query;
    let query = supabase.schema('content').from('faculty')
      .select('id, name, email, department, designation, phone, office, specialization, availability, bio, photo_r2_key')
      .eq('is_active', true).order('name');

    if (department) query = query.eq('department', department);
    if (search)     query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });

    // Attach signed photo URLs (1-hour validity)
    const withPhotos = await Promise.all(data.map(async f => {
      if (!f.photo_r2_key) return { ...f, photoUrl: null };
      try {
        const photoUrl = await getR2SignedUrl(f.photo_r2_key, 3600);
        return { ...f, photoUrl };
      } catch {
        return { ...f, photoUrl: null };
      }
    }));

    return res.status(200).json({ status: 'success', results: withPhotos.length, data: { faculty: withPhotos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty list' });
  }
};

// ── GET /api/v1/faculty/:id ───────────────────────────────────────────────────
export const getFacultyById = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('faculty')
      .select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ status: 'error', message: 'Faculty not found' });

    let result = { ...data };
    if (data.photo_r2_key) {
      try { result.photoUrl = await getR2SignedUrl(data.photo_r2_key, 3600); } catch {}
    }
    return res.status(200).json({ status: 'success', data: { faculty: result } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty' });
  }
};

// ── GET /api/v1/faculty/department/:dept ─────────────────────────────────────
export const getFacultyByDepartment = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('faculty')
      .select('*').eq('department', req.params.dept).eq('is_active', true).order('name');
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { faculty: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve faculty by department' });
  }
};

// ── POST /api/v1/faculty (admin) ─────────────────────────────────────────────
export const createFaculty = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('faculty')
      .insert(req.body).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data: { faculty: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create faculty' });
  }
};

// ── PUT /api/v1/faculty/:id (admin) ──────────────────────────────────────────
export const updateFaculty = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('faculty')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data: { faculty: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update faculty' });
  }
};

// ── DELETE /api/v1/faculty/:id (admin) ───────────────────────────────────────
export const deleteFaculty = async (req, res) => {
  try {
    await supabase.schema('content').from('faculty')
      .update({ is_active: false }).eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Faculty deactivated' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete faculty' });
  }
};

// ── POST /api/v1/faculty/contact ─────────────────────────────────────────────
export const contactFaculty = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Contact request received. Email functionality coming soon.' });
};

// ── GET /api/v1/faculty/schedule/:id ─────────────────────────────────────────
export const getFacultySchedule = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('faculty')
      .select('id, name, availability').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ status: 'error', message: 'Faculty not found' });
    return res.status(200).json({ status: 'success', data: { faculty: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve schedule' });
  }
};

// User submission stubs
export const getPendingAdditions = async (req, res) =>
  res.status(200).json({ status: 'success', data: { pendingAdditions: [] } });

export const getPendingUpdates = async (req, res) =>
  res.status(200).json({ status: 'success', data: { pendingUpdates: [] } });

export const approveAddition = async (req, res) =>
  res.status(200).json({ status: 'success', message: 'Use POST /api/v1/faculty to create directly' });

export const rejectAddition = async (req, res) =>
  res.status(200).json({ status: 'success', message: 'Rejected' });

export const approveUpdate = async (req, res) =>
  res.status(200).json({ status: 'success', message: 'Use PUT /api/v1/faculty/:id to update directly' });

export const rejectUpdate = async (req, res) =>
  res.status(200).json({ status: 'success', message: 'Rejected' });
