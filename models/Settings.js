const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  notifications: { 
    type: { 
      email: { type: Boolean, default: true },
      uploadApproval: { type: Boolean, default: true },
      newResources: { type: Boolean, default: true }
    },
    default: { email: true, uploadApproval: true, newResources: true }
  },
  privacy: { 
    type: { 
      profilePublic: { type: Boolean, default: false },
      resourcesPublic: { type: Boolean, default: false }
    },
    default: { profilePublic: false, resourcesPublic: false }
  },
  language: { type: String, default: 'en' },
  profile: {
    bio: String,
    avatar: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
