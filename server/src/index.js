const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const examsRouter = require('./routes/exams');
const sessionsRouter = require('./routes/sessions');
const gradesRouter = require('./routes/grades');
const { setupWebSocket } = require('./socketHandler');
const { seedDatabase } = require('./seed');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Static directory for client web apps
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'client', 'public');
app.use(express.static(PUBLIC_DIR));

// API Routes
app.use('/api/exams', examsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/grades', gradesRouter);

// Platform Routes
app.get('/student', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'student.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'teacher.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Seed data if first run
seedDatabase();

// WebSocket server setup
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Detect local LAN IPs for Campus Wi-Fi
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('================================================================');
  console.log('🎓 DIGITAL EXAM ECOSYSTEM - 3 UNIFIED PLATFORMS ACTIVE');
  console.log(`📡 Local Host:         http://localhost:${PORT}`);
  if (ips.length > 0) {
    ips.forEach((ip) => {
      console.log(`📶 Campus Wi-Fi URL:   http://${ip}:${PORT}`);
    });
  }
  console.log('----------------------------------------------------------------');
  console.log(`📱 1. Student Exam:    http://localhost:${PORT}/student`);
  console.log(`👨‍🏫 2. Teacher Portal:  http://localhost:${PORT}/teacher`);
  console.log(`🛡️ 3. Admin Center:    http://localhost:${PORT}/admin`);
  console.log('================================================================');
});
