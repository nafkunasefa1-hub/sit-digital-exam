const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');

// Default initial faculty roster for Shegger Institute of Technology
const DEFAULT_TEACHERS = [
  {
    id: 'fac_101',
    name: 'Dr. Tsegaye Alemu',
    email: 'tsegaye.alemu@sit.edu.et',
    username: 'tsegaye.a',
    password: 'sit@faculty2024',
    pin: '112233',
    facultyId: 'SIT-FAC-101',
    department: 'Department of Mathematics',
    course: 'Calculus I',
    courseCode: 'MATH-101',
    status: 'ACTIVE',
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'fac_102',
    name: 'Dr. Bethlehem Desta',
    email: 'bethlehem.desta@sit.edu.et',
    username: 'bethlehem.d',
    password: 'sit@faculty2024',
    pin: '223344',
    facultyId: 'SIT-FAC-102',
    department: 'Department of Chemical Sciences',
    course: 'Chemistry I',
    courseCode: 'CHEM-101',
    status: 'ACTIVE',
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'fac_103',
    name: 'Prof. Yohannes Haile',
    email: 'yohannes.haile@sit.edu.et',
    username: 'yohannes.h',
    password: 'sit@faculty2024',
    pin: '334455',
    facultyId: 'SIT-FAC-103',
    department: 'Department of Applied Physics',
    course: 'Physics I',
    courseCode: 'PHYS-101',
    status: 'ACTIVE',
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'fac_104',
    name: 'Dr. Selamawit Bekele',
    email: 'selamawit.bekele@sit.edu.et',
    username: 'selamawit.b',
    password: 'sit@faculty2024',
    pin: '445566',
    facultyId: 'SIT-FAC-104',
    department: 'Department of Languages & Academic Writing',
    course: 'English I',
    courseCode: 'ENGL-101',
    status: 'ACTIVE',
    createdAt: '2026-10-10T08:00:00.000Z'
  },
  {
    id: 'fac_105',
    name: 'SIT Faculty Instructor',
    email: 'teacher@sit.edu.et',
    username: 'teacher',
    password: 'sit@faculty2024',
    pin: '112233',
    facultyId: 'SIT-FAC-100',
    department: 'General Engineering Faculty',
    course: 'Calculus I',
    courseCode: 'MATH-101',
    status: 'ACTIVE',
    createdAt: '2026-10-10T08:00:00.000Z'
  }
];

let teachers = [];

function loadTeachers() {
  try {
    if (fs.existsSync(TEACHERS_FILE)) {
      const data = fs.readFileSync(TEACHERS_FILE, 'utf8');
      teachers = JSON.parse(data);
    } else {
      teachers = [...DEFAULT_TEACHERS];
      persistTeachers();
    }
  } catch (err) {
    console.error('Error loading teachers:', err);
    teachers = [...DEFAULT_TEACHERS];
  }
}

function persistTeachers() {
  try {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), 'utf8');
  } catch (err) {
    console.error('Error persisting teachers:', err);
  }
}

loadTeachers();

function getTeachersList() {
  return teachers;
}

function findTeacherByCredentials(username, password, pin) {
  return teachers.find((t) => {
    if (t.status !== 'ACTIVE') return false;
    if (pin && t.pin === pin) return true;
    if (username && password && t.username === username && t.password === password) return true;
    if (username && password && t.email === username && t.password === password) return true;
    return false;
  });
}

// GET all teachers
router.get('/', (req, res) => {
  res.json({
    success: true,
    count: teachers.length,
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      username: t.username,
      pin: t.pin,
      facultyId: t.facultyId,
      department: t.department,
      course: t.course,
      courseCode: t.courseCode,
      status: t.status,
      createdAt: t.createdAt
    }))
  });
});

// POST add a new teacher
router.post('/', (req, res) => {
  const { name, email, username, password, pin, facultyId, department, course, courseCode } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Teacher full name is required.' });
  }

  const cleanName = name.trim();
  const cleanEmail = email ? email.trim().toLowerCase() : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@sit.edu.et`;
  const cleanUsername = username && username.trim() ? username.trim() : cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
  const cleanPin = pin && pin.trim() ? pin.trim() : Math.floor(100000 + Math.random() * 900000).toString();
  const cleanPassword = password && password.trim() ? password.trim() : 'sit@faculty2024';
  const cleanFacultyId = facultyId && facultyId.trim() ? facultyId.trim() : `SIT-FAC-${Math.floor(100 + Math.random() * 900)}`;

  // Check for duplicate username or email
  const existing = teachers.find(
    (t) => t.username.toLowerCase() === cleanUsername.toLowerCase() || t.email.toLowerCase() === cleanEmail.toLowerCase()
  );
  if (existing) {
    return res.status(400).json({
      success: false,
      error: `A teacher with username "${cleanUsername}" or email "${cleanEmail}" already exists.`
    });
  }

  const newTeacher = {
    id: 'fac_' + uuidv4().slice(0, 8),
    name: cleanName,
    email: cleanEmail,
    username: cleanUsername,
    password: cleanPassword,
    pin: cleanPin,
    facultyId: cleanFacultyId,
    department: department ? department.trim() : 'Academic Department',
    course: course ? course.trim() : 'Calculus I',
    courseCode: courseCode ? courseCode.trim() : 'MATH-101',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  teachers.unshift(newTeacher);
  persistTeachers();

  res.json({
    success: true,
    message: `Teacher ${cleanName} added successfully.`,
    teacher: newTeacher
  });
});

// PUT update teacher
router.put('/:id', (req, res) => {
  const teacherId = req.params.id;
  const idx = teachers.findIndex((t) => t.id === teacherId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  const { name, email, username, password, pin, facultyId, department, course, courseCode, status } = req.body;
  const current = teachers[idx];

  teachers[idx] = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    email: email !== undefined ? email.trim() : current.email,
    username: username !== undefined ? username.trim() : current.username,
    password: password !== undefined && password.trim() ? password.trim() : current.password,
    pin: pin !== undefined && pin.trim() ? pin.trim() : current.pin,
    facultyId: facultyId !== undefined ? facultyId.trim() : current.facultyId,
    department: department !== undefined ? department.trim() : current.department,
    course: course !== undefined ? course.trim() : current.course,
    courseCode: courseCode !== undefined ? courseCode.trim() : current.courseCode,
    status: status !== undefined ? status : current.status,
    updatedAt: new Date().toISOString()
  };

  persistTeachers();
  res.json({ success: true, teacher: teachers[idx] });
});

// DELETE remove teacher
router.delete('/:id', (req, res) => {
  const teacherId = req.params.id;
  const idx = teachers.findIndex((t) => t.id === teacherId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Teacher not found.' });
  }

  const removed = teachers.splice(idx, 1)[0];
  persistTeachers();
  res.json({ success: true, message: `Teacher ${removed.name} has been removed.`, teacher: removed });
});

module.exports = {
  router,
  getTeachersList,
  findTeacherByCredentials
};
