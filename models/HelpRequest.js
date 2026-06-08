const mongoose = require('mongoose');

const helpRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['general', 'safe_escort', 'sanitary_pad', 'emotional', 'medical'],
    default: 'general',
  },
  description: { type: String, required: true, trim: true },
  // Location at time of posting
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
  },
  isAnonymous: { type: Boolean, default: false },
}, { timestamps: true });

helpRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('HelpRequest', helpRequestSchema);
