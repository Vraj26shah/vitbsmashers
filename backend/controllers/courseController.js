import Course from '../models/course.model.js';
import AppError from '../utils/appError.js';
import User from '../models/user.model.js';

// Get all courses with filtering and pagination
export const getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      level,
      priceRange,
      rating,
      search,
      sort = '-createdAt',
      featured,
      bestseller
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (level) filter.level = level;
    if (featured === 'true') filter.featured = true;
    if (bestseller === 'true') filter.bestseller = true;

    // Price range filter
    if (priceRange) {
      if (priceRange === 'free') {
        filter.price = 0;
      } else if (priceRange === 'under-500') {
        filter.price = { $lt: 500 };
      } else if (priceRange === '500-1000') {
        filter.price = { $gte: 500, $lte: 1000 };
      } else if (priceRange === 'over-1000') {
        filter.price = { $gt: 1000 };
      }
    }

    // Rating filter
    if (rating) {
      filter.rating = { $gte: parseFloat(rating) };
    }

    // Search functionality
    if (search) {
      filter.$text = { $search: search };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    let sortObj = {};
    if (sort === 'price_asc') sortObj.price = 1;
    else if (sort === 'price_desc') sortObj.price = -1;
    else if (sort === 'rating') sortObj.rating = -1;
    else if (sort === 'newest') sortObj.createdAt = -1;
    else if (sort === 'popular') sortObj.reviewCount = -1;
    else sortObj[sort.replace('-', '')] = sort.startsWith('-') ? -1 : 1;

    // Execute query
    const courses = await Course.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username fullName');

    // Get total count for pagination
    const total = await Course.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      results: courses.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCourses: total,
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      },
      data: {
        courses
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch courses'
    });
  }
};

// Get single course by ID or PID
export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by PID first, then by MongoDB _id
    let course = await Course.findOne({ pid: id.toUpperCase() });

    if (!course) {
      course = await Course.findById(id);
    }

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    // Check if course is active
    if (course.status !== 'active') {
      return res.status(404).json({
        status: 'error',
        message: 'Course not available'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch course'
    });
  }
};

// Create new course (Admin only)
export const createCourse = async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      createdBy: req.user._id,
      pid: req.body.pid || generatePID(req.body.category)
    };

    // Validate PID uniqueness
    const existingCourse = await Course.findOne({ pid: courseData.pid });
    if (existingCourse) {
      return res.status(400).json({
        status: 'error',
        message: 'Product ID already exists',
        errors: { pid: 'This PID is already taken' }
      });
    }

    const course = await Course.create(courseData);

    res.status(201).json({
      status: 'success',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Create course error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        status: 'error',
        message: 'Course validation failed',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Duplicate data found',
        errors: { pid: 'This Product ID is already registered' }
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create course'
    });
  }
};

// Update course (Admin only)
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedBy: req.user._id };

    // Prevent PID updates if it's being changed
    if (updateData.pid) {
      const existingCourse = await Course.findOne({
        pid: updateData.pid,
        _id: { $ne: id }
      });
      if (existingCourse) {
        return res.status(400).json({
          status: 'error',
          message: 'Product ID already exists',
          errors: { pid: 'This PID is already taken' }
        });
      }
    }

    const course = await Course.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Update course error:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (let field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        status: 'error',
        message: 'Course validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update course'
    });
  }
};

// Delete course (Admin only)
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Course archived successfully',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete course'
    });
  }
};

// Get featured courses
export const getFeaturedCourses = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const courses = await Course.getFeatured(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: courses.length,
      data: {
        courses
      }
    });
  } catch (error) {
    console.error('Get featured courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured courses'
    });
  }
};

// Get courses by category
export const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const courses = await Course.getByCategory(category, parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: courses.length,
      data: {
        courses
      }
    });
  } catch (error) {
    console.error('Get courses by category error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch courses by category'
    });
  }
};

// Search courses
export const searchCourses = async (req, res) => {
  try {
    const { q: query } = req.query;
    const { limit = 20, ...filters } = req.query;

    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }

    const courses = await Course.search(query, filters, parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: courses.length,
      data: {
        courses
      }
    });
  } catch (error) {
    console.error('Search courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search courses'
    });
  }
};

// Get course categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Course.distinct('category', { status: 'active' });

    // Get subcategories for each category
    const categoryData = await Promise.all(
      categories.map(async (category) => {
        const subcategories = await Course.distinct('subcategory', {
          status: 'active',
          category
        });
        const count = await Course.countDocuments({
          status: 'active',
          category
        });

        return {
          name: category,
          subcategories,
          count
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        categories: categoryData
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories'
    });
  }
};

// Get course statistics
export const getCourseStats = async (req, res) => {
  try {
    const stats = await Course.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: '$reviewCount' },
          featuredCount: {
            $sum: { $cond: ['$featured', 1, 0] }
          },
          bestsellerCount: {
            $sum: { $cond: ['$bestseller', 1, 0] }
          }
        }
      }
    ]);

    const categoryStats = await Course.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          averageRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overall: stats[0] || {},
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch course statistics'
    });
  }
};

// Generate unique PID
function generatePID(category) {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${categoryCode}${timestamp}${random}`;
}

// Bulk operations (Admin only)
export const bulkUpdateCourses = async (req, res) => {
  try {
    const { courseIds, updates } = req.body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Course IDs array is required'
      });
    }

    const result = await Course.updateMany(
      { _id: { $in: courseIds } },
      { ...updates, updatedBy: req.user._id, updatedAt: Date.now() }
    );

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} courses updated successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });
  } catch (error) {
    console.error('Bulk update courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to bulk update courses'
    });
  }
};

// Get user's purchased courses
export const getUserPurchasedCourses = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with purchased courses
    const user = await User.findById(userId).select('purchasedCourses');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.purchasedCourses || user.purchasedCourses.length === 0) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: {
          courses: []
        }
      });
    }

    const normalizeCourseId = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };

    const purchasedCourseIds = user.purchasedCourses
      .map(normalizeCourseId)
      .filter(Boolean);

    // Get courses by their IDs - separate queries to avoid ObjectId casting issues
    const courses = [];

    // First try to find by PID (strings)
    const pidCourses = await Course.find({
      pid: { $in: purchasedCourseIds },
      status: 'active'
    })
    .populate('createdBy', 'username fullName')
    .sort({ createdAt: -1 });

    courses.push(...pidCourses);

    // Then try to find by _id (ObjectIds) - filter out any that were already found by PID
    const foundPidSet = new Set(pidCourses.map(course => normalizeCourseId(course.pid)));
    const remainingIds = purchasedCourseIds.filter(id => !foundPidSet.has(id));

    if (remainingIds.length > 0) {
      // Only try ObjectId conversion for remaining IDs that look like ObjectIds
      const objectIdCandidates = remainingIds.filter(id => {
        return typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]+$/.test(id);
      });

      if (objectIdCandidates.length > 0) {
        try {
          const idCourses = await Course.find({
            _id: { $in: objectIdCandidates },
            status: 'active'
          })
          .populate('createdBy', 'username fullName')
          .sort({ createdAt: -1 });

          const existingCourseIds = new Set(courses.map(course => normalizeCourseId(course._id)));
          idCourses.forEach((course) => {
            const normalizedDbId = normalizeCourseId(course._id);
            if (!existingCourseIds.has(normalizedDbId)) {
              courses.push(course);
              existingCourseIds.add(normalizedDbId);
            }
          });
        } catch (error) {
          console.warn('Error querying courses by ObjectId:', error.message);
        }
      }
    }

    // Import Order model for payment details
    const Order = (await import('../models/orderModel.js')).default;

    // For purchased courses not found in database, create dummy course objects
    const foundCourseKeys = new Set();
    courses.forEach((course) => {
      const normalizedPid = normalizeCourseId(course.pid);
      const normalizedDbId = normalizeCourseId(course._id);

      if (normalizedPid) foundCourseKeys.add(normalizedPid);
      if (normalizedDbId) foundCourseKeys.add(normalizedDbId);
    });

    const missingCourseIds = purchasedCourseIds.filter(id => !foundCourseKeys.has(id));

    const dummyCourses = missingCourseIds.map(courseId => ({
      _id: courseId,
      pid: courseId,
      title: `Course ${courseId}`,
      description: `This course (${courseId}) was purchased but complete details are not available in the database. Please contact support if this issue persists.`,
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      price: 0,
      rating: 0,
      modules: [],
      createdBy: null
    }));

    courses.push(...dummyCourses);

    // Get payment details for each course
    const coursesWithPaymentInfo = await Promise.all(
      courses.map(async (course) => {
        try {
          const coursePid = normalizeCourseId(course.pid);
          const courseDbId = normalizeCourseId(course._id);

          // Find the order for this course by user and courseId
          const order = await Order.findOne({
            user: userId,
            $or: [
              { courseId: { $in: [coursePid, courseDbId].filter(Boolean) } }, // For single course orders
              { 'items.courseId': { $in: [coursePid, courseDbId].filter(Boolean) } } // For cart orders
            ],
            status: 'completed'
          }).sort({ createdAt: -1 }); // Get the most recent order

          if (order) {
            // Determine payment gateway used
            let gateway = 'unknown';
            if (order.razorpayOrderId) gateway = 'razorpay';
            else if (order.phonepeOrderId) gateway = 'phonepe';
            else if (order.mockOrderId || order.mockPaymentId) gateway = 'mock';

            // Get amount for this specific course (for cart orders)
            let courseAmount = order.amount;
            if (order.items && order.items.length > 0) {
              const courseItem = order.items.find(item => {
                const itemCourseId = normalizeCourseId(item.courseId);
                return itemCourseId === coursePid || itemCourseId === courseDbId;
              });
              if (courseItem) {
                courseAmount = courseItem.amount;
              }
            }

            const courseData = typeof course.toObject === 'function' ? course.toObject() : course;
            return {
              ...courseData,
              paymentInfo: {
                orderId: order._id,
                purchaseDate: order.createdAt,
                amount: courseAmount,
                gateway: gateway,
                status: order.status,
                paymentId: order.razorpayPaymentId || order.mockPaymentId || null
              }
            };
          } else {
            // No order found, return course without payment info
            const courseData = typeof course.toObject === 'function' ? course.toObject() : course;
            return {
              ...courseData,
              paymentInfo: null
            };
          }
        } catch (error) {
          console.warn(`Error fetching payment info for course ${course.pid}:`, error.message);
          const courseData = typeof course.toObject === 'function' ? course.toObject() : course;
          return {
            ...courseData,
            paymentInfo: null
          };
        }
      })
    );

    res.status(200).json({
      status: 'success',
      results: coursesWithPaymentInfo.length,
      data: {
        courses: coursesWithPaymentInfo
      }
    });
  } catch (error) {
    console.error('Get user purchased courses error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch purchased courses'
    });
  }
};

// Seed courses with sample data (Admin only)
export const seedCourses = async (req, res) => {
  try {
    const coursesData = [
      {
        pid: 'CSE001',
        title: 'Data Structures & Algorithms',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1299,
        rating: 4.9,
        modules: 12,
        hours: 45,
        notes: 220,
        description: 'Master fundamental data structures and algorithms with comprehensive coverage of arrays, linked lists, trees, graphs, sorting, and searching algorithms.',
        category: 'Computer Science',
        subcategory: 'Data Structures',
        level: 'Intermediate',
        instructor: 'Dr. Rajesh Kumar',
        modulesList: [
          { title: 'Module 1', topics: 'Arrays, linked lists, stacks, queues, and time complexity analysis' },
          { title: 'Module 2', topics: 'Trees, BST, AVL trees, heaps, and graph representation' },
          { title: 'Module 3', topics: 'Sorting algorithms including bubble, merge, quick, and heap sort' },
          { title: 'Module 4', topics: 'Searching, hashing, collision handling, and traversal techniques' },
          { title: 'Module 5', topics: 'Dynamic programming, greedy algorithms, and important exam patterns' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'VIT semester questions on stacks, queues, and linked lists' },
          { title: 'PYQ Set 2', topics: 'Tree traversals, graph problems, and hashing-based questions' }
        ],
        referenceBooks: [
          'Data Structures and Algorithms Made Easy by Narasimha Karumanchi',
          'Introduction to Algorithms by Cormen, Leiserson, Rivest, and Stein'
        ],
        tags: ['data structures', 'algorithms', 'programming', 'computer science'],
        featured: true,
        bestseller: true
      },
      {
        pid: 'CSE002',
        title: 'Web Development Bootcamp',
        image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1499,
        rating: 4.8,
        modules: 16,
        hours: 60,
        notes: 280,
        description: 'Complete full-stack web development course covering HTML, CSS, JavaScript, React, Node.js, Express, and MongoDB.',
        category: 'Computer Science',
        subcategory: 'Web Development',
        level: 'Beginner',
        instructor: 'Prof. Priya Sharma',
        modulesList: [
          { title: 'Module 1', topics: 'HTML structure, semantic tags, CSS basics, flexbox, and grid' },
          { title: 'Module 2', topics: 'JavaScript fundamentals, DOM events, forms, and asynchronous flows' },
          { title: 'Module 3', topics: 'React components, props, state, hooks, and routing' },
          { title: 'Module 4', topics: 'Node.js, Express, REST APIs, middleware, and authentication' },
          { title: 'Module 5', topics: 'MongoDB integration, deployment workflow, and project revision' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Frontend layout, CSS, and JavaScript DOM questions' },
          { title: 'PYQ Set 2', topics: 'React lifecycle, Express API design, and MongoDB integration questions' }
        ],
        referenceBooks: [
          'Eloquent JavaScript by Marijn Haverbeke',
          'Learning React by Alex Banks and Eve Porcello'
        ],
        tags: ['web development', 'javascript', 'react', 'node.js', 'full-stack'],
        featured: true
      },
      {
        pid: 'CSE003',
        title: 'Machine Learning Fundamentals',
        image: 'https://images.unsplash.com/photo-1581094794329-16d1f0d22b6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1899,
        rating: 4.7,
        modules: 14,
        hours: 55,
        notes: 260,
        description: 'Learn machine learning from basics to advanced concepts including supervised and unsupervised learning, neural networks, and practical applications.',
        category: 'Computer Science',
        subcategory: 'Machine Learning',
        level: 'Intermediate',
        instructor: 'Dr. Amit Singh',
        modulesList: [
          { title: 'Module 1', topics: 'Machine learning basics, workflow, evaluation metrics, and applications' },
          { title: 'Module 2', topics: 'Linear regression, logistic regression, and decision trees' },
          { title: 'Module 3', topics: 'Clustering, PCA, dimensionality reduction, and anomaly detection' },
          { title: 'Module 4', topics: 'Neural networks, backpropagation, and deep learning foundations' },
          { title: 'Module 5', topics: 'Model tuning, practical case studies, and exam-focused problem solving' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Regression, classification, and confusion matrix questions' },
          { title: 'PYQ Set 2', topics: 'Clustering, PCA, and neural network short notes' }
        ],
        referenceBooks: [
          'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow by Aurelien Geron',
          'Pattern Recognition and Machine Learning by Christopher Bishop'
        ],
        tags: ['machine learning', 'ai', 'data science', 'python', 'neural networks'],
        featured: true
      },
      {
        pid: 'CSE004',
        title: 'Database Management Systems',
        image: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1199,
        rating: 4.6,
        modules: 10,
        hours: 40,
        notes: 200,
        description: 'Comprehensive database course covering SQL, NoSQL, normalization, indexing, transactions, and database design principles.',
        category: 'Computer Science',
        subcategory: 'Databases',
        level: 'Intermediate',
        instructor: 'Prof. Sunita Gupta',
        modulesList: [
          { title: 'Module 1', topics: 'DBMS basics, relational model, keys, and SQL introduction' },
          { title: 'Module 2', topics: 'DDL, DML, joins, subqueries, and SQL query writing' },
          { title: 'Module 3', topics: 'ER diagrams, normalization, schema design, and constraints' },
          { title: 'Module 4', topics: 'Transactions, concurrency control, indexing, and recovery' },
          { title: 'Module 5', topics: 'Stored procedures, triggers, views, and NoSQL fundamentals' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Normalization, SQL joins, and transaction scheduling questions' },
          { title: 'PYQ Set 2', topics: 'ER modeling, indexing, and recovery mechanism questions' }
        ],
        referenceBooks: [
          'Database System Concepts by Silberschatz, Korth, and Sudarshan',
          'Fundamentals of Database Systems by Elmasri and Navathe'
        ],
        tags: ['database', 'sql', 'nosql', 'mongodb', 'data management'],
        bestseller: true
      },
      {
        pid: 'CSE005',
        title: 'Operating Systems',
        image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1399,
        rating: 4.5,
        modules: 11,
        hours: 42,
        notes: 210,
        description: 'Deep dive into operating systems concepts including process management, memory management, file systems, and concurrency.',
        category: 'Computer Science',
        subcategory: 'Operating Systems',
        level: 'Advanced',
        instructor: 'Dr. Vikram Singh',
        modulesList: [
          { title: 'Module 1', topics: 'Operating system structure, services, processes, and threads' },
          { title: 'Module 2', topics: 'CPU scheduling, process coordination, and synchronization' },
          { title: 'Module 3', topics: 'Deadlocks, prevention techniques, and resource allocation' },
          { title: 'Module 4', topics: 'Paging, segmentation, virtual memory, and memory policies' },
          { title: 'Module 5', topics: 'File systems, protection, security, and revision-oriented case studies' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Scheduling algorithms, semaphores, and deadlock questions' },
          { title: 'PYQ Set 2', topics: 'Paging, segmentation, file allocation, and memory management questions' }
        ],
        referenceBooks: [
          'Operating System Concepts by Silberschatz, Galvin, and Gagne',
          'Modern Operating Systems by Andrew S. Tanenbaum'
        ],
        tags: ['operating systems', 'processes', 'memory management', 'concurrency']
      },
      {
        pid: 'CSE006',
        title: 'Computer Networks',
        image: 'https://images.unsplash.com/photo-1596495577886-d920f1fb7238?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1149,
        rating: 4.8,
        modules: 11,
        hours: 38,
        notes: 190,
        description: 'Complete coverage of computer networks from OSI model to TCP/IP, routing, switching, and network security.',
        category: 'Computer Science',
        subcategory: 'Networking',
        level: 'Intermediate',
        instructor: 'Prof. Rohan Mehta',
        modulesList: [
          { title: 'Module 1', topics: 'OSI model, TCP/IP stack, framing, and network devices' },
          { title: 'Module 2', topics: 'Data link layer concepts, switching, MAC protocols, and LANs' },
          { title: 'Module 3', topics: 'IP addressing, subnetting, routing algorithms, and forwarding' },
          { title: 'Module 4', topics: 'TCP, UDP, flow control, congestion control, and socket basics' },
          { title: 'Module 5', topics: 'Network security, firewalls, VPNs, and exam-level troubleshooting' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'OSI layers, subnetting, and routing algorithm questions' },
          { title: 'PYQ Set 2', topics: 'TCP congestion control, switching, and firewall questions' }
        ],
        referenceBooks: [
          'Computer Networking: A Top-Down Approach by Kurose and Ross',
          'Data Communications and Networking by Behrouz A. Forouzan'
        ],
        tags: ['networks', 'osi model', 'tcp/ip', 'routing', 'security']
      },
      {
        pid: 'CSE007',
        title: 'Advanced Calculus',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 999,
        rating: 4.6,
        modules: 8,
        hours: 30,
        notes: 150,
        description: 'Master complex calculus concepts with step-by-step solutions and practical applications in engineering and physics.',
        category: 'Mathematics',
        subcategory: 'Calculus',
        level: 'Advanced',
        instructor: 'Dr. Meera Patel',
        modulesList: [
          { title: 'Module 1', topics: 'Limits, continuity, and standard theorem-based applications' },
          { title: 'Module 2', topics: 'Differentiation, partial derivatives, and tangent-based problems' },
          { title: 'Module 3', topics: 'Indefinite and definite integration with standard techniques' },
          { title: 'Module 4', topics: 'Multiple integrals, applications, and coordinate transformation' },
          { title: 'Module 5', topics: 'Series, convergence, Taylor expansion, and revision exercises' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Limit evaluation, derivative, and maxima-minima questions' },
          { title: 'PYQ Set 2', topics: 'Integration, series expansion, and multivariable calculus questions' }
        ],
        referenceBooks: [
          'Higher Engineering Mathematics by B.S. Grewal',
          'Calculus by James Stewart'
        ],
        tags: ['calculus', 'mathematics', 'integration', 'differentiation', 'series']
      },
      {
        pid: 'CSE008',
        title: 'Organic Chemistry',
        image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: 1099,
        rating: 4.8,
        modules: 9,
        hours: 35,
        notes: 180,
        description: 'Comprehensive coverage of organic chemistry principles, reactions, and mechanisms with laboratory applications.',
        category: 'Science',
        subcategory: 'Chemistry',
        level: 'Intermediate',
        instructor: 'Dr. Anjali Verma',
        modulesList: [
          { title: 'Module 1', topics: 'Organic structure, bonding, resonance, and isomerism basics' },
          { title: 'Module 2', topics: 'Hydrocarbons, aromaticity, and reaction trends' },
          { title: 'Module 3', topics: 'Alcohols, phenols, ethers, and carbonyl compound chemistry' },
          { title: 'Module 4', topics: 'Reaction intermediates, substitution, elimination, and addition mechanisms' },
          { title: 'Module 5', topics: 'Named reactions, lab relevance, and exam-focused organic conversions' }
        ],
        pyqs: [
          { title: 'PYQ Set 1', topics: 'Isomerism, hydrocarbon reactivity, and aromaticity questions' },
          { title: 'PYQ Set 2', topics: 'Named reactions, substitution mechanisms, and conversion questions' }
        ],
        referenceBooks: [
          'Organic Chemistry by Morrison and Boyd',
          'Organic Chemistry by Paula Yurkanis Bruice'
        ],
        tags: ['organic chemistry', 'reactions', 'mechanisms', 'laboratory', 'compounds']
      }
    ];

    console.log('🌱 Starting course seeding process...');

    // Clear existing courses
    await Course.deleteMany({});
    console.log('🧹 Cleared existing courses');

    // Add creator information and fix modules structure
    const coursesWithCreator = coursesData.map(course => {
      // Extract fields, excluding the problematic modules field
      const { modules, modulesList, ...courseFields } = course;
      return {
        ...courseFields,
        modules: modulesList || [], // Use modulesList as modules array
        modulesCount: modulesList ? modulesList.length : modules || 0,
        createdBy: req.user._id,
        updatedBy: req.user._id
      };
    });

    // Insert new courses
    const insertedCourses = await Course.insertMany(coursesWithCreator);

    console.log(`✅ Successfully seeded ${insertedCourses.length} courses!`);

    res.status(201).json({
      status: 'success',
      message: `Successfully seeded ${insertedCourses.length} courses`,
      data: {
        courses: insertedCourses.length,
        categories: [...new Set(insertedCourses.map(c => c.category))],
        sampleCourses: insertedCourses.slice(0, 3).map(c => ({
          pid: c.pid,
          title: c.title,
          price: c.price,
          category: c.category
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error seeding courses:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to seed courses',
      error: error.message
    });
  }
};
