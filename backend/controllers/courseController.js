import { supabase }   from '../lib/supabase.js';
import { uploadToR2 } from '../lib/r2.js';
import { findAccessiblePurchase } from '../utils/branchPackAccess.js';

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
    const { resolvedCourse, purchase } = await findAccessiblePurchase(req.user.id, courseId);

    if (!resolvedCourse)
      return res.status(404).json({ status: 'error', error: 'course_not_found' });

    if (!purchase)
      return res.status(403).json({ status: 'error', error: 'not_purchased' });

    const { data, error } = await supabase.schema('business').from('course_modules')
      .select('id, type, title, topics, duration, module_no, academic_year, display_order, r2_key')
      .eq('course_id', resolvedCourse.id).eq('is_active', true)
      .order('type').order('display_order');

    if (error) return res.status(500).json({ status: 'error', message: error.message });

    const sanitized = (data || []).map(({ r2_key, ...rest }) => ({
      ...rest,
      has_file: !!r2_key,
      path_segments: r2_key ? r2_key.split('/') : null,
    }));

    return res.status(200).json({ status: 'success', data: sanitized });
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

// ── POST /api/v1/courses/seed-branches (admin) ───────────────────────────────
export const seedBranches = async (req, res) => {
  try {
    const branchPacks = [
      { pid: 'BAI', title: 'B.Tech AI Complete Study Pack', description: 'All semester materials for B.Tech Artificial Intelligence students at VIT Bhopal — OOP, DSA, Math, OS, DBMS, Python, Data Science, and more.', category: 'Branch Pack', subcategory: 'B.Tech AI', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 4990, discount: 80, image: 'https://images.unsplash.com/photo-1581094794329-16d1f0d22b6c?auto=format&fit=crop&w=600&q=80', rating: 4.8, review_count: 120, modules_count: 10, notes_count: 500, hours: 150, tags: ['bai', 'ai', 'data science', 'branch pack'], featured: true, bestseller: true, status: 'active' },
      { pid: 'BCE', title: 'B.Tech CE Complete Study Pack', description: 'All semester materials for B.Tech Computer Engineering students at VIT Bhopal — OOP, DSA, Java, AI, DBMS, Digital Logic, Engineering Design, and more.', category: 'Branch Pack', subcategory: 'B.Tech CE', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 4491, discount: 78, image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80', rating: 4.7, review_count: 110, modules_count: 9, notes_count: 450, hours: 135, tags: ['bce', 'computer engineering', 'branch pack'], featured: true, bestseller: true, status: 'active' },
      { pid: 'BCG', title: 'B.Tech CG Complete Study Pack', description: 'All semester materials for B.Tech CS Game Development students at VIT Bhopal — Unity, Game Physics, DSA, OS, Algorithms, Digital Logic, and more.', category: 'Branch Pack', subcategory: 'B.Tech CG', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 3992, discount: 75, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80', rating: 4.7, review_count: 95, modules_count: 8, notes_count: 400, hours: 120, tags: ['bcg', 'game development', 'branch pack'], featured: true, status: 'active' },
      { pid: 'BEY', title: 'B.Tech ECY Complete Study Pack', description: 'All semester materials for B.Tech ECY students at VIT Bhopal — Digital Logic, Signals, DSA, Java, DBMS, Numerical Methods, Environmental Science, and more.', category: 'Branch Pack', subcategory: 'B.Tech ECY', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 4491, discount: 78, image: 'https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=600&q=80', rating: 4.7, review_count: 100, modules_count: 9, notes_count: 450, hours: 135, tags: ['bey', 'ece', 'electronics', 'branch pack'], featured: true, status: 'active' },
      { pid: 'BSA', title: 'B.Tech SA Complete Study Pack', description: 'All semester materials for B.Tech Computational Sciences students at VIT Bhopal — Discrete Math, Cloud, OS, DSA, Data Science, DBMS, and Professional Communication.', category: 'Branch Pack', subcategory: 'B.Tech SA', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 3493, discount: 71, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80', rating: 4.7, review_count: 88, modules_count: 7, notes_count: 350, hours: 105, tags: ['bsa', 'computational sciences', 'branch pack'], featured: true, status: 'active' },
      { pid: 'MIM', title: 'M.Tech IM Complete Study Pack', description: 'All semester materials for M.Tech Integrated Management students at VIT Bhopal — Discrete Math, DSA, AI/ML, Professional Comm, Management, Entrepreneurship, and Algorithms.', category: 'Branch Pack', subcategory: 'M.Tech IM', level: 'All Levels', instructor: 'VIT Bhopal Faculty', price: 999, original_price: 3493, discount: 71, image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80', rating: 4.6, review_count: 75, modules_count: 7, notes_count: 350, hours: 105, tags: ['mim', 'management', 'branch pack'], featured: true, status: 'active' },
    ];

    let seeded = 0;
    for (const b of branchPacks) {
      await supabase.schema('business').from('courses').upsert(
        { ...b, created_by: req.user.id },
        { onConflict: 'pid' }
      );
      seeded++;
    }

    return res.status(201).json({
      status: 'success',
      message: `Seeded ${seeded} branch packs`,
      data: { count: seeded, pids: branchPacks.map(b => b.pid) },
    });
  } catch (err) {
    console.error('seedBranches error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to seed branches', error: err.message });
  }
};

// ── POST /api/v1/courses/seed (admin) ────────────────────────────────────────
export const seedCourses = async (req, res) => {
  try {
    const IMG = {
      cs:    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80',
      cs2:   'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      cs3:   'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
      cs4:   'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
      cs5:   'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
      cs6:   'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
      ai:    'https://images.unsplash.com/photo-1581094794329-16d1f0d22b6c?auto=format&fit=crop&w=600&q=80',
      sec:   'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=600&q=80',
      cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      game:  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      math:  'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
      math2: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?auto=format&fit=crop&w=600&q=80',
      elec:  'https://images.unsplash.com/photo-1562408590-e32931084e23?auto=format&fit=crop&w=600&q=80',
      elec2: 'https://images.unsplash.com/photo-1593642632599-e993fe1d1eb8?auto=format&fit=crop&w=600&q=80',
      chem:  'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
      phy:   'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=600&q=80',
      lang:  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
      mgmt:  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80',
      mech:  'https://images.unsplash.com/photo-1537462715879-360eeb61a0ad?auto=format&fit=crop&w=600&q=80',
    };

    const coursesData = [
      // ── Languages & Humanities ───────────────────────────────────────────────
      { pid: 'ENG2005', title: 'Advanced Technical Communication', description: 'Professional writing, presentations, and communication skills for engineering careers.', category: 'Humanities', subcategory: 'Technical Communication', level: 'Intermediate', instructor: 'Prof. Anita Sharma', price: 499, original_price: 799, discount: 38, image: IMG.lang, rating: 4.6, review_count: 80, modules_count: 5, notes_count: 120, hours: 25, tags: ['communication', 'writing', 'technical'], status: 'active' },
      { pid: 'ENG1004', title: 'Effective Technical Communication', description: 'Reading, writing, speaking, and listening skills for academic and professional contexts.', category: 'Humanities', subcategory: 'Technical Communication', level: 'Beginner', instructor: 'Prof. Anita Sharma', price: 499, original_price: 799, discount: 38, image: IMG.lang, rating: 4.5, review_count: 70, modules_count: 7, notes_count: 110, hours: 22, tags: ['communication', 'english', 'writing'], status: 'active' },
      { pid: 'HUM1002', title: 'Emotional Intelligence', description: 'Self-awareness, empathy, conflict resolution, and workplace psychology.', category: 'Humanities', subcategory: 'Soft Skills', level: 'Beginner', instructor: 'Dr. Priya Mehra', price: 499, original_price: 799, discount: 38, image: IMG.lang, rating: 4.7, review_count: 90, modules_count: 5, notes_count: 100, hours: 20, tags: ['soft skills', 'leadership', 'emotional intelligence'], status: 'active' },
      { pid: 'SST1003', title: 'Professional Communication Skills for Engineers', description: 'Email writing, presentations, group discussions, and interview preparation.', category: 'Humanities', subcategory: 'Professional Skills', level: 'Intermediate', instructor: 'Prof. Anita Sharma', price: 499, original_price: 799, discount: 38, image: IMG.lang, rating: 4.5, review_count: 65, modules_count: 7, notes_count: 115, hours: 22, tags: ['communication', 'interview', 'professional'], featured: false, bestseller: false, status: 'active' },
      { pid: 'MGT1002', title: 'Principles of Management and Organizational Behaviour', description: 'Management theories, planning, leadership, organizational behaviour, and control systems.', category: 'Management', subcategory: 'Management Principles', level: 'Beginner', instructor: 'Dr. Sunita Joshi', price: 499, original_price: 799, discount: 38, image: IMG.mgmt, rating: 4.4, review_count: 55, modules_count: 5, notes_count: 100, hours: 20, tags: ['management', 'leadership', 'organisation'], status: 'active' },
      { pid: 'MGT2003', title: 'Technology Entrepreneurship', description: 'Startup ecosystems, business model canvas, funding, intellectual property, and tech ventures.', category: 'Management', subcategory: 'Entrepreneurship', level: 'Intermediate', instructor: 'Dr. Rahul Kapoor', price: 499, original_price: 799, discount: 38, image: IMG.mgmt, rating: 4.5, review_count: 60, modules_count: 5, notes_count: 105, hours: 21, tags: ['entrepreneurship', 'startup', 'management'], status: 'active' },

      // ── Mathematics ───────────────────────────────────────────────────────────
      { pid: 'MAT1001', title: 'Calculus and Laplace Transforms', description: 'Limits, differentiation, integration, multiple integrals, and Laplace transforms.', category: 'Mathematics', subcategory: 'Calculus', level: 'Beginner', instructor: 'Dr. Meera Patel', price: 499, original_price: 799, discount: 38, image: IMG.math, rating: 4.7, review_count: 95, modules_count: 5, notes_count: 150, hours: 30, tags: ['calculus', 'mathematics', 'laplace'], status: 'active' },
      { pid: 'MAT1003', title: 'Calculus', description: 'Single and multi-variable calculus with limits, differentiation, integration, and vector calculus.', category: 'Mathematics', subcategory: 'Calculus', level: 'Beginner', instructor: 'Dr. Meera Patel', price: 499, original_price: 799, discount: 38, image: IMG.math, rating: 4.6, review_count: 85, modules_count: 5, notes_count: 145, hours: 28, tags: ['calculus', 'mathematics', 'integration'], status: 'active' },
      { pid: 'MAT2001', title: 'Differential and Difference Equations', description: 'ODEs, PDEs, difference equations, and their engineering applications.', category: 'Mathematics', subcategory: 'Differential Equations', level: 'Intermediate', instructor: 'Dr. Meera Patel', price: 499, original_price: 799, discount: 38, image: IMG.math, rating: 4.6, review_count: 75, modules_count: 5, notes_count: 140, hours: 28, tags: ['differential equations', 'mathematics', 'ode'], status: 'active' },
      { pid: 'MAT2002', title: 'Discrete Mathematics and Graph Theory', description: 'Logic, set theory, combinatorics, and graph theory for CS students.', category: 'Mathematics', subcategory: 'Discrete Mathematics', level: 'Intermediate', instructor: 'Dr. Vijay Nair', price: 499, original_price: 799, discount: 38, image: IMG.math2, rating: 4.7, review_count: 88, modules_count: 5, notes_count: 155, hours: 30, tags: ['discrete math', 'graph theory', 'combinatorics'], featured: true, status: 'active' },
      { pid: 'MAT2003', title: 'Applied Numerical Methods', description: 'Root finding, interpolation, numerical integration, and ODE solvers with engineering applications.', category: 'Mathematics', subcategory: 'Numerical Methods', level: 'Intermediate', instructor: 'Dr. Vijay Nair', price: 499, original_price: 799, discount: 38, image: IMG.math, rating: 4.5, review_count: 65, modules_count: 5, notes_count: 130, hours: 26, tags: ['numerical methods', 'mathematics', 'computation'], status: 'active' },
      { pid: 'MAT3002', title: 'Applied Linear Algebra', description: 'Vector spaces, linear transformations, eigenvalues, and matrix decomposition.', category: 'Mathematics', subcategory: 'Linear Algebra', level: 'Advanced', instructor: 'Dr. Vijay Nair', price: 499, original_price: 799, discount: 38, image: IMG.math, rating: 4.8, review_count: 110, modules_count: 5, notes_count: 160, hours: 32, tags: ['linear algebra', 'mathematics', 'matrices'], featured: true, bestseller: true, status: 'active' },
      { pid: 'MAT3003', title: 'Probability, Statistics and Reliability', description: 'Probability theory, statistical inference, hypothesis testing, and reliability engineering.', category: 'Mathematics', subcategory: 'Probability & Statistics', level: 'Advanced', instructor: 'Dr. Meera Patel', price: 499, original_price: 799, discount: 38, image: IMG.math2, rating: 4.6, review_count: 78, modules_count: 5, notes_count: 145, hours: 28, tags: ['probability', 'statistics', 'mathematics'], status: 'active' },

      // ── Physics ───────────────────────────────────────────────────────────────
      { pid: 'PHY1001', title: 'Engineering Physics', description: 'Quantum mechanics, wave optics, electromagnetic theory, and solid state physics.', category: 'Physics', subcategory: 'Applied Physics', level: 'Beginner', instructor: 'Dr. Suresh Iyer', price: 499, original_price: 799, discount: 38, image: IMG.phy, rating: 4.5, review_count: 70, modules_count: 5, notes_count: 135, hours: 27, tags: ['physics', 'quantum mechanics', 'optics'], status: 'active' },
      { pid: 'PHY1003', title: 'Introduction to Computational Physics', description: 'Numerical methods and simulation techniques applied to physics problems.', category: 'Physics', subcategory: 'Computational Physics', level: 'Intermediate', instructor: 'Dr. Suresh Iyer', price: 499, original_price: 799, discount: 38, image: IMG.phy, rating: 4.4, review_count: 50, modules_count: 5, notes_count: 120, hours: 24, tags: ['physics', 'simulation', 'computation'], status: 'active' },
      { pid: 'PHY1005', title: 'Physics of Game Development', description: 'Classical mechanics, collision physics, and simulation for game development.', category: 'Physics', subcategory: 'Applied Physics', level: 'Intermediate', instructor: 'Dr. Suresh Iyer', price: 499, original_price: 799, discount: 38, image: IMG.game, rating: 4.6, review_count: 58, modules_count: 5, notes_count: 125, hours: 24, tags: ['physics', 'game dev', 'simulation'], status: 'active' },

      // ── Chemistry ─────────────────────────────────────────────────────────────
      { pid: 'CHY1001', title: 'Engineering Chemistry', description: 'Chemical bonding, electrochemistry, polymers, fuels, and water treatment.', category: 'Chemistry', subcategory: 'Applied Chemistry', level: 'Beginner', instructor: 'Dr. Anjali Verma', price: 499, original_price: 799, discount: 38, image: IMG.chem, rating: 4.5, review_count: 68, modules_count: 6, notes_count: 130, hours: 26, tags: ['chemistry', 'engineering chemistry', 'electrochemistry'], status: 'active' },
      { pid: 'CHY1005', title: 'Introduction to Computational Chemistry', description: 'Molecular modelling, quantum chemical calculations, and computational tools.', category: 'Chemistry', subcategory: 'Computational Chemistry', level: 'Intermediate', instructor: 'Dr. Anjali Verma', price: 499, original_price: 799, discount: 38, image: IMG.chem, rating: 4.3, review_count: 40, modules_count: 3, notes_count: 80, hours: 16, tags: ['chemistry', 'molecular modelling', 'computation'], status: 'active' },
      { pid: 'CHY1006', title: 'Environmental Sustainability', description: 'Ecosystems, pollution, renewable energy, climate change, and sustainable development goals.', category: 'Chemistry', subcategory: 'Environmental Science', level: 'Beginner', instructor: 'Dr. Anjali Verma', price: 499, original_price: 799, discount: 38, image: IMG.chem, rating: 4.4, review_count: 55, modules_count: 5, notes_count: 110, hours: 22, tags: ['environment', 'sustainability', 'chemistry'], status: 'active' },
      { pid: 'CHY1007', title: 'Forensic Chemistry and Applications', description: 'Analytical techniques for forensic investigation — drug analysis, toxicology, and DNA forensics.', category: 'Chemistry', subcategory: 'Forensic Science', level: 'Intermediate', instructor: 'Dr. Anjali Verma', price: 499, original_price: 799, discount: 38, image: IMG.chem, rating: 4.4, review_count: 45, modules_count: 5, notes_count: 115, hours: 22, tags: ['forensics', 'chemistry', 'analytical'], status: 'active' },

      // ── Electrical & Electronics ──────────────────────────────────────────────
      { pid: 'EEE1001', title: 'Electric Circuits and Systems', description: "KVL, KCL, network theorems, AC circuits, resonance, and two-port networks.", category: 'Electrical Engineering', subcategory: 'Circuit Theory', level: 'Beginner', instructor: 'Prof. Deepak Verma', price: 499, original_price: 799, discount: 38, image: IMG.elec2, rating: 4.5, review_count: 72, modules_count: 5, notes_count: 130, hours: 26, tags: ['electrical', 'circuits', 'eng'], status: 'active' },
      { pid: 'EEE2001', title: 'Network Analysis', description: 'Advanced circuit analysis — network theorems, AC analysis, two-port networks, and Laplace applications.', category: 'Electrical Engineering', subcategory: 'Network Theory', level: 'Intermediate', instructor: 'Prof. Deepak Verma', price: 499, original_price: 799, discount: 38, image: IMG.elec2, rating: 4.4, review_count: 52, modules_count: 5, notes_count: 120, hours: 24, tags: ['electrical', 'network', 'circuits'], status: 'active' },
      { pid: 'EAC1002', title: 'Analog Electronics', description: 'Diode circuits, BJTs, FETs, op-amps, and oscillators — analog circuit design fundamentals.', category: 'Electronics', subcategory: 'Analog Circuits', level: 'Intermediate', instructor: 'Prof. Kiran Rao', price: 499, original_price: 799, discount: 38, image: IMG.elec, rating: 4.4, review_count: 48, modules_count: 5, notes_count: 120, hours: 24, tags: ['electronics', 'analog', 'circuits'], status: 'active' },
      { pid: 'ECE2002', title: 'Digital Logic Design', description: 'Boolean algebra, combinational and sequential circuits, and programmable logic devices.', category: 'Electronics', subcategory: 'Digital Electronics', level: 'Intermediate', instructor: 'Prof. Kiran Rao', price: 499, original_price: 799, discount: 38, image: IMG.elec, rating: 4.7, review_count: 92, modules_count: 5, notes_count: 145, hours: 28, tags: ['digital logic', 'electronics', 'circuits'], featured: true, status: 'active' },
      { pid: 'ECE2003', title: 'Signals and Systems', description: 'Continuous and discrete signals, Fourier transform, Laplace transform, and Z-transform.', category: 'Electronics', subcategory: 'Signal Processing', level: 'Intermediate', instructor: 'Prof. Kiran Rao', price: 499, original_price: 799, discount: 38, image: IMG.elec, rating: 4.6, review_count: 75, modules_count: 5, notes_count: 135, hours: 27, tags: ['signals', 'electronics', 'fourier'], status: 'active' },
      { pid: 'ECE3004', title: 'Microprocessors and Microcontrollers', description: '8085/8086 architecture, assembly programming, and embedded systems design.', category: 'Electronics', subcategory: 'Embedded Systems', level: 'Advanced', instructor: 'Prof. Kiran Rao', price: 499, original_price: 799, discount: 38, image: IMG.elec, rating: 4.5, review_count: 62, modules_count: 5, notes_count: 128, hours: 25, tags: ['microprocessors', 'embedded', 'electronics'], status: 'active' },

      // ── Mechanical ────────────────────────────────────────────────────────────
      { pid: 'MEE2014', title: 'Engineering Design and Modelling', description: 'Engineering drawing, CAD modelling, design thinking, and product lifecycle.', category: 'Mechanical Engineering', subcategory: 'Engineering Design', level: 'Intermediate', instructor: 'Prof. Arun Pandey', price: 499, original_price: 799, discount: 38, image: IMG.mech, rating: 4.5, review_count: 60, modules_count: 5, notes_count: 120, hours: 24, tags: ['mechanical', 'design', 'cad'], status: 'active' },

      // ── Computer Science ──────────────────────────────────────────────────────
      { pid: 'CSE1021', title: 'Introduction to Problem Solving and Programming', description: 'Problem-solving, flowcharts, pseudocode, and C/Python programming fundamentals.', category: 'Computer Science', subcategory: 'Programming Fundamentals', level: 'Beginner', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs, rating: 4.6, review_count: 82, modules_count: 5, notes_count: 130, hours: 26, tags: ['programming', 'cs', 'python'], status: 'active' },
      { pid: 'CSE2001', title: 'Object Oriented Programming with C++', description: 'Classes, inheritance, polymorphism, templates, STL, and OOP design in C++.', category: 'Computer Science', subcategory: 'Object-Oriented Programming', level: 'Intermediate', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs3, rating: 4.8, review_count: 105, modules_count: 5, notes_count: 155, hours: 30, tags: ['cs', 'cpp', 'oop'], featured: true, bestseller: true, status: 'active' },
      { pid: 'CSE2002', title: 'Data Structures and Algorithms', description: 'Arrays, linked lists, trees, graphs, and sorting algorithms with complexity analysis.', category: 'Computer Science', subcategory: 'Data Structures', level: 'Intermediate', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs2, rating: 4.8, review_count: 115, modules_count: 5, notes_count: 160, hours: 32, tags: ['cs', 'data structures', 'algorithms'], featured: true, bestseller: true, status: 'active' },
      { pid: 'CSE2003', title: 'Computer Architecture and Organization', description: 'Processor design, memory hierarchy, pipelining, and I/O organization.', category: 'Computer Science', subcategory: 'Computer Architecture', level: 'Intermediate', instructor: 'Prof. Sunil Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cs, rating: 4.5, review_count: 68, modules_count: 6, notes_count: 135, hours: 27, tags: ['cs', 'architecture', 'hardware'], status: 'active' },
      { pid: 'CSE2004', title: 'Theory of Computation and Compiler Design', description: 'Automata, formal languages, Turing machines, and compiler phases.', category: 'Computer Science', subcategory: 'Theory of Computation', level: 'Advanced', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs6, rating: 4.5, review_count: 58, modules_count: 5, notes_count: 130, hours: 26, tags: ['cs', 'automata', 'compilers'], status: 'active' },
      { pid: 'CSE2006', title: 'Programming in Java', description: 'Java OOP, collections, exception handling, multithreading, JDBC, and GUI.', category: 'Computer Science', subcategory: 'Java Programming', level: 'Intermediate', instructor: 'Prof. Priya Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cs, rating: 4.6, review_count: 80, modules_count: 5, notes_count: 140, hours: 28, tags: ['cs', 'java', 'oop'], status: 'active' },
      { pid: 'CSE3001', title: 'Database Management Systems', description: 'Relational model, SQL, normalization, transaction management, and indexing.', category: 'Computer Science', subcategory: 'Databases', level: 'Intermediate', instructor: 'Prof. Sunita Gupta', price: 499, original_price: 799, discount: 38, image: IMG.cs5, rating: 4.7, review_count: 95, modules_count: 5, notes_count: 150, hours: 30, tags: ['cs', 'database', 'sql'], bestseller: true, status: 'active' },
      { pid: 'CSE3003', title: 'Operating Systems', description: 'Process management, CPU scheduling, memory management, and file systems.', category: 'Computer Science', subcategory: 'Operating Systems', level: 'Advanced', instructor: 'Dr. Vikram Singh', price: 499, original_price: 799, discount: 38, image: IMG.cs4, rating: 4.7, review_count: 98, modules_count: 5, notes_count: 155, hours: 30, tags: ['cs', 'operating systems', 'processes'], bestseller: true, status: 'active' },
      { pid: 'CSE3004', title: 'Design and Analysis of Algorithms', description: 'Divide and conquer, dynamic programming, greedy, and NP-completeness.', category: 'Computer Science', subcategory: 'Algorithms', level: 'Advanced', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs6, rating: 4.6, review_count: 72, modules_count: 5, notes_count: 140, hours: 28, tags: ['cs', 'algorithms', 'dp'], status: 'active' },
      { pid: 'CSE3011', title: 'Python Programming', description: 'Python fundamentals, OOP, file handling, NumPy, Pandas, and Matplotlib.', category: 'Computer Science', subcategory: 'Python Programming', level: 'Intermediate', instructor: 'Prof. Priya Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cs3, rating: 4.7, review_count: 100, modules_count: 5, notes_count: 148, hours: 29, tags: ['cs', 'python', 'data science'], featured: true, status: 'active' },
      { pid: 'CSE3015', title: 'AWS Cloud Practitioner', description: 'AWS cloud concepts, core services, security, billing, and Well-Architected Framework.', category: 'Computer Science', subcategory: 'Cloud Computing', level: 'Intermediate', instructor: 'Prof. Priya Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cloud, rating: 4.6, review_count: 65, modules_count: 5, notes_count: 130, hours: 25, tags: ['cs', 'cloud', 'aws'], status: 'active' },
      { pid: 'CSE4001', title: 'Internet and Web Programming', description: 'HTML5, CSS3, JavaScript, server-side programming, REST APIs, and web security.', category: 'Computer Science', subcategory: 'Web Development', level: 'Advanced', instructor: 'Prof. Priya Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cs, rating: 4.6, review_count: 70, modules_count: 5, notes_count: 138, hours: 27, tags: ['cs', 'web', 'javascript'], status: 'active' },
      { pid: 'CSA2001', title: 'Fundamentals in AI and ML', description: 'AI agents, search algorithms, machine learning, and neural network fundamentals.', category: 'Computer Science', subcategory: 'Artificial Intelligence', level: 'Intermediate', instructor: 'Dr. Amit Singh', price: 499, original_price: 799, discount: 38, image: IMG.ai, rating: 4.7, review_count: 88, modules_count: 5, notes_count: 148, hours: 29, tags: ['cs', 'ai', 'machine learning'], featured: true, status: 'active' },
      { pid: 'CCA2002', title: 'Cloud Architecture and Services', description: 'Cloud fundamentals, AWS services, microservices, DevOps, and cloud security.', category: 'Computer Science', subcategory: 'Cloud Architecture', level: 'Intermediate', instructor: 'Prof. Sunil Sharma', price: 499, original_price: 799, discount: 38, image: IMG.cloud, rating: 4.5, review_count: 55, modules_count: 5, notes_count: 125, hours: 25, tags: ['cs', 'cloud', 'devops'], status: 'active' },
      { pid: 'CSD1001', title: 'Principles of Digital Forensics', description: 'Digital evidence, file system analysis, network forensics, and legal frameworks.', category: 'Computer Science', subcategory: 'Cyber Security', level: 'Intermediate', instructor: 'Dr. Neha Singh', price: 499, original_price: 799, discount: 38, image: IMG.sec, rating: 4.6, review_count: 62, modules_count: 5, notes_count: 128, hours: 25, tags: ['cs', 'forensics', 'security'], status: 'active' },
      { pid: 'CSD3009', title: 'Data Structures and Analysis of Algorithms', description: 'Advanced data structures — trees, graphs, dynamic programming, and greedy algorithms.', category: 'Computer Science', subcategory: 'Data Structures', level: 'Advanced', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs2, rating: 4.8, review_count: 108, modules_count: 5, notes_count: 158, hours: 31, tags: ['cs', 'data structures', 'algorithms'], featured: true, status: 'active' },
      { pid: 'CDS3005', title: 'Foundations of Data Science', description: 'Data science workflows, statistics, wrangling, ML, and visualization with Python.', category: 'Computer Science', subcategory: 'Data Science', level: 'Advanced', instructor: 'Dr. Amit Singh', price: 499, original_price: 799, discount: 38, image: IMG.ai, rating: 4.7, review_count: 85, modules_count: 5, notes_count: 145, hours: 28, tags: ['cs', 'data science', 'ml'], featured: true, status: 'active' },
      { pid: 'CSG2006', title: 'Game Programming using Unity', description: 'Unity engine, C# scripting, physics, animation, and game publishing.', category: 'Computer Science', subcategory: 'Game Development', level: 'Intermediate', instructor: 'Prof. Sunil Sharma', price: 499, original_price: 799, discount: 38, image: IMG.game, rating: 4.6, review_count: 68, modules_count: 5, notes_count: 130, hours: 26, tags: ['cs', 'game dev', 'unity'], status: 'active' },
      { pid: 'PLA1004', title: 'Competitive Coding Practice', description: 'Algorithms and data structures for competitive programming and coding interviews.', category: 'Computer Science', subcategory: 'Competitive Programming', level: 'Advanced', instructor: 'Dr. Rajesh Kumar', price: 499, original_price: 799, discount: 38, image: IMG.cs6, rating: 4.8, review_count: 120, modules_count: 5, notes_count: 160, hours: 32, tags: ['cs', 'algorithms', 'competitive'], featured: true, bestseller: true, status: 'active' },
    ];

    let seeded = 0;
    for (const c of coursesData) {
      await supabase.schema('business').from('courses').upsert(
        { ...c, created_by: req.user.id },
        { onConflict: 'pid' }
      );
      seeded++;
    }

    return res.status(201).json({
      status: 'success',
      message: `Seeded ${seeded} courses`,
      data: { count: seeded, pids: coursesData.map(c => c.pid) },
    });
  } catch (err) {
    console.error('seedCourses error:', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to seed courses', error: err.message });
  }
};
