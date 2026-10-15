const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const EXAMS_FILE = path.join(DATA_DIR, 'exams.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Memory caches
let exams = [];
let sessions = {}; // sessionPin -> Session
let submissions = {}; // `${sessionPin}_${studentId}` -> Submission
let activeSockets = new Map(); // socket -> { role, sessionPin, studentId }

function loadData() {
  try {
    if (fs.existsSync(EXAMS_FILE)) {
      exams = JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf8'));
    }
    if (fs.existsSync(SESSIONS_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      for (const pin in sessions) {
        sessions[pin].students = sessions[pin].students || {};
      }
    }
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading data from disk:', err);
  }
}

function persistData() {
  try {
    fs.writeFileSync(EXAMS_FILE, JSON.stringify(exams, null, 2));
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
  } catch (err) {
    console.error('Error saving data to disk:', err);
  }
}

// Initial load
loadData();

module.exports = {
  // Exams
  getExams() {
    return exams;
  },
  getExamById(id) {
    return exams.find((e) => e.id === id);
  },
  saveExam(exam) {
    if (!exam.id) exam.id = 'exam_' + uuidv4().slice(0, 8);
    exam.updatedAt = new Date().toISOString();
    exam.maxViolations = Number(exam.maxViolations) || 3; // Rule: default 3 violations threshold
    const idx = exams.findIndex((e) => e.id === exam.id);
    if (idx >= 0) {
      exams[idx] = exam;
    } else {
      exam.createdAt = new Date().toISOString();
      exams.push(exam);
    }
    persistData();
    return exam;
  },
  deleteExam(id) {
    exams = exams.filter((e) => e.id !== id);
    persistData();
  },

  // Sessions (In-Hall Room with PIN)
  createSession(examId, roomName, durationMinutes, options = {}) {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) throw new Error('Exam not found');

    const sessionPin = Math.floor(100000 + Math.random() * 900000).toString();
    const isScheduled = Boolean(options.scheduledStartTime && new Date(options.scheduledStartTime) > new Date());

    const session = {
      pin: sessionPin,
      examId,
      examTitle: exam.title,
      subject: options.subject || exam.subject || 'Calculus I',
      courseCode: options.courseCode || exam.courseCode || 'MATH-101',
      instructorName: options.instructorName || exam.instructorName || 'SIT Faculty Instructor',
      roomName: roomName || 'Main Examination Hall',
      durationMinutes: Number(durationMinutes) || Number(exam.durationMinutes) || 60,
      scheduledStartTime: options.scheduledStartTime || null,
      instructions: options.instructions || exam.instructions || 'Read each question thoroughly. Kiosk lockdown and focus tracking are strictly enforced.',
      maxViolations: Number(options.maxViolations) || Number(exam.maxViolations) || 3,
      autoSuspend: options.autoSuspend !== undefined ? Boolean(options.autoSuspend) : true,
      status: isScheduled ? 'SCHEDULED' : 'ACTIVE', // SCHEDULED, ACTIVE, PAUSED, ENDED
      startTime: isScheduled ? options.scheduledStartTime : new Date().toISOString(),
      endTime: null,
      students: {},
      createdAt: new Date().toISOString(),
    };

    sessions[sessionPin] = session;
    persistData();
    return session;
  },

  forceStartSession(pin) {
    const session = sessions[pin];
    if (!session) return null;
    session.status = 'ACTIVE';
    session.startTime = new Date().toISOString();
    session.scheduledStartTime = null;
    persistData();
    return session;
  },

  getSession(pin) {
    return sessions[pin];
  },

  getAllSessions() {
    return Object.values(sessions);
  },

  updateSessionStatus(pin, status) {
    if (sessions[pin]) {
      sessions[pin].status = status;
      if (status === 'ENDED') {
        sessions[pin].endTime = new Date().toISOString();
      }
      persistData();
      return sessions[pin];
    }
    return null;
  },

  // Student Registration on Login
  registerOrUpdateStudent(pin, studentInfo) {
    const session = sessions[pin];
    if (!session) return null;

    const { studentId, studentName, seatNumber, deviceInfo, idPhoto, clientIp } = studentInfo;

    // Subnet Check if configured
    if (session.allowedSubnet && clientIp) {
      if (!clientIp.includes(session.allowedSubnet)) {
        throw new Error(`ACCESS DENIED: Your network IP (${clientIp}) does not match the required SIT Campus Subnet (${session.allowedSubnet}).`);
      }
    }

    if (!session.students[studentId]) {
      session.students[studentId] = {
        studentId,
        studentName: studentName || 'Student ' + studentId,
        seatNumber: seatNumber || 'Unassigned',
        deviceInfo: deviceInfo || { os: 'Unknown', platform: 'Web', battery: 100 },
        clientIp: clientIp || '127.0.0.1',
        idPhoto: idPhoto || null, // Check-in face/ID snapshot
        latestSnapshot: idPhoto || null, // Periodic anti-cheat snapshot
        snapshotHistory: idPhoto ? [{ timestamp: new Date().toISOString(), image: idPhoto }] : [],
        status: 'ACTIVE', // ACTIVE, WARNING, SUSPENDED, DISCONNECTED, SUBMITTED
        isSuspended: false,
        joinedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        currentQuestionIndex: 0,
        answeredCount: 0,
        violationsCount: 0,
        violations: [], // [{ id, type, description, timestamp }]
        extraTimeGrantedMinutes: 0,
        warningMessage: null,
      };
    } else {
      const st = session.students[studentId];
      if (st.status !== 'SUBMITTED' && !st.isSuspended) {
        st.status = 'ACTIVE';
      }
      st.lastHeartbeat = new Date().toISOString();
      if (deviceInfo) st.deviceInfo = { ...st.deviceInfo, ...deviceInfo };
      if (idPhoto && !st.idPhoto) st.idPhoto = idPhoto;
    }

    persistData();
    return session.students[studentId];
  },

  // Record periodic webcam snapshot
  recordStudentSnapshot(pin, studentId, snapshotImage) {
    const session = sessions[pin];
    if (!session || !session.students[studentId]) return null;

    const st = session.students[studentId];
    st.latestSnapshot = snapshotImage;
    if (!st.snapshotHistory) st.snapshotHistory = [];
    st.snapshotHistory.unshift({ timestamp: new Date().toISOString(), image: snapshotImage });
    if (st.snapshotHistory.length > 6) st.snapshotHistory.pop(); // keep last 6

    persistData();
    return st;
  },

  // Record Violation and Check Suspension (Rule: 3 Violations -> Suspended)
  recordViolation(pin, studentId, violationType, description) {
    const session = sessions[pin];
    if (!session || !session.students[studentId]) return null;

    const st = session.students[studentId];
    if (st.status === 'SUBMITTED' || st.isSuspended) {
      return { student: st, violation: null, wasSuspendedNow: false };
    }

    const violationEntry = {
      id: uuidv4().slice(0, 8),
      type: violationType, // FOCUS_LOST, APP_MINIMIZED, FULLSCREEN_EXIT, DEVTOOLS, SPLIT_SCREEN
      description: description || 'Exam lockdown rule breached',
      timestamp: new Date().toISOString(),
    };

    st.violations.push(violationEntry);
    st.violationsCount = st.violations.length;

    const maxAllowed = session.maxViolations || 3;
    let wasSuspendedNow = false;

    // RULE: If student reaches or exceeds max violations, auto-suspend
    if (session.autoSuspend && st.violationsCount >= maxAllowed) {
      st.status = 'SUSPENDED';
      st.isSuspended = true;
      wasSuspendedNow = true;
    } else {
      st.status = 'WARNING';
    }

    persistData();
    return { student: st, violation: violationEntry, wasSuspendedNow, maxAllowed };
  },

  // Admin / Proctor Controls
  applyAdminAction(pin, studentId, action, payload = {}) {
    const session = sessions[pin];
    if (!session || !session.students[studentId]) return null;

    const st = session.students[studentId];

    switch (action) {
      case 'LIFT_SUSPENSION':
        st.isSuspended = false;
        st.status = 'ACTIVE';
        st.warningMessage = 'Your suspension has been lifted by the Administrator. Please resume your exam.';
        break;

      case 'SUSPEND':
        st.isSuspended = true;
        st.status = 'SUSPENDED';
        break;

      case 'ADD_TIME':
        st.extraTimeGrantedMinutes = (st.extraTimeGrantedMinutes || 0) + (payload.minutes || 5);
        break;

      case 'SEND_WARNING':
        st.warningMessage = payload.message || 'Attention: Maintain focus on your exam screen.';
        break;

      case 'CLEAR_WARNING':
        st.warningMessage = null;
        if (st.status === 'WARNING') st.status = 'ACTIVE';
        break;

      case 'FORCE_SUBMIT':
        st.status = 'SUBMITTED';
        break;

      case 'RESET_VIOLATIONS':
        st.violationsCount = 0;
        st.violations = [];
        st.isSuspended = false;
        st.status = 'ACTIVE';
        break;

      case 'DISQUALIFY':
        st.status = 'DISQUALIFIED';
        st.isSuspended = true;
        break;

      default:
        break;
    }

    persistData();
    return st;
  },

  // Student Answers Sync
  saveStudentAnswers(pin, studentId, answers, isFinalSubmission = false) {
    const subKey = `${pin}_${studentId}`;
    const sub = submissions[subKey] || {
      pin,
      studentId,
      answers: {},
      score: null,
      submittedAt: null,
      autoGraded: false,
    };

    sub.answers = { ...sub.answers, ...answers };
    sub.lastSaved = new Date().toISOString();

    if (isFinalSubmission) {
      sub.submittedAt = new Date().toISOString();
      if (sessions[pin] && sessions[pin].students[studentId]) {
        sessions[pin].students[studentId].status = 'SUBMITTED';
      }
    }

    submissions[subKey] = sub;

    if (sessions[pin] && sessions[pin].students[studentId]) {
      sessions[pin].students[studentId].answeredCount = Object.keys(sub.answers).length;
    }

    persistData();
    return sub;
  },

  getSubmission(pin, studentId) {
    return submissions[`${pin}_${studentId}`];
  },

  getAllSubmissionsForSession(pin) {
    return Object.values(submissions).filter((s) => s.pin === pin);
  },

  getAllStudentsAcrossSessions() {
    const list = [];
    for (const pin in sessions) {
      const sess = sessions[pin];
      const exam = exams.find((e) => e.id === sess.examId);
      for (const studentId in (sess.students || {})) {
        const st = sess.students[studentId];
        list.push({
          ...st,
          sessionPin: pin,
          roomName: sess.roomName || 'Campus Main Hall',
          examTitle: sess.examTitle || (exam ? exam.title : 'Examination'),
          subject: sess.subject || (exam ? exam.subject : 'Course'),
          courseCode: sess.courseCode || (exam ? exam.courseCode : 'SIT-101'),
          durationMinutes: sess.durationMinutes || 90,
          scheduledStartTime: sess.scheduledStartTime || null,
          sessionStatus: sess.status || 'ACTIVE'
        });
      }
    }
    return list;
  },

  getStudentFullDetails(pin, studentId) {
    const session = sessions[pin];
    if (!session || !session.students || !session.students[studentId]) return null;
    const student = session.students[studentId];
    const exam = exams.find((e) => e.id === session.examId);
    const submission = submissions[`${pin}_${studentId}`] || { answers: {} };
    return {
      student,
      session: {
        pin: session.pin,
        roomName: session.roomName,
        examTitle: session.examTitle,
        subject: session.subject || (exam ? exam.subject : 'Calculus I'),
        courseCode: session.courseCode || (exam ? exam.courseCode : 'MATH-101'),
        instructorName: session.instructorName || (exam ? exam.instructorName : 'Faculty Instructor'),
        durationMinutes: session.durationMinutes,
        scheduledStartTime: session.scheduledStartTime,
        instructions: session.instructions,
        status: session.status,
        startTime: session.startTime
      },
      exam: exam || null,
      submission
    };
  },

  activeSockets,
  persistData,
};
