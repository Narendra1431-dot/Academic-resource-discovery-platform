const express = require('express');
const multer = require('multer');
const { auth, adminAuth } = require('../middleware/auth');
const Upload = require('../models/Upload');
const { verifyUpload } = require('../utils/aiVerifier');
const Resource = require('../models/Resource');
const AILog = require('../models/AILog');
const path = require('path');

const router = express.Router();

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'mp4'].includes(file.mimetype.split('/')[1] || path.extname(file.originalname).slice(1))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

// POST /api/uploads - student upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, subject } = req.body;
    const userId = req.user._id || req.user.id;
    if (!req.file) return res.status(400).json({ msg: 'File is required' });
    if (!title || !subject) return res.status(400).json({ msg: 'Title and subject are required' });

    const ext = (path.extname(req.file.originalname) || '').slice(1).toLowerCase();
    const mimeExt = (req.file.mimetype?.split('/')[1] || '').toLowerCase();
    const fileType = ext || mimeExt || 'bin';
    const fileUrl = `/uploads/${req.file.filename}`; // serve via static route

    // Save pending upload
    const newUpload = new Upload({
      title,
      fileUrl,
      fileType,
      subject,
      uploadedBy: userId
    });
    await newUpload.save();

    // Background AI verification & post-processing
    console.log(`Verifying upload ${newUpload._id}: ${title} (${fileType})`);
    verifyUpload({
      title,
      subject,
      description: '',
      fileType,
      fileSize: req.file.size
    }).then(async ({ status, score, reason }) => {
      console.log(`AI result for ${newUpload._id}: ${status} (${score}) - ${reason}`);
      try {
        // Update upload with AI decision
        const updated = await Upload.findByIdAndUpdate(newUpload._id, {
          status,
          aiScore: score,
          aiReason: reason
        }, { new: true });

        // Log AI decision
        await AILog.create({ resourceId: newUpload._id, aiScore: score, decision: status, reason });

        // Auto-publish approved uploads to resources
        if (status === 'approved') {
          const typeMap = (t) => {
            const x = (t||'').toLowerCase();
            if (x.includes('pdf')) return 'notes';
            if (x.includes('ppt')) return 'ppt';
            if (x.includes('doc')) return 'textbook';
            if (x.includes('mp4') || x.includes('video')) return 'video';
            if (x.includes('txt')) return 'textbook';
            return 'notes';
          };
          // Try to link a Subject if available by name
          const Subject = require('../models/Subject');
          const subjDoc = await Subject.findOne({ name: subject });

          await Resource.create({
            title,
            subjectId: subjDoc?._id || undefined,
            type: typeMap(fileType),
            fileUrl,
            uploaderId: userId,
            approved: true,
            downloads: 0,
            averageRating: 0,
            totalRatings: 0
          });
        }
        console.log(`Upload ${newUpload._id} AI verified: ${status} (${score})`);
      } catch (e) {
        console.error('Post-AI processing error:', e);
      }
    }).catch(err => {
      console.error('AI verify error:', err);
    });

    res.status(201).json({ msg: 'Upload received, under AI verification', uploadId: newUpload._id, fileUrl });
  } catch (err) {
    res.status(400).json({ msg: err.message });
  }
});

// GET /api/student/uploads - student's uploads
router.get('/student', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const uploads = await Upload.find({ uploadedBy: userId })
      .populate('uploadedBy', 'name')
      .sort('-uploadDate');
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/admin/uploads - admin uploads for moderation
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const { status, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.uploadedBy = userId;

    const uploads = await Upload.find(query)
      .populate('uploadedBy', 'name email')
      .sort('-uploadDate');
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/uploads/:id/approve
router.put('/:id/approve', adminAuth, async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ msg: 'Upload not found' });

    upload.status = 'auto-approved';
    upload.approvedBy = req.user.id;
    await upload.save();
    res.json({ msg: 'Upload approved' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/uploads/:id/reject
router.put('/:id/reject', adminAuth, async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);
    if (!upload) return res.status(404).json({ msg: 'Upload not found' });

    upload.status = 'rejected';
    upload.approvedBy = req.user.id;
    await upload.save();
    res.json({ msg: 'Upload rejected' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/uploads/:id - delete own upload
router.delete('/:id', auth, async (req, res) => {
  try {
    const upload = await Upload.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!upload) return res.status(404).json({ msg: 'Upload not found or not authorized' });
    await upload.deleteOne();
    res.json({ msg: 'Upload deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
