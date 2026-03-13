const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  // Either a per-student entry OR a branch+semester plan entry
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  semesterNumber: { type: Number },

  // Day/Time fields
  day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], required: true },
  // Compatibility: keep 'time' while also supporting 'timeSlot' naming
  time: { type: String },
  timeSlot: { type: String },

  // Content
  subject: { type: String, required: true },
  room: { type: String },
  faculty: { type: String },
  type: { type: String, enum: ['theory', 'lab'], default: 'theory' }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
