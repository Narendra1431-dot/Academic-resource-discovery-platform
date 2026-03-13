require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const authRoutes = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const subjectRoutes = require('./routes/subjects');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const branchRoutes = require('./routes/branches');
const semesterRoutes = require('./routes/semesters');
const dashboardRoutes = require('./routes/dashboard');
const recommendationRoutes = require('./routes/recommendations');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://your-netlify-site.netlify.app'] : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('.')); // serve current dir (index.html)
app.use('/uploads', express.static('uploads'));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', upload.single('file'), resourceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/student', require('./routes/student'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/feedback', require('./routes/feedback'));

// Serve frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Seed route (temp)
app.get('/api/seed', async (req, res) => {
  try {
    res.json({ msg: 'Run: node seed.js' });
  } catch {
    res.json({ msg: 'Run: node seed.js' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
module.exports = app;
