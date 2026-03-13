const express = require('express');
const Branch = require('../models/Branch');

const router = express.Router();

// GET /api/branches - list all branches
router.get('/', async (req, res) => {
  try {
    const branches = await Branch.find({}).sort('name');
    res.json(branches);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;


