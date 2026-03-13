const express = require('express');
const Semester = require('../models/Semester');

const router = express.Router();

// GET /api/semesters - list all semesters
router.get('/', async (req, res) => {
  try {
    const semesters = await Semester.find({}).sort('number');
    res.json(semesters);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;


