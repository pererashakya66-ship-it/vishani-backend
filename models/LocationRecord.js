const mongoose = require('mongoose');

const locationRecordSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy:  { type: Number },
  speed:     { type: Number },
  isEmergency: { type: Boolean, default: false },
}, { timestamps: true });

// Index to quickly fetch the latest record per user
locationRecordSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LocationRecord', locationRecordSchema);
