const express = require('express');
const Feedback = require('../models/Feedback');
const Resource = require('../models/Resource');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/feedback - submit feedback
router.post('/', auth, async (req, res) => {
  try {
    const { resourceId, rating, comment } = req.body;

    if (!resourceId || !rating || !comment) {
      return res.status(400).json({ msg: 'Please provide resourceId, rating and comment' });
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({ msg: 'Resource not found' });
    }

    // Check if user already submitted feedback for this resource
    const existingFeedback = await Feedback.findOne({ userId: req.user.id, resourceId });
    if (existingFeedback) {
      return res.status(400).json({ msg: 'You have already submitted feedback for this resource' });
    }

    const feedback = new Feedback({
      userId: req.user.id,
      resourceId,
      rating,
      comment
    });

    await feedback.save();

    // Update resource rating
    const totalRatings = resource.totalRatings + 1;
    const currentTotalScore = (resource.averageRating * resource.totalRatings) + rating;
    const averageRating = totalRatings > 0 ? (currentTotalScore / totalRatings).toFixed(1) : 0;

    resource.totalRatings = totalRatings;
    resource.averageRating = averageRating;
    await resource.save();

    res.status(201).json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/feedback/:id/helpful - mark feedback as helpful
router.post('/:id/helpful', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ msg: 'Feedback not found' });

    // Check if user already voted
    if (feedback.votedBy.includes(req.user.id)) {
      return res.status(400).json({ msg: 'You have already marked this as helpful' });
    }

    feedback.helpfulVotes += 1;
    feedback.votedBy.push(req.user.id);
    await feedback.save();

    res.json(feedback);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/feedback/admin/all - Admin view all feedback
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('userId', 'name email')
      .populate('resourceId', 'title')
      .sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/feedback/:id - Admin delete feedback
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ msg: 'Feedback not found' });

    const resourceId = feedback.resourceId;
    const ratingToDelete = feedback.rating;

    await Feedback.findByIdAndDelete(req.params.id);

    // Re-calculate resource rating
    const resource = await Resource.findById(resourceId);
    if (resource && resource.totalRatings > 0) {
      const totalRatings = resource.totalRatings - 1;
      let averageRating = 0;
      if (totalRatings > 0) {
        const currentTotalScore = (resource.averageRating * resource.totalRatings) - ratingToDelete;
        averageRating = (currentTotalScore / totalRatings).toFixed(1);
      }
      resource.totalRatings = totalRatings;
      resource.averageRating = averageRating;
      await resource.save();
    }

    res.json({ msg: 'Feedback deleted and rating updated' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
