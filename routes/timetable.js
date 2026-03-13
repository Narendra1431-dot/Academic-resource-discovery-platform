const express = require('express');
const { auth } = require('../middleware/auth');
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const User = require('../models/User');

const router = express.Router();

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_ORDER = [
  '9:00-10:30 AM',
  '10:30-12:00 PM',
  '11:00-12:30 PM',
  '2:00-3:30 PM',
  '3:30-5:00 PM'
];

function dayIdx(d) { return DAY_ORDER.indexOf(d); }
function timeIdx(t) { const i = TIME_ORDER.indexOf(t); return i === -1 ? 99 : i; }

// GET /api/timetable - list the logged-in student's timetable, optional day filter
router.get('/', auth, async (req, res) => {
  try {
    const { day } = req.query;
    const query = { studentId: req.user._id };
    if (day) query.day = day;
    const items = await Timetable.find(query).sort('day time');
    res.json(items);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/timetable - create an entry for the logged-in student
router.post('/', auth, async (req, res) => {
  try {
    const { day, time, subject, room } = req.body;
    const item = await Timetable.create({ studentId: req.user._id, day, time, subject, room });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/timetable/ai-generate - generate a full timetable using AI (fallback to deterministic)
router.post('/ai-generate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('branchId semesterId');
    if (!user || !user.branchId || !user.semesterId) {
      return res.status(400).json({ msg: 'User branch/semester not set' });
    }

    // Load subjects for the user's branch and semester
    const subjects = await Subject.find({ branchId: user.branchId, semesterId: user.semesterId })
      .select('name timetableSlots');

    if (!subjects.length) {
      return res.status(404).json({ msg: 'No subjects found for your branch/semester' });
    }

    // Build constraints summary for AI
    const allowedDays = DAY_ORDER;
    const allowedTimes = TIME_ORDER;
    const subjectSumm = subjects.map(s => ({
      name: s.name,
      slots: (s.timetableSlots || []).map(ts => ({ day: ts.day, time: ts.time, room: ts.room }))
    }));

    // Attempt AI generation using same OpenAI client pattern as utils/aiVerifier
    async function tryAI() {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const prompt = `You are an assistant that constructs weekly college timetables.\n` +
          `Allowed days: ${allowedDays.join(', ')}. Allowed times: ${allowedTimes.join(' | ')}.\n` +
          `Subjects with preferred/available slots (if any):\n` +
          `${JSON.stringify(subjectSumm)}\n` +
          `Return ONLY JSON array of entries: [{"day":"Mon","time":"9:00-10:30 AM","subject":"Subject Name","room":"C401"}], balanced across the week, avoid duplicate day+time.\n`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 600
        });
        const txt = (completion.choices?.[0]?.message?.content || '').trim();
        const jsonStr = txt.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);
        if (!Array.isArray(data)) throw new Error('AI did not return array');
        return data;
      } catch (e) {
        return null;
      }
    }

    // Deterministic fallback generator: round-robin assign subjects to allowed day/time grid
    function fallbackGenerate() {
      const grid = [];
      const combos = [];
      allowedDays.forEach(d => allowedTimes.forEach(t => combos.push({ day: d, time: t })));
      let si = 0; // subject index
      for (let i = 0; i < combos.length && si < subjects.length * 2; i++) {
        const { day, time } = combos[i];
        const subj = subjects[si % subjects.length];
        grid.push({ day, time, subject: subj.name, room: `R-${(si%8)+101}` });
        si++;
      }
      return grid;
    }

    // Validate and normalize entries
    function normalize(entries) {
      const seen = new Set();
      const out = [];
      for (const e of entries) {
        if (!e || !e.day || !e.time || !e.subject) continue;
        if (!allowedDays.includes(e.day)) continue;
        if (!allowedTimes.includes(e.time)) continue;
        const key = `${e.day}|${e.time}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ day: e.day, time: e.time, subject: String(e.subject), room: e.room ? String(e.room) : '' });
      }
      // sort for readability
      out.sort((a,b) => (dayIdx(a.day)-dayIdx(b.day)) || (timeIdx(a.time)-timeIdx(b.time)) || a.subject.localeCompare(b.subject));
      return out;
    }

    const aiOut = await tryAI();
    const plan = normalize(Array.isArray(aiOut) ? aiOut : fallbackGenerate());
    if (!plan.length) return res.status(500).json({ msg: 'Failed to generate timetable' });

    // Replace user's timetable with the new plan
    await Timetable.deleteMany({ studentId: req.user._id });
    const inserted = await Timetable.insertMany(
      plan.map(p => ({ studentId: req.user._id, day: p.day, time: p.time, subject: p.subject, room: p.room }))
    );

    res.status(201).json({ msg: 'AI timetable generated', count: inserted.length, items: inserted });
  } catch (err) {
    console.error('AI-generate error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/timetable/:id - update an entry if it belongs to the user
router.put('/:id', auth, async (req, res) => {
  try {
    const updates = (({ day, time, subject, room }) => ({ day, time, subject, room }))(req.body);
    const item = await Timetable.findOneAndUpdate(
      { _id: req.params.id, studentId: req.user._id },
      updates,
      { new: true }
    );
    if (!item) return res.status(404).json({ msg: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/timetable/:id - delete an entry if it belongs to the user
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Timetable.findOneAndDelete({ _id: req.params.id, studentId: req.user._id });
    if (!result) return res.status(404).json({ msg: 'Not found' });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
