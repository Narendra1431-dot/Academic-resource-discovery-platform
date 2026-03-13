const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  downloadDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Download', downloadSchema);
