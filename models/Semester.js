const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  year: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Semester', semesterSchema);
