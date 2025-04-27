// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  isAnonymous: { type: Boolean, default: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'provider'], required: true },
  walletBalance: { type: Number, default: 0 },
  registrationDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
