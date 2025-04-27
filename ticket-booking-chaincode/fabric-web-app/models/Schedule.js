// models/Schedule.js
const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  transportId: { type: String, required: true },
  departure: { type: Date, required: true },
  source: { type: String, required: true },
  destination: { type: String, required: true },
  totalSeats: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  bookedSeats: { type: Map, of: String },
  currentPrice: { type: Number, required: true },
  lastModified: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', scheduleSchema);
