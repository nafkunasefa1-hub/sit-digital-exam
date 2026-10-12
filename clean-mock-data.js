const fs = require('fs');
const path = require('path');

const sessionsFile = path.join(__dirname, 'server', 'data', 'sessions.json');
if (fs.existsSync(sessionsFile)) {
  const sessions = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
  for (const pin in sessions) {
    sessions[pin].students = {}; // Clear all mock students
    sessions[pin].maxViolations = 3;
    sessions[pin].autoSuspend = true;
  }
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  console.log('✅ Cleaned sessions: All mock students removed. Ready for live sign-ins.');
}
