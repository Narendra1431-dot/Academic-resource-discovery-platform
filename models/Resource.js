const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  type: { type: String, enum: ['notes', 'ppt', 'textbook', 'pyq', 'video'], required: true },
  fileUrl: { type: String, required: true },
  uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  averageRating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
