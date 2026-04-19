// Marketplace Controller
import MarketplaceItem from '../models/marketplaceItem.model.js';
import Order from '../models/orderModel.js';
import AppError from '../utils/appError.js';

// Hardcoded course data matching frontend expectations
const hardcodedCourses = {
  1: {
    id: "1",
    title: "Data Structures & Algorithms",
    image: "https://images.unsplash.com/photo-1550439062-609e1531270e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1299,
    rating: 4.9,
    modules: 12,
    hours: 40,
    notes: 200,
    category: "CS",
    description: "Master essential data structures and algorithms with comprehensive notes, solved problems, and exam strategies.",
    modulesList: [
      { title: "Introduction to Data Structures", topics: "Arrays, Linked Lists, Stacks, Queues, Time Complexity Analysis" },
      { title: "Trees and Graphs", topics: "Binary Trees, BST, AVL Trees, Graph Representation, BFS, DFS" },
      { title: "Sorting Algorithms", topics: "Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort" },
      { title: "Searching Algorithms", topics: "Linear Search, Binary Search, Hashing, Collision Resolution" },
      { title: "Dynamic Programming", topics: "Memoization, Tabulation, LCS, Knapsack, Matrix Chain Multiplication" },
      { title: "Greedy Algorithms", topics: "Activity Selection, Huffman Coding, Dijkstra's Algorithm" }
    ]
  },
  2: {
    id: "2",
    title: "Database Management Systems",
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1199,
    rating: 4.8,
    modules: 10,
    hours: 35,
    notes: 180,
    category: "CS",
    description: "Comprehensive DBMS notes covering SQL, normalization, transactions, and advanced database concepts.",
    modulesList: [
      { title: "Database Fundamentals", topics: "Introduction, ER Model, Relational Model" },
      { title: "SQL Queries", topics: "DDL, DML, Joins, Subqueries, Views" },
      { title: "Normalization", topics: "1NF, 2NF, 3NF, BCNF, 4NF, 5NF" },
      { title: "Transaction Management", topics: "ACID Properties, Concurrency Control, Locking" },
      { title: "Indexing and Optimization", topics: "B+ Trees, Hashing, Query Optimization" }
    ]
  },
  3: {
    id: "3",
    title: "Machine Learning Fundamentals",
    image: "https://images.unsplash.com/photo-1581094794329-16d1d0d22b6c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1499,
    rating: 4.9,
    modules: 15,
    hours: 50,
    notes: 250,
    category: "CS",
    description: "From basics to advanced algorithms. Includes Python implementations, case studies, and exam notes.",
    modulesList: [
      { title: "Introduction to ML", topics: "Types of Learning, Applications, Python Setup" },
      { title: "Linear Regression", topics: "Simple & Multiple Regression, Gradient Descent" },
      { title: "Classification Algorithms", topics: "Logistic Regression, Decision Trees, SVM" },
      { title: "Clustering", topics: "K-Means, Hierarchical, DBSCAN" },
      { title: "Neural Networks", topics: "Perceptrons, Backpropagation, Deep Learning" },
      { title: "Model Evaluation", topics: "Cross-Validation, Metrics, Hyperparameter Tuning" }
    ]
  },
  4: {
    id: "4",
    title: "Operating Systems",
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1099,
    rating: 4.7,
    modules: 14,
    hours: 45,
    notes: 220,
    category: "CS",
    description: "Comprehensive notes on processes, threads, memory management, file systems, and security.",
    modulesList: [
      { title: "OS Basics", topics: "Structure, Processes, Threads" },
      { title: "Memory Management", topics: "Paging, Segmentation, Virtual Memory" }
    ]
  },
  5: {
    id: "5",
    title: "Computer Networks",
    image: "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1149,
    rating: 4.8,
    modules: 11,
    hours: 38,
    notes: 190,
    category: "CS",
    description: "Complete notes covering OSI model, TCP/IP, routing, switching, and network security.",
    modulesList: [
      { title: "Network Fundamentals", topics: "OSI, TCP/IP, LAN, WAN" },
      { title: "Routing", topics: "RIP, OSPF, BGP" }
    ]
  },
  6: {
    id: "6",
    title: "Web Development",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1399,
    rating: 4.9,
    modules: 16,
    hours: 60,
    notes: 280,
    category: "CS",
    description: "Full-stack web development notes covering HTML, CSS, JavaScript, React, Node.js and more.",
    modulesList: [
      { title: "Frontend Basics", topics: "HTML, CSS, JavaScript" },
      { title: "Backend Development", topics: "Node.js, Express" }
    ]
  },
  7: {
    id: "7",
    title: "Advanced Calculus",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 999,
    rating: 4.6,
    modules: 8,
    hours: 30,
    notes: 150,
    category: "Math",
    description: "Master complex calculus concepts with step-by-step solutions and practical applications.",
    modulesList: [
      { title: "Limits and Continuity", topics: "Limits, Continuity, Intermediate Value Theorem" },
      { title: "Differentiation", topics: "Derivatives, Chain Rule, Implicit Differentiation" },
      { title: "Integration", topics: "Definite and Indefinite Integrals, Techniques of Integration" }
    ]
  },
  8: {
    id: "8",
    title: "Organic Chemistry",
    image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
    price: 1099,
    rating: 4.8,
    modules: 9,
    hours: 35,
    notes: 180,
    category: "Sciences",
    description: "Comprehensive coverage of organic chemistry principles, reactions, and mechanisms.",
    modulesList: [
      { title: "Basic Concepts", topics: "Structure, Bonding, Isomerism" },
      { title: "Hydrocarbons", topics: "Alkanes, Alkenes, Alkynes, Aromatic Compounds" },
      { title: "Functional Groups", topics: "Alcohols, Phenols, Ethers, Carboxylic Acids" }
    ]
  }
};

export const getItems = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, available } = req.query;

    // Convert hardcoded data to array format
    let items = Object.values(hardcodedCourses);

    // Apply filters
    if (category && category !== 'all') {
      if (category === 'cs') {
        items = items.filter(item => item.category === 'CS');
      } else if (category === 'eng') {
        items = items.filter(item => ['CS', 'Engineering'].includes(item.category));
      } else if (category === 'math') {
        items = items.filter(item => item.category === 'Math');
      } else if (category === 'sci') {
        items = items.filter(item => item.category === 'Sciences');
      }
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      items = items.filter(item => item.price >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      items = items.filter(item => item.price <= max);
    }

    // Also include any database items if they exist
    try {
      const dbItems = await MarketplaceItem.find({})
        .populate('seller', 'username fullName email')
        .sort({ createdAt: -1 })
        .select('-__v');

      // Convert DB items to match frontend format
      const formattedDbItems = dbItems.map(item => ({
        id: item._id.toString(),
        title: item.title,
        image: item.images?.[0] || 'https://images.unsplash.com/photo-1497636577773-f1231844b336?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        price: item.price,
        rating: 4.5, // Default rating for DB items
        modules: 1,
        hours: 10,
        notes: 50,
        category: item.category,
        description: item.description,
        isFromDB: true
      }));

      items = [...items, ...formattedDbItems];
    } catch (dbError) {
      console.log('Database not available, using hardcoded data only');
    }

    res.status(200).json({
      status: 'success',
      results: items.length,
      data: { items }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve marketplace items'
    });
  }
};

export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    // First check hardcoded courses
    let item = hardcodedCourses[id];

    if (item) {
      // Format hardcoded item to match expected structure
      item = {
        id: item.id,
        title: item.title,
        image: item.image,
        price: item.price,
        rating: item.rating,
        modules: item.modules,
        hours: item.hours,
        notes: item.notes,
        category: item.category,
        description: item.description,
        modulesList: item.modulesList,
        isAvailable: true,
        seller: {
          username: 'VITBSmashers',
          fullName: 'VIT Bhopal Academic Team',
          email: 'vitbsmashers@gmail.com'
        }
      };
    } else {
      // Check database
      try {
        item = await MarketplaceItem.findById(id)
          .populate('seller', 'username fullName email')
          .select('-__v');

        if (item) {
          // Format DB item
          item = {
            id: item._id.toString(),
            title: item.title,
            image: item.images?.[0] || 'https://images.unsplash.com/photo-1497636577773-f1231844b336?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            price: item.price,
            rating: 4.5,
            category: item.category,
            description: item.description,
            isAvailable: item.isAvailable,
            seller: item.seller,
            isFromDB: true
          };
        }
      } catch (dbError) {
        console.log('Database not available for item lookup');
      }
    }

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Marketplace item not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve marketplace item'
    });
  }
};

export const createItem = async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      seller: req.user._id
    };

    const item = await MarketplaceItem.create(itemData);

    const populatedItem = await MarketplaceItem.findById(item._id)
      .populate('seller', 'username fullName email')
      .select('-__v');

    res.status(201).json({
      status: 'success',
      data: { item: populatedItem }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid item data'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to create marketplace item'
    });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item exists and belongs to user
    const existingItem = await MarketplaceItem.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    if (existingItem.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own items'
      });
    }

    const item = await MarketplaceItem.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('seller', 'username fullName email')
      .select('-__v');

    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid item data'
      });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid item ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to update marketplace item'
    });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if item exists and belongs to user
    const item = await MarketplaceItem.findById(id);
    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Item not found'
      });
    }

    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own items'
      });
    }

    await MarketplaceItem.findByIdAndDelete(id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid item ID'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete marketplace item'
    });
  }
};

export const purchaseItem = async (req, res) => {
  try {
    const { itemId, paymentMethod } = req.body;
    const buyerId = req.user._id;

    let item = null;
    let isHardcodedCourse = false;

    // Check if it's a hardcoded course
    if (hardcodedCourses[itemId]) {
      item = {
        ...hardcodedCourses[itemId],
        seller: {
          _id: 'vitbsmashers_admin',
          username: 'VITBSmashers',
          fullName: 'VIT Bhopal Academic Team',
          email: 'vitbsmashers@gmail.com'
        },
        isAvailable: true
      };
      isHardcodedCourse = true;
    } else {
      // Check database
      try {
        item = await MarketplaceItem.findById(itemId);
        if (!item) {
          return res.status(404).json({
            status: 'error',
            message: 'Item not found'
          });
        }
      } catch (dbError) {
        return res.status(404).json({
          status: 'error',
          message: 'Item not found'
        });
      }
    }

    if (!item.isAvailable) {
      return res.status(400).json({
        status: 'error',
        message: 'Item is no longer available'
      });
    }

    // For hardcoded courses, we allow purchase. For DB items, check seller
    if (!isHardcodedCourse && item.seller.toString() === buyerId.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'You cannot purchase your own item'
      });
    }

    // For now, we'll handle direct purchases (cash/card in person)
    // In a real app, you'd integrate with payment gateway here
    if (paymentMethod === 'direct') {
      // For hardcoded courses, we don't mark as unavailable since they're always available
      // For DB items, mark as unavailable
      if (!isHardcodedCourse) {
        item.isAvailable = false;
        await item.save();
      }

      // Create an order record
      const orderData = {
        user: buyerId,
        items: [{
          courseId: isHardcodedCourse ? itemId : item._id.toString(),
          title: item.title,
          amount: item.price
        }],
        amount: item.price,
        status: 'completed' // Direct purchase is immediately completed
      };

      let order;
      try {
        order = await Order.create(orderData);
      } catch (dbError) {
        console.log('Database not available for order creation, simulating success');
        // Simulate order creation for demo purposes
        order = {
          _id: 'demo_order_' + Date.now(),
          user: buyerId,
          items: orderData.items,
          amount: orderData.amount,
          status: 'completed',
          createdAt: new Date()
        };
      }

      res.status(201).json({
        status: 'success',
        message: 'Purchase completed successfully! Please contact the seller to arrange pickup.',
        data: {
          order,
          item,
          seller: item.seller
        }
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment method'
      });
    }
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to purchase item'
    });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only see their own orders
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view your own orders'
      });
    }

    const orders = await Order.find({ user: userId })
      .populate('items.courseId', 'title description images')
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve orders'
    });
  }
};
