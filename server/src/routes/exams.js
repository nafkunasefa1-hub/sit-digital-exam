const express = require('express');
const router = express.Router();
const store = require('../store');

// GET all exams
router.get('/', (req, res) => {
  res.json({ success: true, exams: store.getExams() });
});

// GET exam by ID
router.get('/:id', (req, res) => {
  const exam = store.getExamById(req.params.id);
  if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
  res.json({ success: true, exam });
});

// POST create/update exam
router.post('/', (req, res) => {
  const { id, title, courseCode, description, durationMinutes, totalMarks, randomizeQuestions, autoSuspend, maxViolations, questions } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Exam title is required' });

  const saved = store.saveExam({
    id,
    title,
    courseCode: courseCode || 'UNIV-101',
    description: description || '',
    durationMinutes: Number(durationMinutes) || 60,
    totalMarks: Number(totalMarks) || 100,
    randomizeQuestions: Boolean(randomizeQuestions),
    autoSuspend: autoSuspend !== undefined ? Boolean(autoSuspend) : true,
    maxViolations: Number(maxViolations) || 3,
    questions: questions || [],
  });

  res.json({ success: true, exam: saved });
});

// DELETE exam
router.delete('/:id', (req, res) => {
  store.deleteExam(req.params.id);
  res.json({ success: true, message: 'Exam deleted successfully' });
});

// POST AI Question Generator & Document Extractor
router.post('/ai-generate', async (req, res) => {
  const { text, count = 5, type = 'ALL', apiKey } = req.body;

  if (!text || text.trim().length < 10) {
    return res.status(400).json({ success: false, error: 'Document or text content is required (at least 10 characters).' });
  }

  // 1. If Gemini API Key is provided, use Google Gemini
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `You are a university exam creator for Shegger Institute of Technology (SIT).
Generate exactly ${count} academic questions based strictly on the following text.
Question Types to include: ${type === 'ALL' ? 'Multiple Choice (MCQ), True/False, and Short Answer' : type}.

You MUST return ONLY a valid JSON array of objects without any markdown code formatting or backticks.
Each object must have the following schema:
{
  "id": "q_ai_1",
  "order": 1,
  "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
  "points": 10,
  "prompt": "Question text...",
  "options": ["Choice A", "Choice B", "Choice C", "Choice D"], // empty array if ESSAY or SHORT_ANSWER
  "correctAnswer": "Choice A", // or "True"/"False" or expected keyword
  "rubric": "Grading guidance..."
}

TEXT CONTENT:
${text.substring(0, 8000)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawOutput) {
        const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.json({ success: true, questions: parsed, source: 'Gemini AI' });
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to built-in extractor:', err.message);
    }
  }

  // 2. Intelligent Built-in Parser & Question Generator (Zero API Key Required!)
  try {
    const generated = extractOrGenerateQuestions(text, Number(count) || 5, type);
    return res.json({ success: true, questions: generated, source: 'Built-in SIT Intelligent Extractor' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to extract questions: ' + err.message });
  }
});

// Heuristic Parser for question extraction from documents
function extractOrGenerateQuestions(rawText, targetCount, preferredType) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const questions = [];

  // Check if document already has question patterns like "1. Question... A) ... B) ..."
  let currentQ = null;
  for (const line of lines) {
    const qMatch = line.match(/^(\d+)[\.\)\:]\s*(.+)/);
    const optMatch = line.match(/^([A-Da-d])[\.\)\:]\s*(.+)/);
    const ansMatch = line.match(/^(?:Answer|Ans|Correct)\s*[\:\-]\s*([A-Da-d]|True|False|.+)/i);

    if (qMatch) {
      if (currentQ && currentQ.prompt) questions.push(currentQ);
      currentQ = {
        id: 'q_ext_' + (questions.length + 1),
        order: questions.length + 1,
        type: 'MCQ',
        points: 10,
        prompt: qMatch[2],
        options: [],
        correctAnswer: '',
        rubric: 'Standard evaluation'
      };
    } else if (optMatch && currentQ) {
      currentQ.options.push(optMatch[2]);
    } else if (ansMatch && currentQ) {
      const ansVal = ansMatch[1].trim();
      if (['A', 'B', 'C', 'D'].includes(ansVal.toUpperCase())) {
        const idx = ansVal.toUpperCase().charCodeAt(0) - 65;
        if (currentQ.options[idx]) currentQ.correctAnswer = currentQ.options[idx];
      } else {
        currentQ.correctAnswer = ansVal;
      }
    }
  }
  if (currentQ && currentQ.prompt) questions.push(currentQ);

  // If document had structured questions and we found some, finalize them
  if (questions.length > 0) {
    questions.forEach((q) => {
      if (q.options.length === 0) {
        q.type = 'SHORT_ANSWER';
      } else if (!q.correctAnswer && q.options.length > 0) {
        q.correctAnswer = q.options[0];
      }
    });
    return questions.slice(0, targetCount);
  }

  // Otherwise, document is lecture notes / text: intelligently generate questions from sentences!
  const sentences = rawText
    .replace(/\n/g, ' ')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 35 && s.length < 250);

  const fallbackQuestions = [];
  const countToMake = Math.min(targetCount, Math.max(3, sentences.length));

  for (let i = 0; i < countToMake; i++) {
    const sentence = sentences[i % sentences.length];
    const qIndex = i + 1;

    if (preferredType === 'TRUE_FALSE' || (preferredType === 'ALL' && i % 3 === 1)) {
      fallbackQuestions.push({
        id: 'q_gen_' + qIndex,
        order: qIndex,
        type: 'TRUE_FALSE',
        points: 5,
        prompt: `Based on the provided materials, determine if the following statement is True or False: "${sentence}"`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        rubric: 'Conceptual accuracy based on text.'
      });
    } else if (preferredType === 'ESSAY' || (preferredType === 'ALL' && i % 3 === 2)) {
      fallbackQuestions.push({
        id: 'q_gen_' + qIndex,
        order: qIndex,
        type: 'ESSAY',
        points: 20,
        prompt: `Elaborate thoroughly on the concepts discussed in the following excerpt: "${sentence.slice(0, 100)}...". Discuss mechanisms, advantages, and engineering trade-offs.`,
        options: [],
        correctAnswer: 'Subjective response evaluated by instructor rubric.',
        rubric: 'Student demonstrates full mastery of key concepts.'
      });
    } else {
      // MCQ
      const words = sentence.split(' ').filter((w) => w.length > 5);
      const keyWord = words.length > 0 ? words[Math.floor(words.length / 2)].replace(/[^a-zA-Z]/g, '') : 'Concept';
      const promptText = sentence.replace(new RegExp('\\b' + keyWord + '\\b', 'i'), '_______');

      fallbackQuestions.push({
        id: 'q_gen_' + qIndex,
        order: qIndex,
        type: 'MCQ',
        points: 10,
        prompt: `Fill in the blank in the following principle: "${promptText}"`,
        options: [
          keyWord,
          'Alternative ' + keyWord,
          'Inverse ' + keyWord,
          'None of the above'
        ],
        correctAnswer: keyWord,
        rubric: 'Direct keyword identification.'
      });
    }
  }

  return fallbackQuestions;
}

module.exports = router;
