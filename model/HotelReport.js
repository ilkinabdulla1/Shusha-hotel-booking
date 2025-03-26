const mongoose = require('mongoose');

const HotelReportSchema = new mongoose.Schema({
  reportDate: { type: Date, required: true },
  bookings: { type: Number, required: true },
  revenue: { type: Number, required: true },
  customers: { type: Number, required: true },
  roomsAvailable: { type: Number, required: true },
  staffActive: { type: Number, required: true },
});

module.exports = mongoose.model('HotelReport', HotelReportSchema);
