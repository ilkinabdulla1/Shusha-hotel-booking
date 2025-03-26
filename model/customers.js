const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },

  // Linked Room Reference
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: false
  },

  // Linked Hotel Reference (via Room)
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: false
  },

  // Booking References
  bookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  ],

  // Stay Duration
  checkInDate: { type: Date, required: false },
  checkOutDate: { type: Date, required: false },

  // Status of the Customer
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },

  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Cash', 'Online Payment'],
    required: false
  },

  // Total Amount Spent (Calculated from Bookings)
  totalAmountSpent: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update the `updatedAt` timestamp on modifications
customerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
