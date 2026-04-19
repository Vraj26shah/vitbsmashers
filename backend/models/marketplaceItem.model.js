import mongoose from 'mongoose';

const marketplaceItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Item title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Item description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Notes', 'Books', 'Electronics', 'Stationery', 'Other']
  },
  subject: {
    type: String,
    required: false
  },
  course: {
    type: String,
    required: false
  },
  images: [{
    type: String,
    default: []
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  condition: {
    type: String,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
    default: 'Good'
  },
  location: {
    type: String,
    required: false
  },
  contactInfo: {
    type: String,
    required: false
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update updatedAt on save
marketplaceItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
marketplaceItemSchema.index({ category: 1 });
marketplaceItemSchema.index({ isAvailable: 1 });
marketplaceItemSchema.index({ seller: 1 });
marketplaceItemSchema.index({ title: 'text', description: 'text' });

const MarketplaceItem = mongoose.model('MarketplaceItem', marketplaceItemSchema);

export default MarketplaceItem;