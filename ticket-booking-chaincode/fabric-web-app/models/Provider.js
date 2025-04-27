// models/Provider.js
const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  isPublic: { type: Boolean, default: true },
  password: { type: String, required: true },
  role: { type: String, default: 'provider' }
});

module.exports = mongoose.model('Provider', providerSchema);
