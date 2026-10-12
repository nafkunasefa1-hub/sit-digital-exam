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
  const { id, title, courseCode, description, durationMinutes, totalMarks, randomizeQuestions, questions } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Exam title is required' });

  const saved = store.saveExam({
    id,
    title,
    courseCode: courseCode || 'UNIV-101',
    description: description || '',
    durationMinutes: Number(durationMinutes) || 60,
    totalMarks: Number(totalMarks) || 100,
    randomizeQuestions: Boolean(randomizeQuestions),
    questions: questions || [],
  });

  res.json({ success: true, exam: saved });
});

// DELETE exam
router.delete('/:id', (req, res) => {
  store.deleteExam(req.params.id);
  res.json({ success: true, message: 'Exam deleted successfully' });
});

module.exports = router;
