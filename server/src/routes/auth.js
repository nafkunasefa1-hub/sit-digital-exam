const express = require('express');
const router = express.Router();

// Institutional Security Credentials for Shegger Institute of Technology (SIT)
// (These can be customized by the institution at any time)
const CREDENTIALS = {
  admin: {
    username: 'admin',
    password: 'sit@admin2024',
    pin: '779900',
    role: 'ADMIN',
    name: 'Chief Examination Administrator'
  },
  teacher: {
    username: 'teacher',
    password: 'sit@faculty2024',
    pin: '112233',
    role: 'TEACHER',
    name: 'SIT Faculty Instructor'
  }
};

// In-memory active tokens
const activeTokens = new Set();

function generateToken(role) {
  const token = 'sit_' + role.toLowerCase() + '_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  activeTokens.add(token);
  return token;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { role, username, password, pin } = req.body;

  if (role === 'ADMIN') {
    const cred = CREDENTIALS.admin;
    if ((username === cred.username && password === cred.password) || pin === cred.pin) {
      const token = generateToken('ADMIN');
      return res.json({
        success: true,
        token,
        role: 'ADMIN',
        name: cred.name
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid Administrator credentials or Master PIN.' });
  }

  if (role === 'TEACHER') {
    const cred = CREDENTIALS.teacher;
    if ((username === cred.username && password === cred.password) || pin === cred.pin) {
      const token = generateToken('TEACHER');
      return res.json({
        success: true,
        token,
        role: 'TEACHER',
        name: cred.name
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid Faculty credentials or Faculty Passcode.' });
  }

  return res.status(400).json({ success: false, error: 'Invalid authentication role.' });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { token, role } = req.body;
  if (token && activeTokens.has(token)) {
    return res.json({ success: true, valid: true });
  }
  return res.status(401).json({ success: false, valid: false, error: 'Session expired or invalid.' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { token } = req.body;
  if (token) activeTokens.delete(token);
  res.json({ success: true });
});

module.exports = {
  router,
  activeTokens
};
