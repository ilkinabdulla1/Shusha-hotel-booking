const mongoose = require('mongoose');

// Define the schema
const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5, // Ratings are out of 5
  },
  status: {
    type: String,
    enum: ['Open', 'Closed'],
    required: true,
    default: 'Open',
  },
  image: {
    type: String,
    default: '/images/default-hotel.png', // Fallback image
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
  },
  description: {
    type: String,
    trim: true,
  },
  facilities: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true, // Automatically adds `createdAt` and `updatedAt`
});

// Export the model
module.exports = mongoose.model('Hotel', hotelSchema);
