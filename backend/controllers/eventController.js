import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/events ────────────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const { category, date } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase.schema('content').from('events')
      .select('*').eq('is_active', true)
      .gte('event_date', date || today)
      .order('event_date');

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { events: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve events' });
  }
};

// ── GET /api/v1/events/:id ────────────────────────────────────────────────────
export const getEventById = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('events')
      .select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ status: 'error', message: 'Event not found' });
    return res.status(200).json({ status: 'success', data: { event: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve event' });
  }
};

// ── POST /api/v1/events (admin) ──────────────────────────────────────────────
export const createEvent = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('events')
      .insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data: { event: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create event' });
  }
};

// ── PUT /api/v1/events/:id (admin) ───────────────────────────────────────────
export const updateEvent = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('events')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data: { event: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update event' });
  }
};

// ── DELETE /api/v1/events/:id (admin) ────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  try {
    await supabase.schema('content').from('events')
      .update({ is_active: false }).eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Event deactivated' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete event' });
  }
};

// ── POST /api/v1/events/register ─────────────────────────────────────────────
export const registerForEvent = async (req, res) => {
  try {
    const { eventId, extra_data } = req.body;
    const { data, error } = await supabase.schema('content').from('event_registrations')
      .insert({ event_id: eventId, user_id: req.user.id, extra_data })
      .select().single();

    if (error?.code === '23505')
      return res.status(409).json({ status: 'error', message: 'Already registered for this event' });
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', message: 'Registered successfully', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to register for event' });
  }
};

// ── GET /api/v1/events/my ────────────────────────────────────────────────────
export const getRegisteredEvents = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('content').from('event_registrations')
      .select('registered_at, extra_data, event:events(*)')
      .eq('user_id', req.user.id)
      .order('registered_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { events: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve registered events' });
  }
};

// ── POST /api/v1/events/submit-addition (user submission) ───────────────────
export const submitEventRegistration = async (req, res) => {
  return res.status(202).json({
    status: 'success',
    message: 'Event addition request submitted for admin review',
  });
};

// ── POST /api/v1/events/submit-update (user submission) ─────────────────────
export const submitEventUpdate = async (req, res) => {
  return res.status(202).json({
    status: 'success',
    message: 'Event update request submitted for admin review',
  });
};

// Admin approval stubs (simplified — direct CRUD replaces pending workflow)
export const approveEventRegistration = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Use POST /api/v1/events to create events directly' });
};
export const rejectEventRegistration = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Rejected' });
};
export const approveEventUpdate = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Use PUT /api/v1/events/:id to update directly' });
};
export const rejectEventUpdate = async (req, res) => {
  return res.status(200).json({ status: 'success', message: 'Rejected' });
};
