const express = require('express');
const Resource = require('../models/Resource');
const Subject = require('../models/Subject');
const Feedback = require('../models/Feedback');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/resources - get all approved resources with filters
router.get('/', async (req, res) => {
  try {
    const { branchId, semesterId, subjectId, type, search, approved = true, page = 1, limit = 12 } = req.query;
    const query = { approved: approved === 'true' };
    
    if (branchId) query.branchId = branchId;
    if (semesterId) query.semesterId = semesterId;
    if (subjectId) query.subjectId = subjectId;
    if (type) query.type = type;
    if (search) query.title = { $regex: search, $options: 'i' };

    const resources = await Resource.find(query)
      .populate('subjectId', 'name')
      .populate('uploaderId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(search ? { averageRating: -1, createdAt: -1 } : { createdAt: -1 });

    const count = await Resource.countDocuments(query);
    
    res.json({
      resources,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/resources - create resource (upload handled by multer in server.js)
router.post('/', auth, async (req, res) => {
  try {
    const { title, subjectId, type } = req.body;
    const subject = await Subject.findById(subjectId);
    if (!subject) return res.status(400).json({ msg: 'Invalid subject' });

    const resource = new Resource({
      title,
      subjectId,
      branchId: subject.branchId,
      semesterId: subject.semesterId,
      type,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
      uploaderId: req.user.id,
      approved: false
    });

    await resource.save();
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/resources/:id/approve - admin approve
router.put('/:id/approve', auth, adminAuth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    ).populate('subjectId', 'name');
    if (!resource) return res.status(404).json({ msg: 'Resource not found' });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/resources/user - user's resources
router.get('/user', auth, async (req, res) => {
  try {
    const resources = await Resource.find({ uploaderId: req.user.id })
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/resources/:id/download - increment download count and log user download
router.post('/:id/download', auth, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!resource) return res.status(404).json({ msg: 'Resource not found' });

    // Log the download for recommendations (Download model uses studentId)
    const Download = require('../models/Download');
    await Download.create({ studentId: req.user._id, resourceId: resource._id });

    res.json(resource);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/resources/:id/feedback - get feedback for a resource
router.get('/:id/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find({ resourceId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    
    // Map to match requested response format
    const formattedFeedback = feedback.map(f => ({
      _id: f._id,
      user: f.userId ? f.userId.name : 'Unknown User',
      rating: f.rating,
      comment: f.comment,
      helpfulVotes: f.helpfulVotes,
      createdAt: f.createdAt
    }));

    res.json({ feedback: formattedFeedback });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
