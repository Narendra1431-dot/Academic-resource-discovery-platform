const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Upload _id or Resource _id
  aiScore: { type: Number, required: true },
  decision: { type: String, enum: ['approved', 'needs-review', 'rejected'], required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AILog', aiLogSchema);
