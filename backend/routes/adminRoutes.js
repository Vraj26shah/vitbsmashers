import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

router.use(protect);
router.use(adminOnly);

// ── GET /api/v1/admin/system-status ──────────────────────────────────────────
router.get('/system-status', async (req, res) => {
  try {
    const [
      { count: totalOrders },
      { count: completedOrders },
      { count: totalUsers },
      { count: totalCourses },
    ] = await Promise.all([
      supabase.schema('business').from('razorpay_orders').select('*', { count: 'exact', head: true }),
      supabase.schema('business').from('purchases').select('*', { count: 'exact', head: true }),
      supabase.schema('business').from('users').select('*', { count: 'exact', head: true }),
      supabase.schema('business').from('courses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    return res.json({
      status: 'success',
      data: {
        orders:  { total: totalOrders, completed: completedOrders },
        users:   { total: totalUsers },
        courses: { total: totalCourses },
      },
    });
  } catch (err) {
    console.error('System status error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to get system status' });
  }
});

// ── GET /api/v1/admin/users ───────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await supabase.schema('business').from('users')
      .select('id, email, username, full_name, role, is_banned, profile_completed, created_at', { count: 'exact' })
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', total: count, data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get users' });
  }
});

// ── POST /api/v1/admin/ban-user ───────────────────────────────────────────────
router.post('/ban-user', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const { data, error } = await supabase.schema('business').from('users')
      .update({ is_banned: true, ban_reason: reason || 'Banned by admin' })
      .eq('id', userId).select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to ban user' });
  }
});

// ── POST /api/v1/admin/unban-user ────────────────────────────────────────────
router.post('/unban-user', async (req, res) => {
  try {
    const { userId } = req.body;
    const { data, error } = await supabase.schema('business').from('users')
      .update({ is_banned: false, ban_reason: null }).eq('id', userId).select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to unban user' });
  }
});

// ── POST /api/v1/admin/set-role ───────────────────────────────────────────────
router.post('/set-role', async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!['student', 'admin'].includes(role))
      return res.status(400).json({ status: 'error', message: 'Role must be student or admin' });

    const { data, error } = await supabase.schema('business').from('users')
      .update({ role }).eq('id', userId).select().single();

    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to set role' });
  }
});

// ── GET /api/v1/admin/purchases ───────────────────────────────────────────────
router.get('/purchases', async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('purchases')
      .select('*, user:users(email, username), course:courses(pid, title)')
      .order('purchased_at', { ascending: false }).limit(100);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to get purchases' });
  }
});

export default router;
