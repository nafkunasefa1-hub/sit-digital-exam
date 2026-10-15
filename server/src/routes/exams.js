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

  // Pre-configured Gemini Key (from environment or pre-configured fallback)
  const preconfiguredKey = Buffer.from('QVEuQWI4Uk42SVRsei00SjVQUDN0VURGVU1RbmpuQWpXUjdBYkx5Zkh2Nzhld3N6b2s2dWc=', 'base64').toString('utf8');
  const effectiveApiKey = (apiKey && apiKey.trim().length > 10)
    ? apiKey.trim()
    : (process.env.GEMINI_API_KEY || preconfiguredKey);

  // 1. Try Gemini AI Academic Extractor with high-availability models
  if (effectiveApiKey) {
    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash'
    ];

    const prompt = `You are an academic exam extraction engine for Shegger Institute of Technology (SIT).
The provided text is an official university exam paper prepared by a professor${subject ? ` for ${subject}` : ''}.
Your job is to faithfully EXTRACT EVERY SINGLE QUESTION that exists in this document into clean, individual, structured question items.
DO NOT group multiple questions together into one question prompt. Each question must be its own item in the JSON array.

CRITICAL MATHEMATICAL & SCIENTIFIC REQUIREMENTS:
1. Preserve ALL mathematical symbols, equations, and variables EXACTLY (e.g. x, y, z, t, \\theta, \\alpha, \\beta, \\lambda, \\pi, \\Delta).
2. Fix distorted symbols from OCR / PDF extraction:
   - In Calculus integrals, if an integral sign was read as 'R', e.g. "1. R x 4 ln x dx =", you MUST format it as: "Evaluate the integral: $\\int x^4 \\ln(x) \\, dx$".
   - Convert fractions to LaTeX: $\\frac{a}{b}$.
   - Convert integrals, limits, roots, and derivatives to standard LaTeX: $\\int_{a}^{b} f(x) \\, dx$, $\\lim_{x \\to 0}$, $\\sqrt{x^2 + a^2}$, $\\frac{df}{dx}$.
   - Convert vectors: $\\vec{F} = m \\vec{a}$.
   - Preserve all chemical formulas: $\\text{H}_2\\text{O}$, $\\text{CO}_2$, $\\text{H}_2\\text{SO}_4$, oxidation states.
3. QUESTION TYPE ACCURACY:
   - If a question asks to evaluate an integral, calculate a value, or solve a problem WITHOUT multiple choice options, set type = "SHORT_ANSWER" or "ESSAY".
     DO NOT add fake choices like ["Choice A", "Choice B"]! Keep options = [].
   - If the exam paper actually has multiple choices (A, B, C, D), set type = "MCQ" or "MULTI_SELECT" and list all choices in options: ["...", "..."].
   - If it's a True/False question, set type = "TRUE_FALSE" and options = ["True", "False"].
4. CORRECT ANSWERS & RUBRIC:
   - If the document gives the answer or if it's an evaluation of standard integrals or formulas, provide the exact mathematical answer in 'correctAnswer' (e.g. "\\frac{x^5}{5} \\ln(x) - \\frac{x^5}{25} + C").
5. POINTS:
   - Distribute the section points evenly across questions (e.g. 40 points total for 10 questions = 4 points each) or default to 10 points.

Respond ONLY with a valid JSON array of question objects without markdown backticks:
[
  {
    "id": "q_ext_1",
    "order": 1,
    "type": "SHORT_ANSWER",
    "points": 4,
    "prompt": "Evaluate the integral: $\\\\int x^4 \\\\ln(x) \\\\, dx$",
    "options": [],
    "correctAnswer": "\\\\frac{x^5}{5} \\\\ln(x) - \\\\frac{x^5}{25} + C",
    "rubric": "Use integration by parts with u = ln(x) and dv = x^4 dx"
  }
]

EXAM DOCUMENT TEXT:
${text.substring(0, 25000)}`;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json'
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawOutput) {
            const cleanJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return res.json({
                success: true,
                questions: parsed,
                source: `Gemini AI (${model})`
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Extraction with ${model} failed, trying next:`, err.message);
      }
    }
  }

  // 2. High-Precision Built-in SIT Document Extractor (Offline fallback)
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
  // Pre-process: split concatenated inline questions like "1. ... 2. ... 3. ..." onto separate lines
  let preprocessed = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(?<=[^\d\n])\s+(\d+)[\.\)\:\-]\s+/g, '\n$1. ');

  const lines = preprocessed.split('\n');

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
