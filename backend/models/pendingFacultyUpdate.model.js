import mongoose from 'mongoose';

const pendingFacultyUpdateSchema = new mongoose.Schema({
  originalFacultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
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
pendingFacultyUpdateSchema.index({ status: 1, submittedAt: -1 });

const PendingFacultyUpdate = mongoose.model('PendingFacultyUpdate', pendingFacultyUpdateSchema);

export default PendingFacultyUpdate;