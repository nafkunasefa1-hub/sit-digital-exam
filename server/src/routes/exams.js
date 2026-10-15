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
  const { id, title, courseCode, subject, instructorName, scheduledStartTime, description, durationMinutes, totalMarks, randomizeQuestions, autoSuspend, maxViolations, questions } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Exam title is required' });

  const saved = store.saveExam({
    id,
    title,
    courseCode: courseCode || 'UNIV-101',
    subject: subject || 'Calculus I',
    instructorName: instructorName || '',
    scheduledStartTime: scheduledStartTime || null,
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

// POST AI Document Question Extractor
// Faithfully extracts existing questions from uploaded exam papers (.pdf, .doc, .docx, .txt)
// Strict requirement: Does NOT invent questions. Preserves math symbols, variables, and formulas.
router.post('/ai-generate', async (req, res) => {
  const { text, courseCode, subject, apiKey } = req.body;

  if (!text || text.trim().length < 5) {
    return res.status(400).json({ success: false, error: 'Document or exam text content is required.' });
  }

  // 1. If Gemini API Key is provided, use Google Gemini with strict extraction prompt
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `You are an academic exam extraction engine for Shegger Institute of Technology (SIT).
The provided text is an official university exam paper prepared by a professor${subject ? ` for ${subject}` : ''}.
Your job is to faithfully EXTRACT ALL the questions that already exist in this document EXACTLY as the teacher prepared them.
DO NOT generate new questions. DO NOT omit any questions or answer choices.

CRUCIAL MATHEMATICAL & SCIENTIFIC REQUIREMENTS:
1. Preserve ALL mathematical symbols, equations, and variables EXACTLY (e.g. x, y, z, t, theta, alpha, beta, lambda, pi, Delta).
2. Preserve all calculus and physics notations (e.g. fractions \\frac{a}{b}, integrals \\int_a^b, derivatives \\frac{df}{dx}, limits \\lim_{x \\to 0}, square roots \\sqrt{}, vectors \\vec{F}).
3. Convert all math expressions into clean LaTeX KaTeX syntax wrapped in single dollar signs ($...$) for inline math or double dollar signs ($$...$$) for display equations.
4. Preserve all chemical equations and molecular formulas (e.g. $\\text{H}_2\\text{O}$, $\\text{CO}_2$, $\\text{H}_2\\text{SO}_4$, oxidation states).

QUESTION PARSING:
- Extract every question in order.
- Determine question type: 'MCQ' (multiple choice), 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', or 'CODE'.
- For Multiple Choice: extract the question prompt and all choices (A, B, C, D...).
- Identify Correct Answers: If marked with an asterisk (*), bold, [x], 'Ans:', or listed in an Answer Key at the end of the document, set 'correctAnswer' to the exact correct choice text. If no answer is indicated, set 'correctAnswer': "".
- Points: If specified (e.g. [5 points], 10 marks), extract the number; otherwise default to 10.

Return ONLY a valid JSON array of objects without markdown backticks or commentary:
[
  {
    "id": "q_ext_1",
    "order": 1,
    "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY" | "CODE",
    "points": 10,
    "prompt": "Question text with LaTeX math...",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correctAnswer": "Choice A",
    "rubric": "Grading guidance or solution if in document"
  }
]

EXAM DOCUMENT TEXT:
${text.substring(0, 15000)}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawOutput) {
        const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json({ success: true, questions: parsed, source: 'Gemini Document Extractor' });
        }
      }
    } catch (err) {
      console.warn('Gemini extraction failed, falling back to SIT built-in extractor:', err.message);
    }
  }

  // 2. High-Precision Built-in SIT Document Extractor (Offline & Math-Preserving)
  try {
    const extracted = parseExamDocumentStrict(text);
    return res.json({ success: true, questions: extracted, source: 'Built-in SIT Document Extractor' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to extract exam questions: ' + err.message });
  }
});

// Strict Academic Exam Parser
// Preserves math symbols ($...$, Greek letters, exponents, integrals, fractions, chemistry)
function parseExamDocumentStrict(rawText) {
  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  // 1. Check for global Answer Key at the end of the document
  // (e.g. "Answer Key: 1. A 2. C 3. B" or "Answers: 1-B, 2-D")
  const answerKeyMap = {};
  let contentLines = [];
  let inAnswerKeySection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^(?:answer\s*key|solutions?\s*key)\s*[:\-]/i.test(line) ||
        (/^(?:answers?|solutions?)\s*[:\-]/i.test(line) && /\b\d+[\.\)\:\-]\s*[A-D]/i.test(line))) {
      inAnswerKeySection = true;
    }

    if (inAnswerKeySection) {
      // Find matches like "1. A", "1) B", "1-C", "1: D", "1. True"
      const matches = line.matchAll(/(?:^|[,\s])(\d+)[\.\)\:\-]\s*([A-Da-d]|True|False|[^\s,;]+)/gi);
      for (const m of matches) {
        answerKeyMap[parseInt(m[1], 10)] = m[2].trim();
      }
    } else {
      contentLines.push(lines[i]);
    }
  }

  // 2. Extract Questions
  const questions = [];
  let currentQ = null;
  let currentPromptLines = [];

  // Patterns for Question start:
  // e.g. "1. ", "1) ", "(1) ", "Question 1:", "Q1.", "Problem 1:", "1 - "
  const qStartRegex = /^(?:Question\s*|Q\s*|Problem\s*|Prob\s*|Exercise\s*)?\(?(\d+)[\.\)\:\-]\s*(.*)/i;
  // Option start: e.g. "A. ", "A) ", "(A) ", "[A] ", "a) "
  const optRegex = /^(?:\(?([A-Da-d])[\.\)\]]|\b([A-Da-d])\))\s*(.*)/;
  // Per-question answer indicator: "Answer: B", "Ans: A", "Correct: True"
  const singleAnsRegex = /^(?:Answer|Ans|Correct(?:\s*Answer)?)\s*[:\-]\s*(.+)/i;

  function finalizeCurrentQuestion() {
    if (!currentQ) return;
    currentQ.prompt = currentPromptLines.join('\n').trim();

    // Determine type
    if (currentQ.options.length >= 2) {
      const isTF = currentQ.options.length === 2 &&
        currentQ.options.some((o) => /^true$/i.test(o)) &&
        currentQ.options.some((o) => /^false$/i.test(o));
      currentQ.type = isTF ? 'TRUE_FALSE' : 'MCQ';
    } else if (/\b(explain|derive|calculate|discuss|prove|show that|analyze|describe)\b/i.test(currentQ.prompt) && currentQ.prompt.length > 80) {
      currentQ.type = 'ESSAY';
    } else {
      currentQ.type = 'SHORT_ANSWER';
    }

    // Map answer key if available
    const keyAnswer = answerKeyMap[currentQ.order];
    if (keyAnswer && !currentQ.correctAnswer) {
      if (['A', 'B', 'C', 'D'].includes(keyAnswer.toUpperCase())) {
        const idx = keyAnswer.toUpperCase().charCodeAt(0) - 65;
        if (currentQ.options[idx]) currentQ.correctAnswer = currentQ.options[idx];
        else currentQ.correctAnswer = keyAnswer;
      } else {
        currentQ.correctAnswer = keyAnswer;
      }
    }

    // Default points
    if (!currentQ.points) currentQ.points = 10;

    questions.push(currentQ);
    currentQ = null;
    currentPromptLines = [];
  }

  for (let i = 0; i < contentLines.length; i++) {
    const rawLine = contentLines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const qMatch = trimmed.match(qStartRegex);
    const optMatch = trimmed.match(optRegex);
    const ansMatch = trimmed.match(singleAnsRegex);

    if (qMatch && !optMatch) {
      // New Question Starts
      finalizeCurrentQuestion();
      const qNum = parseInt(qMatch[1], 10);
      currentQ = {
        id: 'q_ext_' + (questions.length + 1),
        order: questions.length + 1,
        type: 'MCQ',
        points: 10,
        prompt: '',
        options: [],
        correctAnswer: '',
        rubric: 'Standard Academic Evaluation'
      };

      // Check for points in prompt like "[10 pts]" or "(5 marks)"
      let promptText = qMatch[2];
      const ptsMatch = promptText.match(/\[(\d+)\s*(?:pts|points|marks)\]|\((\d+)\s*(?:pts|points|marks)\)/i);
      if (ptsMatch) {
        currentQ.points = parseInt(ptsMatch[1] || ptsMatch[2], 10);
        promptText = promptText.replace(ptsMatch[0], '').trim();
      }

      currentPromptLines.push(promptText);
    } else if (ansMatch && currentQ) {
      // Question-specific answer indicator
      const ansVal = ansMatch[1].trim();
      if (['A', 'B', 'C', 'D'].includes(ansVal.toUpperCase())) {
        const idx = ansVal.toUpperCase().charCodeAt(0) - 65;
        if (currentQ.options[idx]) currentQ.correctAnswer = currentQ.options[idx];
        else currentQ.correctAnswer = ansVal;
      } else {
        currentQ.correctAnswer = ansVal;
      }
    } else if (optMatch && currentQ) {
      // Option line
      const optLetter = (optMatch[1] || optMatch[2]).toUpperCase();
      let optText = optMatch[3].trim();

      // Check if option is marked as correct (e.g. "*A) option" or "A) option *" or "[x]")
      let isMarkedCorrect = false;
      if (optText.endsWith('*') || optText.startsWith('*') || /\[x\]/i.test(optText)) {
        isMarkedCorrect = true;
        optText = optText.replace(/\*/g, '').replace(/\[x\]/gi, '').trim();
      }

      // Check if other options follow on the SAME line!
      // (e.g. "A) 12    B) 24    C) 36    D) 48")
      const inlineOpts = optText.split(/\s+(?=[B-Db-d][\.\)\]]\s+)/);
      if (inlineOpts.length > 1) {
        currentQ.options.push(inlineOpts[0].trim());
        for (let j = 1; j < inlineOpts.length; j++) {
          const subMatch = inlineOpts[j].match(/^([B-Db-d])[\.\)\]]\s*(.*)/);
          if (subMatch) {
            currentQ.options.push(subMatch[2].trim());
          } else {
            currentQ.options.push(inlineOpts[j].trim());
          }
        }
      } else {
        currentQ.options.push(optText);
        if (isMarkedCorrect) {
          currentQ.correctAnswer = optText;
        }
      }
    } else if (currentQ) {
      // Continuation of prompt
      currentPromptLines.push(trimmed);
    }
  }

  finalizeCurrentQuestion();

  // If standard numbering was not found, split by double line breaks / problem paragraphs
  if (questions.length === 0) {
    const blocks = rawText.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 15);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      questions.push({
        id: 'q_ext_' + (i + 1),
        order: i + 1,
        type: /\b(derive|calculate|solve|find|evaluate|show|prove)\b/i.test(b) ? 'ESSAY' : 'SHORT_ANSWER',
        points: 10,
        prompt: b,
        options: [],
        correctAnswer: '',
        rubric: 'Instructor evaluation'
      });
    }
  }

  return questions;
}

module.exports = router;
module.exports.parseExamDocumentStrict = parseExamDocumentStrict;
