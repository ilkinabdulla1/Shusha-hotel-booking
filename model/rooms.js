const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  hotel: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hotel', 
    required: true 
  },  // Reference to Hotel model

  roomNumber: { 
    type: String, 
    required: true, 
    unique: true  // Ensure unique room numbers
  },

  image: { 
    type: String, 
    required: true 
  },

  type: { 
    type: String, 
    required: true 
  },  // e.g., Deluxe, Standard

  bedType: { 
    type: String, 
    required: true 
  },  // e.g., King, Queen, Twin

  price: { 
    type: Number, 
    required: true 
  },  // Price per night

  status: { 
    type: String, 
    enum: ['Available', 'Occupied', 'Out of Service', 'Maintenance'], 
    default: 'Available',
    required: true 
  },

  isAvailable: { 
    type: Boolean, 
    default: true 
  },  // Availability flag for booking

  description: { 
    type: String 
  },

  maxOccupancy: { 
    type: Number, 
    required: true, 
    default: 2 
  },  // Maximum allowed guests

  roomSize: { 
    type: Number 
  },  // In square meters or feet

  facilities: [{ 
    type: String 
  }],  // e.g., ['Wi-Fi', 'Air Conditioning']

  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],  // Track related bookings

}, { timestamps: true });  // Auto-manage createdAt and updatedAt fields

module.exports = mongoose.model('Room', roomSchema);
