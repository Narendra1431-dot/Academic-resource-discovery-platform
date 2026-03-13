const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verifies an upload using OpenAI and returns { status, score, reason }
// Status mapping: >70 approved, 40-70 needs-review, <40 rejected
async function verifyUpload({ title, subject, description = '', fileType, keywords = '' }) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('OpenAI API key not configured, using fallback analysis');
      // Fallback: deterministic score from hash
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(`${title}|${subject}|${fileType}`).digest('hex');
      const score = parseInt(hash.substr(0, 2), 16) % 101;
      const status = score > 70 ? 'approved' : score >= 40 ? 'needs-review' : 'rejected';
      return { status, score, reason: 'Fallback analysis (OpenAI API key not configured)' };
    }

    const prompt = `You are an AI academic content moderator.\n\nAnalyze the following uploaded resource and determine if it is a valid academic study material.\n\nTitle: ${title}\nSubject: ${subject}\nDescription: ${description}\nFile Type: ${fileType}\nKeywords: ${keywords}\n\nCheck the following:\n- Is it content educational?\n- Is it related to the subject?\n- Is it spam or irrelevant?\n- Is it entertainment or non-academic content?\n\nReturn JSON:\n{\n  decision: 'approved | review | rejected',\n  score: number between 0 and 100,\n  reason: 'short explanation'\n}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.2
    });

    const response = (completion.choices?.[0]?.message?.content || '').trim();
    const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());

    const rawDecision = String(parsed.decision || '').toLowerCase();
    const mapped = rawDecision === 'approved' ? 'approved'
                 : rawDecision === 'review' ? 'needs-review'
                 : rawDecision === 'rejected' ? 'rejected'
                 : 'needs-review';

    const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));

    // Enforce mapping by score as guardrail
    const status = score > 70 ? 'approved' : score >= 40 ? 'needs-review' : 'rejected';

    return {
      status: status === 'needs-review' && mapped === 'approved' ? 'approved' : status,
      score,
      reason: parsed.reason || 'AI analysis complete'
    };
  } catch (err) {
    console.error('AI verifier error, using fallback:', err.message);
    // Improved fallback: boost for academic keywords/filetypes
    const academicBoost = 30;
    let score = 50; // neutral base
    const lowerTitle = title.toLowerCase();
    const lowerSubject = subject.toLowerCase();
    const lowerType = fileType.toLowerCase();
    
    // Academic keywords boost
    const academicWords = ['note', 'chapter', 'lecture', 'tutorial', 'assignment', 'solution', 'syllabus', 'past paper', 'question', 'theory', 'lab'];
    const matches = academicWords.filter(word => lowerTitle.includes(word) || lowerSubject.includes(word));
    if (matches.length > 0) score += academicBoost;
    
    // File type boost
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(lowerType)) score += 20;
    
    score = Math.min(95, Math.max(30, score)); // clamp 30-95
    const status = score > 70 ? 'approved' : score >= 45 ? 'needs-review' : 'rejected';
    
    const reason = `Fallback: ${matches.length ? 'Academic keywords detected' : 'Basic analysis'} (${score}/100)`;
    return { status, score, reason };
  }
}

module.exports = { verifyUpload };
