const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  // Guest Information
  guestName: { type: String, required: true },
  guestEmail: { type: String, required: true },
  guestPhone: { type: String, required: true },
  adults: { type: Number, required: true, min: 1, default: 1 }, // Minimum 1 adult
  children: { type: Number, required: true, min: 0, default: 0 },

  // Customer Reference
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Link to Customer model

  // Booking and Room Information
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true }, // Linked to Room model
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },

  // Payment Information
  paymentMethod: { type: String, required: true, enum: ['Credit Card', 'Cash', 'Online Payment'] },
  totalAmount: { type: Number, required: true, min: 0 }, // Auto-calculated

  // Booking Status
  status: { type: String, required: true, enum: ['Active', 'Completed', 'Cancelled'], default: 'Active' },

}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
