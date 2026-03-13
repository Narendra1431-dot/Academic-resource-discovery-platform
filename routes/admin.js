const express = require('express');
const User = require('../models/User');
const Resource = require('../models/Resource');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/overview - basic analytics for admin dashboard
router.get('/overview', auth, adminAuth, async (req, res) => {
  try {
    const [userCount, totalResources, pendingResources, downloadsAgg] = await Promise.all([
      User.countDocuments({}),
      Resource.countDocuments({}),
      Resource.countDocuments({ approved: false }),
      Resource.aggregate([
        { $group: { _id: null, totalDownloads: { $sum: '$downloads' } } }
      ])
    ]);

    const totalDownloads = downloadsAgg[0]?.totalDownloads || 0;

    // uploads grouped by type for chart
    const uploadsByTypeAgg = await Resource.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const uploadsByType = uploadsByTypeAgg.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    res.json({
      userCount,
      totalResources,
      pendingResources,
      totalDownloads,
      uploadsByType
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;


