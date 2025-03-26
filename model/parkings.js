const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema({
  lotID: { type: String, required: true, unique: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },  // ✅ Ensure this line exists
  classType: { type: String, enum: ['VIP', 'Standard', 'Economy'], required: true },
  totalSpots: { type: Number, required: true },
  occupiedSpots: { type: Number, default: 0 },
  plan: { type: Number, required: true },  // Price per hour
  revenue: { type: Number, default: 0 },
  status: { type: String, enum: ['Open', 'Closed', 'Under Maintenance'], required: true }
});

module.exports = mongoose.model('Parking', parkingSchema);
