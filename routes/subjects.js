const express = require('express');
const Subject = require('../models/Subject');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');

const router = express.Router();

// GET /api/subjects - all subjects with filters
router.get('/', async (req, res) => {
  try {
    const { branchId, semesterId, year } = req.query;
    const query = {};
    if (branchId) query.branchId = branchId;
    if (semesterId) query.semesterId = semesterId;
    if (year) query.year = year;

    const subjects = await Subject.find(query)
      .populate('branchId', 'name')
      .populate('semesterId', 'number year')
      .sort('name');

    res.json(subjects);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/subjects/:id - single subject + resources
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('branchId', 'name')
      .populate('semesterId', 'number year');
    
    if (!subject) return res.status(404).json({ msg: 'Subject not found' });

    res.json(subject);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/subjects - create subject (admin)
router.post('/', async (req, res) => {
  try {
    const subject = new Subject(req.body);
    await subject.save();
    const populated = await Subject.findById(subject._id)
      .populate('branchId', 'name')
      .populate('semesterId', 'number');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/subjects/:id - update subject (admin)
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const subject = await Subject.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('branchId', 'name')
      .populate('semesterId', 'number');
    res.json(subject);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/subjects/:id - delete subject (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Subject.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Subject deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
