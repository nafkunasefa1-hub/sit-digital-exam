const express = require('express');
const router = express.Router();
const store = require('../store');

// GET all grades and submissions for a session
router.get('/session/:pin', (req, res) => {
  const pin = req.params.pin;
  const session = store.getSession(pin);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

  const exam = store.getExamById(session.examId);
  const submissions = store.getAllSubmissionsForSession(pin);

  // Compute grading report
  const results = [];
  const students = Object.values(session.students);

  for (const st of students) {
    const sub = submissions.find((s) => s.studentId === st.studentId);
    let autoScore = 0;
    let maxAutoScore = 0;
    let manualScore = sub && sub.manualScore !== undefined ? sub.manualScore : null;

    if (exam && sub && sub.answers) {
      exam.questions.forEach((q) => {
        if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
          maxAutoScore += Number(q.points) || 10;
          if (sub.answers[q.id] === q.correctAnswer) {
            autoScore += Number(q.points) || 10;
          }
        }
      });
    }

    const totalScore = autoScore + (manualScore || 0);

    results.push({
      studentId: st.studentId,
      studentName: st.studentName,
      seatNumber: st.seatNumber,
      status: st.status,
      violationsCount: st.violationsCount || 0,
      violations: st.violations || [],
      answeredCount: st.answeredCount || 0,
      autoScore,
      maxAutoScore,
      manualScore,
      totalScore,
      answers: sub ? sub.answers : {},
      submittedAt: sub ? sub.submittedAt : null,
    });
  }

  res.json({
    success: true,
    examTitle: session.examTitle,
    roomName: session.roomName,
    totalStudents: results.length,
    results,
  });
});

// POST grade individual subjective/essay question
router.post('/grade-manual', (req, res) => {
  const { sessionPin, studentId, manualScore, teacherNotes } = req.body;
  const sub = store.getSubmission(sessionPin, studentId);
  if (!sub) return res.status(404).json({ success: false, error: 'Submission not found' });

  sub.manualScore = Number(manualScore) || 0;
  sub.teacherNotes = teacherNotes || '';
  sub.gradedAt = new Date().toISOString();
  store.persistData();

  res.json({ success: true, submission: sub });
});

// Export CSV
router.get('/export-csv/:pin', (req, res) => {
  const pin = req.params.pin;
  const session = store.getSession(pin);
  if (!session) return res.status(404).send('Session not found');

  const students = Object.values(session.students);
  let csv = 'Student ID,Full Name,Seat Number,Status,Violations Count,Answered,Last Heartbeat\n';

  students.forEach((s) => {
    csv += `"${s.studentId}","${s.studentName}","${s.seatNumber}","${s.status}",${s.violationsCount},${s.answeredCount},"${s.lastHeartbeat}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=exam_session_${pin}_report.csv`);
  res.send(csv);
});

module.exports = router;
