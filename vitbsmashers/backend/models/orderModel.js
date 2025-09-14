import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // For single course orders
  courseId: {
    type: String,
    required: function() {
      return !this.items || this.items.length === 0;
    },
  },
  title: {
    type: String,
    required: function() {
      return !this.items || this.items.length === 0;
    },
  },
  // For cart-based orders
  items: [{
    courseId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    modules: [{
      title: String,
      topics: String,
    }],
  }],
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  stripeSessionId: {
    type: String,
  },
  // For single course orders
  modules: [{
    title: String,
    topics: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Order', orderSchema);