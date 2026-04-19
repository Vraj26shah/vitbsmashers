import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Faculty name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Faculty email is required'],
    unique: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._%+-]+@vitbhopal\.ac\.in$/, 'Please use a valid VIT email']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['CSE', 'ECE', 'ME', 'CE', 'IT', 'EEE', 'Biotech', 'Other']
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer']
  },
  phone: {
    type: String,
    required: false
  },
  office: {
    type: String,
    required: false
  },
  specialization: {
    type: [String],
    required: false
  },
  image: {
    type: String,
    default: 'default-faculty.jpg'
  },
  bio: {
    type: String,
    required: false,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  schedule: {
    type: mongoose.Schema.Types.Mixed, // Flexible for timetable
    default: {}
  },
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
facultySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
facultySchema.index({ department: 1 });
facultySchema.index({ name: 'text', bio: 'text' });

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;