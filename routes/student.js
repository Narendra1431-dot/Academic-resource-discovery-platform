const express = require('express');
const { auth } = require('../middleware/auth');
const Upload = require('../models/Upload');
const Download = require('../models/Download');

const router = express.Router();

// GET /api/student/dashboard - student stats
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Promise.all([
      Upload.countDocuments({ uploadedBy: userId }), // Total uploads
      Upload.countDocuments({ uploadedBy: userId, status: 'pending' }), // Pending
      Upload.countDocuments({ 
        uploadedBy: userId, 
        status: { $in: ['auto-approved', 'approved'] } 
      }), // Approved
      Download.countDocuments({ userId }), // Downloads
    ]);

    res.json({
      myUploads: stats[0],
      pendingUploads: stats[1],
      approvedUploads: stats[2],
      downloads: stats[3]
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
