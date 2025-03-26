const mongoose = require('mongoose');

const StaffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },

  profilePhoto: {
    type: String, // Path or URL of the uploaded image
    default: '/images/default-profile.png', // Default profile photo
  },

  badgeNumber: {
    type: String,
    required: [true, 'Badge Number is required'],
    unique: true, // Unique badge number for each staff member
    trim: true,
  },

  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
  },

  schedule: {
    days: {
      type: [String], // Array of working days
      required: [true, 'Schedule days are required'],
    },
    time: {
      type: String, // Work hours (e.g., "9:00 AM - 5:00 PM")
      required: [true, 'Schedule time is required'],
      trim: true,
    },
  },

  contact: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
  },

  address: {
    type: String,
    trim: true,
    default: 'N/A',
  },

  dateOfBirth: {
    type: Date,
    required: [true, 'Date of Birth is required'],
  },

  nationalId: {
    type: String,
    required: [true, 'National ID is required'],
    unique: true,
    trim: true,
  },

  accessLevel: {
    type: String,
    enum: ['Admin', 'Manager', 'Staff'],
    default: 'Staff',
    required: [true, 'Access Level is required'],
  },

  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: [0, 'Salary must be a positive number'],
  },

  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel', // Reference to the Hotel model
    required: [true, 'Hotel association is required'],
  },

  joinDate: {
    type: Date,
    required: [true, 'Join Date is required'],
  },

  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    required: [true, 'Status is required'],
    default: 'Active',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Staff', StaffSchema);
