const express = require('express');
const router = express.Router();
const store = require('../store');

// GET all sessions
router.get('/', (req, res) => {
  res.json({ success: true, sessions: store.getAllSessions() });
});

// GET session by PIN
router.get('/:pin', (req, res) => {
  const session = store.getSession(req.params.pin);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, session });
});

// POST create new In-Hall session
router.post('/create', (req, res) => {
  const { examId, roomName, durationMinutes, allowedSubnet } = req.body;
  if (!examId) return res.status(400).json({ success: false, error: 'examId is required' });

  try {
    const session = store.createSession(examId, roomName, durationMinutes, allowedSubnet);
    res.json({ success: true, session });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST update session status (PAUSE, RESUME, END)
router.post('/:pin/status', (req, res) => {
  const { status } = req.body;
  const updated = store.updateSessionStatus(req.params.pin, status);
  if (!updated) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, session: updated });
});

// POST simulate 250 students (In-Hall testing utility)
router.post('/:pin/simulate', (req, res) => {
  const pin = req.params.pin;
  const session = store.getSession(pin);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

  const count = Number(req.body.count) || 250;
  const devices = [
    { os: 'Android 14', platform: 'Mobile Phone', battery: 85 },
    { os: 'iOS 17.5', platform: 'iPhone', battery: 92 },
    { os: 'Windows 11', platform: 'Laptop', battery: 100 },
    { os: 'macOS Sonoma', platform: 'MacBook', battery: 78 },
    { os: 'iPadOS 17', platform: 'Tablet', battery: 64 },
  ];

  for (let i = 1; i <= count; i++) {
    const sId = `STU-${1000 + i}`;
    const name = `Student ${i}`;
    const seat = `Row ${String.fromCharCode(65 + Math.floor((i - 1) / 25))}-${((i - 1) % 25) + 1}`;
    const dev = devices[i % devices.length];

    const student = store.registerOrUpdateStudent(pin, {
      studentId: sId,
      studentName: name,
      seatNumber: seat,
      deviceInfo: { ...dev, battery: Math.max(15, 100 - (i % 45)) },
    });

    student.currentQuestionIndex = Math.min(10, Math.floor(Math.random() * 8) + 1);
    student.answeredCount = Math.floor(Math.random() * 7);

    // Simulate realistic violations on ~8% of students
    if (i % 12 === 0) {
      store.recordViolation(pin, sId, 'FOCUS_LOST', 'Window lost focus / Alt-Tab detected');
    }
    if (i % 25 === 0) {
      store.recordViolation(pin, sId, 'FULLSCREEN_EXIT', 'Application exited fullscreen mode');
    }
    if (i % 40 === 0) {
      store.recordViolation(pin, sId, 'APP_MINIMIZED', 'Exam window minimized to background');
    }
  }

  res.json({
    success: true,
    message: `Successfully populated session ${pin} with ${count} students and realistic proctoring telemetry`,
    totalStudents: Object.keys(session.students).length,
  });
});

module.exports = router;
