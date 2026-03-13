const express = require('express');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const Timetable = require('../models/Timetable');
const Progress = require('../models/Progress');
const Download = require('../models/Download');
const Resource = require('../models/Resource');
const Subject = require('../models/Subject');
const User = require('../models/User');

const router = express.Router();

// GET /api/dashboard - complete dashboard data for student
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all dashboard data
    const [subjectsCount, downloadsCount, assignmentsCount, avgProgress] = await Promise.all([
      Subject.countDocuments({}), // Total subjects available
      Download.countDocuments({ studentId: userId }),
      Progress.countDocuments({ studentId: userId }),
      Progress.aggregate([
        { $match: { studentId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, avg: { $avg: '$percentage' } } }
      ])
    ]);

    // Demo data - replace with your real data
    const demoSubjects = [
      { _id: '1', name: 'Data Structures', semesterId: { number: 3 }, branchId: { name: 'CSE' } },
      { _id: '2', name: 'DBMS', semesterId: { number: 3 }, branchId: { name: 'CSE' } },
      { _id: '3', name: 'Operating Systems', semesterId: { number: 3 }, branchId: { name: 'CSE' } }
    ];

    const demoResources = [
      { _id: 'r1', title: 'Binary Trees Notes', type: 'notes', subject: 'Data Structures', downloads: 45, size: '2.3 MB' },
      { _id: 'r2', title: 'Graph Algorithms Video', type: 'video', subject: 'Data Structures', downloads: 23, size: '45 MB' },
      { _id: 'r3', title: 'SQL Assignment', type: 'assignment', subject: 'DBMS', downloads: 67, size: '1.2 MB' }
    ];

    const demoProgress = [
      { subjectId: { name: 'Data Structures' }, percentage: 60 },
      { subjectId: { name: 'DBMS' }, percentage: 45 },
      { subjectId: { name: 'Operating Systems' }, percentage: 50 }
    ];

    const demoDownloads = [
      { resourceId: { title: 'Binary Trees Notes', subject: 'Data Structures' }, downloadDate: new Date(Date.now() - 86400000).toISOString() },
      { resourceId: { title: 'SQL Assignment', subject: 'DBMS' }, downloadDate: new Date().toISOString() }
    ];

    // Enhanced mock data for graphs
    const attendanceData = [
      { subject: 'Data Structures', percentage: 92 },
      { subject: 'DBMS', percentage: 85 },
      { subject: 'Operating Systems', percentage: 78 },
      { subject: 'Mathematics', percentage: 95 },
      { subject: 'Economics', percentage: 88 }
    ];

    const performanceData = [
      { semester: 'Sem 1', gpa: 8.2 },
      { semester: 'Sem 2', gpa: 8.5 },
      { semester: 'Sem 3', gpa: 7.9 },
      { semester: 'Sem 4', gpa: 8.8 }
    ];

    res.json({
      subjects: demoSubjects,
      resources: demoResources,
      progress: demoProgress,
      downloads: demoDownloads,
      attendance: attendanceData,
      performance: performanceData,
      stats: {
        subjectsCount: subjectsCount || 5,
        downloadsCount: downloadsCount,
        assignmentsCount: assignmentsCount || 12,
        avgProgress: avgProgress[0]?.avg || 65,
        cgpa: 8.4,
        overallAttendance: 88
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/timetable - user's timetable
router.get('/timetable', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { day } = req.query;
    const query = { studentId: userId };
    if (day) query.day = day;

    const timetable = await Timetable.find(query)
      .populate('subjectId', 'name branchId semesterId')
      .sort('time');

    res.json(timetable);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/resources - recommended resources
router.get('/resources', auth, async (req, res) => {
  try {
    const { subject } = req.query;
    const query = subject ? { subject } : {};
    const resources = await Resource.find(query).sort('-createdAt').limit(10);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/progress - user's progress
router.get('/progress', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await Progress.find({ studentId: userId })
      .populate('subjectId', 'name')
      .sort('-percentage');

    res.json(progress);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/downloads - user's downloads
router.get('/downloads', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const downloads = await Download.find({ studentId: userId })
      .populate('resourceId', 'title')
      .sort('-downloadDate')
      .limit(20);

    res.json(downloads);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
