import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  // Unique Product ID (PID)
  pid: {
    type: String,
    required: [true, 'Product ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },

  // Basic Course Information
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },

  // Category and Classification
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Computer Science', 'Mathematics', 'Science', 'Engineering', 'Business', 'Arts', 'Other'],
    index: true
  },

  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    trim: true
  },

  // Pricing Information
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },

  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },

  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },

  // Course Metadata
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
    default: 'Intermediate'
  },

  language: {
    type: String,
    default: 'English'
  },

  instructor: {
    type: String,
    required: [true, 'Instructor name is required'],
    trim: true
  },

  // Course Content
  modules: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    topics: {
      type: String,
      trim: true
    },
    duration: {
      type: String,
      trim: true
    }
  }],

  modulesCount: {
    type: Number,
    min: 0,
    default: 0
  },

  hours: {
    type: Number,
    min: 0,
    default: 0
  },

  notes: {
    type: Number,
    min: 0,
    default: 0
  },

  // Media
  image: {
    type: String,
    required: [true, 'Course image is required']
  },

  thumbnail: {
    type: String
  },

  // Tags and Search
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // Ratings and Reviews
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },

  reviewCount: {
    type: Number,
    min: 0,
    default: 0
  },

  // Learning Outcomes
  prerequisites: [{
    type: String,
    trim: true
  }],

  learningOutcomes: [{
    type: String,
    trim: true
  }],

  // Access and Delivery
  accessDuration: {
    type: String,
    default: 'Lifetime',
    enum: ['Lifetime', '1 Year', '6 Months', '3 Months', '1 Month']
  },

  certificate: {
    type: Boolean,
    default: true
  },

  downloadable: {
    type: Boolean,
    default: true
  },

  // Status and Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active',
    index: true
  },

  featured: {
    type: Boolean,
    default: false,
    index: true
  },

  bestseller: {
    type: Boolean,
    default: false,
    index: true
  },

  newArrival: {
    type: Boolean,
    default: false,
    index: true
  },

  // Stock Management
  stock: {
    type: Number,
    min: 0,
    default: 999
  },

  unlimitedStock: {
    type: Boolean,
    default: true
  },

  // SEO and Marketing
  seoTitle: {
    type: String,
    maxlength: [60, 'SEO title cannot exceed 60 characters']
  },

  seoDescription: {
    type: String,
    maxlength: [160, 'SEO description cannot exceed 160 characters']
  },

  // Admin and Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  publishedAt: {
    type: Date
  }
});

// Indexes for better performance
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, subcategory: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ rating: -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ featured: -1, createdAt: -1 });

// Virtual for discounted price
courseSchema.virtual('discountedPrice').get(function() {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Virtual for stock status
courseSchema.virtual('isInStock').get(function() {
  return this.unlimitedStock || this.stock > 0;
});

// Pre-save middleware
courseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();

  // Auto-generate SEO fields if not provided
  if (!this.seoTitle && this.title) {
    this.seoTitle = this.title.substring(0, 60);
  }

  if (!this.seoDescription && this.description) {
    this.seoDescription = this.description.substring(0, 160);
  }

  // Update modules count
  if (this.modules) {
    this.modulesCount = this.modules.length;
  }

  next();
});

// Static method to get featured courses
courseSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ status: 'active', featured: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get courses by category
courseSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({ status: 'active', category })
    .sort({ rating: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to search courses
courseSchema.statics.search = function(query, filters = {}, limit = 20) {
  const searchQuery = {
    status: 'active',
    $text: { $search: query }
  };

  // Add filters
  if (filters.category) searchQuery.category = filters.category;
  if (filters.level) searchQuery.level = filters.level;
  if (filters.priceRange) {
    if (filters.priceRange === 'free') {
      searchQuery.price = 0;
    } else if (filters.priceRange === 'under-500') {
      searchQuery.price = { $lt: 500 };
    } else if (filters.priceRange === '500-1000') {
      searchQuery.price = { $gte: 500, $lte: 1000 };
    } else if (filters.priceRange === 'over-1000') {
      searchQuery.price = { $gt: 1000 };
    }
  }

  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, rating: -1 })
    .limit(limit);
};

const Course = mongoose.model('Course', courseSchema);

export default Course;