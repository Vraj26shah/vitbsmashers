import { supabase }   from '../lib/supabase.js';
import { uploadToR2 } from '../lib/r2.js';

// ── GET /api/v1/courses ──────────────────────────────────────────────────────
export const getCourses = async (req, res) => {
  try {
    const { category, search, featured, bestseller, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.schema('business').from('courses')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (category)   query = query.eq('category', category);
    if (featured === 'true') query = query.eq('featured', true);
    if (bestseller === 'true') query = query.eq('bestseller', true);
    if (search)     query = query.ilike('title', `%${search}%`);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ status: 'error', message: error.message });

    return res.status(200).json({
      status: 'success',
      results: data.length,
      total: count,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
        totalCourses: count,
      },
      data: { courses: data },
    });
  } catch (err) {
    console.error('getCourses error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch courses' });
  }
};

// alias for backward-compat
export const getAllCourses = getCourses;

// ── GET /api/v1/courses/featured ─────────────────────────────────────────────
export const getFeaturedCourses = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const { data, error } = await supabase.schema('business').from('courses')
      .select('*').eq('status', 'active').eq('featured', true)
      .limit(parseInt(limit)).order('created_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { courses: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch featured courses' });
  }
};

// ── GET /api/v1/courses/categories ───────────────────────────────────────────
export const getCategories = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('courses')
      .select('category').eq('status', 'active');

    if (error) return res.status(500).json({ status: 'error', message: error.message });

    const counts = {};
    data.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));

    return res.status(200).json({ status: 'success', data: { categories } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch categories' });
  }
};

// ── GET /api/v1/courses/stats ─────────────────────────────────────────────────
export const getCourseStats = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('courses')
      .select('price, rating, review_count, featured, bestseller, category')
      .eq('status', 'active');

    if (error) return res.status(500).json({ status: 'error', message: error.message });

    const overall = data.reduce((acc, c) => ({
      totalCourses:    acc.totalCourses + 1,
      totalReviews:    acc.totalReviews + (c.review_count || 0),
      featuredCount:   acc.featuredCount + (c.featured ? 1 : 0),
      bestsellerCount: acc.bestsellerCount + (c.bestseller ? 1 : 0),
    }), { totalCourses: 0, totalReviews: 0, featuredCount: 0, bestsellerCount: 0 });

    return res.status(200).json({ status: 'success', data: { overall } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch stats' });
  }
};

// ── GET /api/v1/courses/search ────────────────────────────────────────────────
export const searchCourses = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ status: 'error', message: 'Search query required' });

    const { data, error } = await supabase.schema('business').from('courses')
      .select('*').eq('status', 'active').ilike('title', `%${q}%`).limit(20);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { courses: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Search failed' });
  }
};

// ── GET /api/v1/courses/category/:category ────────────────────────────────────
export const getCoursesByCategory = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('courses')
      .select('*').eq('status', 'active').eq('category', req.params.category).limit(20);

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { courses: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch courses by category' });
  }
};

// ── GET /api/v1/courses/my-courses ───────────────────────────────────────────
export const getMyCourses = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('purchases')
      .select(`
        purchased_at, amount_paid,
        course:courses (
          id, pid, title, description, image, category,
          modules_count, notes_count, hours, instructor
        )
      `)
      .eq('user_id', req.user.id)
      .order('purchased_at', { ascending: false });

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', results: data.length, data: { courses: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch purchased courses' });
  }
};

// alias
export const getUserPurchasedCourses = getMyCourses;

// ── GET /api/v1/courses/:id ──────────────────────────────────────────────────
export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const isPid   = id.length < 20 && !/^[0-9a-f-]{36}$/i.test(id);

    let query = supabase.schema('business').from('courses').select('*').eq('status', 'active');
    query = isPid ? query.eq('pid', id.toUpperCase()) : query.eq('id', id);

    const { data, error } = await query.maybeSingle();
    if (error || !data)
      return res.status(404).json({ status: 'error', message: 'Course not found' });

    // Fetch modules (public metadata, no r2_key)
    const { data: modules } = await supabase.schema('business').from('course_modules')
      .select('id, type, title, topics, duration, module_no, academic_year, display_order')
      .eq('course_id', data.id).eq('is_active', true)
      .order('type').order('display_order');

    return res.status(200).json({ status: 'success', data: { course: { ...data, modules: modules || [] } } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch course' });
  }
};

// ── GET /api/v1/courses/:courseId/modules (protected — must be purchased) ───
export const getCourseModules = async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data: purchase } = await supabase.schema('business').from('purchases')
      .select('id').eq('user_id', req.user.id).eq('course_id', courseId).maybeSingle();

    if (!purchase)
      return res.status(403).json({ status: 'error', error: 'not_purchased' });

    const { data, error } = await supabase.schema('business').from('course_modules')
      .select('id, type, title, topics, duration, module_no, academic_year, display_order, r2_key')
      .eq('course_id', courseId).eq('is_active', true)
      .order('type').order('display_order');

    if (error) return res.status(500).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to fetch modules' });
  }
};

// ── POST /api/v1/courses (admin) ─────────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('courses')
      .insert({ ...req.body, created_by: req.user.id }).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(201).json({ status: 'success', data: { course: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to create course' });
  }
};

// ── PUT /api/v1/courses/:id (admin) ──────────────────────────────────────────
export const updateCourse = async (req, res) => {
  try {
    const { data, error } = await supabase.schema('business').from('courses')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) return res.status(400).json({ status: 'error', message: error.message });
    return res.status(200).json({ status: 'success', data: { course: data } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to update course' });
  }
};

// ── DELETE /api/v1/courses/:id (admin) ───────────────────────────────────────
export const deleteCourse = async (req, res) => {
  try {
    await supabase.schema('business').from('courses')
      .update({ status: 'archived' }).eq('id', req.params.id);
    return res.status(200).json({ status: 'success', message: 'Course archived' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Failed to archive course' });
  }
};

// ── PUT /api/v1/courses/bulk (admin) ─────────────────────────────────────────
export const bulkUpdateCourses = async (req, res) => {
  try {
    const { courseIds, updates } = req.body;
    if (!Array.isArray(courseIds) || courseIds.length === 0)
      return res.status(400).json({ status: 'error', message: 'courseIds array required' });

    let count = 0;
    for (const id of courseIds) {
      await supabase.schema('business').from('courses')
        .update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      count++;
    }
    return res.status(200).json({ status: 'success', message: `${count} courses updated` });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Bulk update failed' });
  }
};

// ── POST /api/v1/courses/:courseId/modules/:moduleId/upload (admin) ──────────
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const uploadDocument = [
  upload.single('pdf'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

      const { courseId, moduleId } = req.params;
      const r2Key = `courses/${courseId}/${moduleId}.pdf`;
      await uploadToR2(req.file.buffer, r2Key, req.file.mimetype);

      await supabase.schema('business').from('course_modules')
        .update({ r2_key: r2Key }).eq('id', moduleId);

      return res.status(200).json({ status: 'success', data: { r2_key: r2Key } });
    } catch (err) {
      console.error('uploadDocument error:', err.message);
      return res.status(500).json({ status: 'error', message: 'Upload failed' });
    }
  },
];

// ── POST /api/v1/courses/seed (admin) ────────────────────────────────────────
// Seeds the initial course catalog into Supabase business.courses
export const seedCourses = async (req, res) => {
  try {
    const coursesData = [
      { pid: 'CSE001', title: 'Data Structures & Algorithms', description: 'Master fundamental data structures and algorithms.', category: 'Computer Science', subcategory: 'Data Structures', level: 'Intermediate', instructor: 'Dr. Rajesh Kumar', price: 1299, original_price: 1499, discount: 13, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.9, review_count: 120, modules_count: 5, notes_count: 220, hours: 45, tags: ['data structures', 'algorithms', 'programming'], featured: true, bestseller: true, status: 'active' },
      { pid: 'CSE002', title: 'Web Development Bootcamp', description: 'Complete full-stack web development course.', category: 'Computer Science', subcategory: 'Web Development', level: 'Beginner', instructor: 'Prof. Priya Sharma', price: 1499, original_price: 1799, discount: 17, image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.8, review_count: 95, modules_count: 5, notes_count: 280, hours: 60, tags: ['web development', 'javascript', 'react'], featured: true, status: 'active' },
      { pid: 'CSE003', title: 'Machine Learning Fundamentals', description: 'Learn machine learning from basics to advanced.', category: 'Computer Science', subcategory: 'Machine Learning', level: 'Intermediate', instructor: 'Dr. Amit Singh', price: 1899, original_price: 2199, discount: 14, image: 'https://images.unsplash.com/photo-1581094794329-16d1f0d22b6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.7, review_count: 80, modules_count: 5, notes_count: 260, hours: 55, tags: ['machine learning', 'ai', 'python'], featured: true, status: 'active' },
      { pid: 'CSE004', title: 'Database Management Systems', description: 'Comprehensive DBMS notes covering SQL, normalization, transactions.', category: 'Computer Science', subcategory: 'Databases', level: 'Intermediate', instructor: 'Prof. Sunita Gupta', price: 1199, original_price: 1399, discount: 14, image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.6, review_count: 70, modules_count: 5, notes_count: 200, hours: 40, tags: ['database', 'sql', 'nosql'], bestseller: true, status: 'active' },
      { pid: 'CSE005', title: 'Operating Systems', description: 'Deep dive into OS concepts including process management and memory.', category: 'Computer Science', subcategory: 'Operating Systems', level: 'Advanced', instructor: 'Dr. Vikram Singh', price: 1399, original_price: 1599, discount: 13, image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.5, review_count: 60, modules_count: 5, notes_count: 210, hours: 42, tags: ['operating systems', 'processes', 'memory management'], status: 'active' },
      { pid: 'CSE006', title: 'Computer Networks', description: 'Complete coverage from OSI model to TCP/IP, routing and security.', category: 'Computer Science', subcategory: 'Networking', level: 'Intermediate', instructor: 'Prof. Rohan Mehta', price: 1149, original_price: 1349, discount: 15, image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.8, review_count: 90, modules_count: 5, notes_count: 190, hours: 38, tags: ['networks', 'osi model', 'tcp/ip'], status: 'active' },
      { pid: 'MAT001', title: 'Advanced Calculus', description: 'Master complex calculus with step-by-step solutions.', category: 'Mathematics', subcategory: 'Calculus', level: 'Advanced', instructor: 'Dr. Meera Patel', price: 999, original_price: 1199, discount: 17, image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.6, review_count: 55, modules_count: 5, notes_count: 150, hours: 30, tags: ['calculus', 'mathematics', 'integration'], status: 'active' },
      { pid: 'SCI001', title: 'Organic Chemistry', description: 'Comprehensive coverage of organic chemistry principles and reactions.', category: 'Science', subcategory: 'Chemistry', level: 'Intermediate', instructor: 'Dr. Anjali Verma', price: 1099, original_price: 1299, discount: 15, image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', rating: 4.8, review_count: 75, modules_count: 5, notes_count: 180, hours: 35, tags: ['organic chemistry', 'reactions', 'mechanisms'], status: 'active' },
    ];

    // Delete existing active courses with matching PIDs (upsert by pid)
    for (const c of coursesData) {
      await supabase.schema('business').from('courses').upsert(
        { ...c, created_by: req.user.id },
        { onConflict: 'pid' }
      );
    }

    return res.status(201).json({
      status: 'success',
      message: `Seeded ${coursesData.length} courses`,
      data: { count: coursesData.length, pids: coursesData.map(c => c.pid) },
    });
  } catch (err) {
    console.error('seedCourses error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to seed courses', error: err.message });
  }
};
