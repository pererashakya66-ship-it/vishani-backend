const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['text', 'location'],
    default: 'text',
  },
  content: { type: String, default: '' },
  // Only populated when type === 'location'
  location: {
    latitude:  Number,
    longitude: Number,
  },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
