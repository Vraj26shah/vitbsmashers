import mongoose from 'mongoose';

const pendingEventUpdateSchema = new mongoose.Schema({
  originalEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // { field: { old: value, new: value } }
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for pending updates
pendingEventUpdateSchema.index({ status: 1, submittedAt: -1 });

const PendingEventUpdate = mongoose.model('PendingEventUpdate', pendingEventUpdateSchema);

export default PendingEventUpdate;