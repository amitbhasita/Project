// models/Transport.js
const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  providerId: { type: String, required: true },
  type: { type: String, required: true }
});

module.exports = mongoose.model('Transport', transportSchema);
