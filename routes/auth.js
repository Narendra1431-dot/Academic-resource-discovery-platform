const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Semester = require('../models/Semester');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branchId, year, semesterId } = req.body;
    
    let branch = await Branch.findById(branchId);
    let semester = await Semester.findById(semesterId);
    if (!branch || !semester) return res.status(400).json({ msg: 'Invalid branch or semester' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({ name, email, password, branchId, year, semesterId });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const populatedUser = await User.findById(user._id).populate('branchId').populate('semesterId').select('-password');
    res.json({
      token,
      user: populatedUser
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const populatedUser = await User.findById(user._id).populate('branchId').populate('semesterId').select('-password');
    res.json({
      token,
      user: populatedUser
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).populate('branchId').populate('semesterId').select('-password');
  res.json(user);
});

module.exports = router;
