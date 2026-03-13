const mongoose = require('mongoose');
const Upload = require('../models/Upload');
const User = require('../models/User');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/academic');

async function seedUploads() {
  await mongoose.connection.dropDatabase();
  
  // Create test users
  const users = await User.create([
    { name: 'Jane Doe', email: 'jane@student.com', password: 'student123', role: 'student' }
  ]);

  // Test uploads for Jane
  const janeId = users[0]._id;
  await Upload.create([
    {
      title: 'Data Structures Notes',
      fileUrl: '/uploads/1773356343482-Screenshot 2026-03-10 131216.png',
      fileType: 'png',
      subject: 'Data Structures',
      uploadedBy: janeId,
      status: 'auto-approved',
      aiScore: 85,
      aiReason: 'Academic keywords detected'
    },
    {
      title: 'Files ZIP',
      fileUrl: '/uploads/1773357152412-files.zip',
      fileType: 'zip',
      subject: 'Algorithms',
      uploadedBy: janeId,
      status: 'pending',
      aiScore: 65
    },
    {
      title: 'Needs Review Test',
      fileUrl: '/uploads/1773356343482-Screenshot 2026-03-10 131216.png',
      fileType: 'png',
      subject: 'OS',
      uploadedBy: janeId,
      status: 'needs-review',
      aiScore: 55,
      aiReason: 'Review required'
    }
  ]);

  console.log('✅ Test uploads seeded for jane@student.com / student123');
  console.log('Login & check dashboard!');
  mongoose.connection.close();
}

seedUploads().catch(console.error);

