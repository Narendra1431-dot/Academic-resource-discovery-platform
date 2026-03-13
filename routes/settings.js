const express = require('express');
const { auth } = require('../middleware/auth');
const Settings = require('../models/Settings');

const router = express.Router();

// GET /api/settings - get user settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({ userId: req.user.id });
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/settings - update settings
router.put('/', auth, async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.id },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

module.exports = router;
