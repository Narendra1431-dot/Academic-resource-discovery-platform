const express = require('express');
const { auth } = require('../middleware/auth');
const Resource = require('../models/Resource');
const Subject = require('../models/Subject');
const Download = require('../models/Download');

const router = express.Router();

// GET /api/recommendations
// Returns recommended resources for the logged-in student
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;

    // 1) Pull candidate resources primarily matching student's branch & semester
    const baseMatch = { approved: true };
    if (user.branchId) baseMatch.branchId = user.branchId;
    if (user.semesterId) baseMatch.semesterId = user.semesterId;

    // Fetch a reasonable pool to score
    const candidates = await Resource.find(baseMatch)
      .populate('subjectId', 'name branchId semesterId')
      .limit(200);

    // 2) Build subject preferences from student's recent download history (if any)
    let subjectPreferenceWeights = new Map();
    try {
      const recentDownloads = await Download.find({
        // The Download model stores `studentId`; fall back to `userId` if present in db
        $or: [ { studentId: user._id }, { userId: user._id } ]
      })
        .sort({ downloadDate: -1 })
        .limit(50)
        .populate({ path: 'resourceId', select: 'subjectId', populate: { path: 'subjectId', select: 'name' } });

      for (const d of recentDownloads) {
        const sub = d?.resourceId?.subjectId;
        if (!sub) continue;
        const key = String(sub._id);
        subjectPreferenceWeights.set(key, (subjectPreferenceWeights.get(key) || 0) + 1);
      }
    } catch (_) {
      // ignore preference building errors; recommendations will still work using ratings/downloads
    }

    // 3) Compute scores using rating, downloads, and subject preferences
    const scored = candidates.map(r => {
      const ratingScore = (typeof r.rating === 'number' ? r.rating : 0) * 2; // weight rating higher
      const downloadsScore = Math.log10((r.downloads || 0) + 1); // diminishing returns
      const subjectKey = r.subjectId ? String(r.subjectId._id) : null;
      const subjectBoost = subjectKey ? (subjectPreferenceWeights.get(subjectKey) || 0) * 3 : 0; // strong boost for preferred subjects

      // Minor additional boost if resource matches exact branch/semester of user (already filtered but keep if filter relaxed later)
      const branchBoost = String(r.branchId || '') === String(user.branchId || '') ? 0.5 : 0;
      const semesterBoost = String(r.semesterId || '') === String(user.semesterId || '') ? 0.5 : 0;

      const score = ratingScore + downloadsScore + subjectBoost + branchBoost + semesterBoost;
      return { resource: r, score };
    });

    scored.sort((a, b) => b.score - a.score);

    let top = scored.slice(0, 12).map(s => s.resource);

    // 4) Fallbacks: if not enough resources, broaden within branch or globally by top rating/downloads
    if (top.length < 12) {
      const moreInBranch = await Resource.find({ approved: true, branchId: user.branchId })
        .populate('subjectId', 'name')
        .sort({ rating: -1, downloads: -1 })
        .limit(24);
      const ids = new Set(top.map(r => String(r._id)));
      for (const r of moreInBranch) {
        if (ids.size >= 12) break;
        const id = String(r._id);
        if (!ids.has(id)) { top.push(r); ids.add(id); }
      }
    }

    if (top.length < 12) {
      const globalTop = await Resource.find({ approved: true })
        .populate('subjectId', 'name')
        .sort({ rating: -1, downloads: -1 })
        .limit(24);
      const ids = new Set(top.map(r => String(r._id)));
      for (const r of globalTop) {
        if (ids.size >= 12) break;
        const id = String(r._id);
        if (!ids.has(id)) { top.push(r); ids.add(id); }
      }
    }

    // 5) Shape response to API spec
    const recommended = top.map(r => ({
      _id: r._id,
      title: r.title,
      subject: r.subjectId?.name || 'General',
      type: (r.type || '').toUpperCase(),
      fileUrl: r.fileUrl,
      rating: r.rating || 0,
      downloads: r.downloads || 0
    }));

    res.json({ recommended });
  } catch (err) {
    console.error('Recommendations error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
