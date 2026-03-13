const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true }, // pdf, doc, video, etc.
  subject: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'auto-approved', 'needs-review', 'rejected'], 
    default: 'pending' 
  },
  aiScore: { type: Number, default: 0 }, // 0-100
  aiReason: { type: String },
  uploadDate: { type: Date, default: Date.now },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
