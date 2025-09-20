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

    // Get courses by their IDs - separate queries to avoid ObjectId casting issues
    const courses = [];

    // First try to find by PID (strings)
    const pidCourses = await Course.find({
      pid: { $in: user.purchasedCourses },
      status: 'active'
    })
    .populate('createdBy', 'username fullName')
    .sort({ createdAt: -1 });

    courses.push(...pidCourses);

    // Then try to find by _id (ObjectIds) - filter out any that were already found by PID
    const foundPids = pidCourses.map(c => c.pid);
    const remainingIds = user.purchasedCourses.filter(id => !foundPids.includes(id));

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

          courses.push(...idCourses);
        } catch (error) {
          console.warn('Error querying courses by ObjectId:', error.message);
        }
      }
    }

    // Import Order model for payment details
    const Order = (await import('../models/orderModel.js')).default;

    // Get payment details for each course
    const coursesWithPaymentInfo = await Promise.all(
      courses.map(async (course) => {
        try {
          // Find the order for this course by user and courseId
          const order = await Order.findOne({
            user: userId,
            $or: [
              { courseId: course.pid }, // For single course orders
              { 'items.courseId': course.pid } // For cart orders
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
              const courseItem = order.items.find(item => item.courseId === course.pid);
              if (courseItem) {
                courseAmount = courseItem.amount;
              }
            }

            return {
              ...course.toObject(),
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
            return {
              ...course.toObject(),
              paymentInfo: null
            };
          }
        } catch (error) {
          console.warn(`Error fetching payment info for course ${course.pid}:`, error.message);
          return {
            ...course.toObject(),
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
          { title: 'Introduction to Data Structures', topics: 'Arrays, Linked Lists, Stacks, Queues' },
          { title: 'Trees and Graphs', topics: 'Binary Trees, BST, AVL Trees, Graph Algorithms' },
          { title: 'Sorting Algorithms', topics: 'Quick Sort, Merge Sort, Heap Sort' },
          { title: 'Dynamic Programming', topics: 'Memoization, Tabulation, Common DP Problems' }
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
          { title: 'HTML & CSS Fundamentals', topics: 'Semantic HTML, CSS Grid, Flexbox, Responsive Design' },
          { title: 'JavaScript Essentials', topics: 'ES6+, DOM Manipulation, Async Programming' },
          { title: 'React Development', topics: 'Components, Hooks, State Management, Routing' },
          { title: 'Backend with Node.js', topics: 'Express, REST APIs, Authentication, Database Integration' }
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
          { title: 'ML Fundamentals', topics: 'What is ML, Types of Learning, Applications' },
          { title: 'Supervised Learning', topics: 'Linear Regression, Logistic Regression, Decision Trees' },
          { title: 'Unsupervised Learning', topics: 'K-Means, PCA, Anomaly Detection' },
          { title: 'Neural Networks', topics: 'Perceptrons, Backpropagation, Deep Learning Basics' }
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
          { title: 'SQL Fundamentals', topics: 'DDL, DML, DCL, Joins, Subqueries' },
          { title: 'Database Design', topics: 'ER Diagrams, Normalization, Indexing' },
          { title: 'Advanced SQL', topics: 'Stored Procedures, Triggers, Views' },
          { title: 'NoSQL Databases', topics: 'MongoDB, Document Stores, Key-Value Stores' }
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
          { title: 'OS Basics', topics: 'Structure, Processes, Threads' },
          { title: 'Memory Management', topics: 'Paging, Segmentation, Virtual Memory' },
          { title: 'File Systems', topics: 'File Organization, Directory Structure, Protection' },
          { title: 'Concurrency', topics: 'Synchronization, Deadlocks, Race Conditions' }
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
          { title: 'Network Fundamentals', topics: 'OSI, TCP/IP, LAN, WAN' },
          { title: 'Routing', topics: 'RIP, OSPF, BGP' },
          { title: 'Transport Layer', topics: 'TCP, UDP, Congestion Control' },
          { title: 'Network Security', topics: 'Encryption, Firewalls, VPNs' }
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
          { title: 'Limits and Continuity', topics: 'Limits, Continuity, Intermediate Value Theorem' },
          { title: 'Differentiation', topics: 'Derivatives, Chain Rule, Implicit Differentiation' },
          { title: 'Integration', topics: 'Definite and Indefinite Integrals, Techniques of Integration' },
          { title: 'Series and Sequences', topics: 'Power Series, Taylor Series, Convergence Tests' }
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
          { title: 'Basic Concepts', topics: 'Structure, Bonding, Isomerism' },
          { title: 'Hydrocarbons', topics: 'Alkanes, Alkenes, Alkynes, Aromatic Compounds' },
          { title: 'Functional Groups', topics: 'Alcohols, Phenols, Ethers, Carboxylic Acids' },
          { title: 'Reaction Mechanisms', topics: 'SN1, SN2, E1, E2, Addition, Elimination' }
        ],
        tags: ['organic chemistry', 'reactions', 'mechanisms', 'laboratory', 'compounds']
      }
    ];

    console.log('🌱 Starting course seeding process...');

    // Clear existing courses
    await Course.deleteMany({});
    console.log('🧹 Cleared existing courses');

    // Add creator information
    const coursesWithCreator = coursesData.map(course => ({
      ...course,
      createdBy: req.user._id,
      updatedBy: req.user._id
    }));

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
