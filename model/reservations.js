const mongoose = require('mongoose');

// Define Reservation Schema
const reservationSchema = new mongoose.Schema({
  reservationID: { type: String, required: true, unique: true },

  customerName: { type: String, required: true },
  numberPlate: { type: String, required: true },
  spotNumber: { type: String, required: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },  // ✅ Ensure this line exists

  // Corrected parkingLot reference to the Parking model
  parkingLot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parking',
    required: true
  },

  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },

  plan: { type: Number, required: true },             // Pricing Plan ($/hour)
  totalPrice: { type: Number, required: true },       // Calculated Total Price

  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled'],
    default: 'Active'
  }
});

// ✅ Prevent OverwriteModelError by checking if it already exists
module.exports = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
