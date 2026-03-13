const express = require('express');
const OpenAI = require('openai');
const ChatLog = require('../models/ChatLog');
const { auth } = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/chat - AI chatbot
router.post('/', auth, async (req, res) => {
  try {
    const { question } = req.body;
    
    // Enhanced prompt for academic context
    const prompt = `You are SmartAcademic AI assistant. Provide clear, concise academic explanations. 
    Question: ${question}
    Respond helpfully for engineering students (CSE/ECE/EEE/Mech/Civil). Suggest study resources if relevant.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content;

    // Save chat log
    const chatLog = new ChatLog({
      userId: req.user.id,
      question,
      answer
    });
    await chatLog.save();

    res.json({ answer });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ msg: 'AI service unavailable. Try: Explain recursion? What is DBMS normalization?' });
  }
});

module.exports = router;
