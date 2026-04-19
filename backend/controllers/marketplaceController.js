import { supabase } from '../lib/supabase.js';

// ── GET /api/v1/marketplace/items ────────────────────────────────────────────
// Returns courses from business.courses (this is the course notes marketplace)
export const getItems = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice } = req.query;

    let query = supabase.schema('business').from('courses')
      .select('id, pid, title, description, image, price, original_price, discount, rating, review_count, modules_count, notes_count, hours, category, subcategory, level, instructor, featured, bestseller, tags, status')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      // Map frontend category slugs to DB categories
      const catMap = { cs: 'Computer Science', eng: 'Engineering', math: 'Mathematics', sci: 'Science' };
      query = query.eq('category', catMap[category] || category);
    }
    if (search)    query = query.ilike('title', `%${search}%`);
    if (minPrice)  query = query.gte('price', parseFloat(minPrice));
    if (maxPrice)  query = query.lte('price', parseFloat(maxPrice));

    const { data, error } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });

    // Shape data to match old frontend expectations
    const items = data.map(c => ({
      id:          c.pid || c.id,
      uuid:        c.id,
      title:       c.title,
      image:       c.image,
      price:       c.price,
      originalPrice: c.original_price,
      discount:    c.discount,
      rating:      c.rating,
      modules:     c.modules_count,
      hours:       c.hours,
      notes:       c.notes_count,
      category:    c.category,
      description: c.description,
      featured:    c.featured,
      bestseller:  c.bestseller,
      instructor:  c.instructor,
    }));

    return res.status(200).json({ status: 'success', results: items.length, data: { items } });
  } catch (err) {
    console.error('getItems error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve marketplace items' });
  }
};

// ── GET /api/v1/marketplace/item/:id ─────────────────────────────────────────
export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const isPid  = !/^[0-9a-f-]{36}$/i.test(id);

    let query = supabase.schema('business').from('courses').select('*').eq('status', 'active');
    query = isPid ? query.eq('pid', id.toUpperCase()) : query.eq('id', id);

    const { data, error } = await query.maybeSingle();

    if (error || !data)
      return res.status(404).json({ status: 'error', message: 'Item not found' });

    // Fetch modules metadata
    const { data: modules } = await supabase.schema('business').from('course_modules')
      .select('id, type, title, topics, duration, module_no, academic_year, display_order')
      .eq('course_id', data.id).eq('is_active', true)
      .order('type').order('display_order');

    const item = {
      id:          data.pid || data.id,
      uuid:        data.id,
      title:       data.title,
      image:       data.image,
      price:       data.price,
      originalPrice: data.original_price,
      discount:    data.discount,
      rating:      data.rating,
      modules:     data.modules_count,
      hours:       data.hours,
      notes:       data.notes_count,
      category:    data.category,
      description: data.description,
      instructor:  data.instructor,
      modulesList: (modules || []).filter(m => m.type === 'module'),
      pyqs:        (modules || []).filter(m => m.type === 'pyq'),
      isAvailable: true,
      seller: { username: 'VITBSmashers', fullName: 'VIT Bhopal Academic Team', email: 'vitbsmashers@gmail.com' },
    };

    return res.status(200).json({ status: 'success', data: { item } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve item' });
  }
};

// ── POST /api/v1/marketplace/item (authenticated) ────────────────────────────
// Creates a student-to-student marketplace listing
export const createItem = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('marketplace_items')
      .insert({ ...req.body, seller_id: req.user.id }).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data: { item: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create listing' });
  }
};

// ── PUT /api/v1/marketplace/item/:id ─────────────────────────────────────────
export const updateItem = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('marketplace_items')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('seller_id', req.user.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data: { item: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update item' });
  }
};

// ── DELETE /api/v1/marketplace/item/:id ──────────────────────────────────────
export const deleteItem = async (req, res) => {
  try {
    await supabase.schema('business').from('marketplace_items')
      .update({ is_available: false }).eq('id', req.params.id).eq('seller_id', req.user.id);
    return res.status(200).json({ status: 'success', message: 'Item removed' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to delete item' });
  }
};

// ── POST /api/v1/marketplace/purchase ────────────────────────────────────────
// Redirects to Razorpay flow
export const purchaseItem = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Use POST /api/v1/payment/create-order with courseId to purchase a course',
    redirect: '/api/v1/payment/create-order',
  });
};

// ── GET /api/v1/marketplace/orders/:userId ────────────────────────────────────
export const getOrders = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('purchases')
      .select('*, course:courses(id, pid, title, image)').eq('user_id', req.user.id)
      .order('purchased_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { orders: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve orders' });
  }
};
