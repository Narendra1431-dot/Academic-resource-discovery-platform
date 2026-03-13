const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  year: { type: Number, required: true },
  timetableSlots: [
    {
      day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      time: String,
      room: String,
      type: { type: String, default: 'theory' }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
