const store = require('./store');

function setupWebSocket(wss) {
  // Check student heartbeats
  setInterval(() => {
    const now = Date.now();
    const sessions = store.getAllSessions();
    for (const session of sessions) {
      if (session.status !== 'ACTIVE') continue;

      let changed = false;
      for (const studentId in session.students) {
        const student = session.students[studentId];
        if (student.status === 'SUBMITTED' || student.isSuspended) continue;

        const lastHeartbeatTime = new Date(student.lastHeartbeat).getTime();
        // Disconnected if > 15s without ping
        if (now - lastHeartbeatTime > 15000 && student.status !== 'DISCONNECTED') {
          student.status = 'DISCONNECTED';
          changed = true;
          broadcastToAdminsAndTeachers(session.pin, {
            type: 'STUDENT_DISCONNECTED',
            studentId,
            studentName: student.studentName,
            seatNumber: student.seatNumber,
            timestamp: new Date().toISOString(),
          });
        }
      }
      if (changed) {
        store.persistData();
      }
    }
  }, 5000);

  wss.on('connection', (ws) => {
    let clientInfo = { role: null, sessionPin: null, studentId: null };

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, data, clientInfo);
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      if (clientInfo.role === 'STUDENT' && clientInfo.sessionPin && clientInfo.studentId) {
        const session = store.getSession(clientInfo.sessionPin);
        if (session && session.students[clientInfo.studentId]) {
          const student = session.students[clientInfo.studentId];
          if (student.status !== 'SUBMITTED' && !student.isSuspended) {
            student.status = 'DISCONNECTED';
            store.persistData();
            broadcastToAdminsAndTeachers(clientInfo.sessionPin, {
              type: 'STUDENT_DISCONNECTED',
              studentId: clientInfo.studentId,
              studentName: student.studentName,
              seatNumber: student.seatNumber,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
      store.activeSockets.delete(ws);
    });
  });

  function handleMessage(ws, data, clientInfo) {
    switch (data.type) {
      // 1. Admin & Proctor Join
      case 'ADMIN_JOIN':
      case 'INVIGILATOR_JOIN':
      case 'TEACHER_JOIN': {
        clientInfo.role = data.type === 'ADMIN_JOIN' ? 'ADMIN' : 'TEACHER';
        clientInfo.sessionPin = data.sessionPin || 'ALL';
        store.activeSockets.set(ws, clientInfo);

        if (clientInfo.sessionPin === 'ALL' || !data.sessionPin) {
          ws.send(
            JSON.stringify({
              type: 'ALL_SESSIONS_INIT',
              sessions: store.getAllSessions(),
              students: store.getAllStudentsAcrossSessions(),
            })
          );
        } else {
          const session = store.getSession(data.sessionPin);
          ws.send(
            JSON.stringify({
              type: 'SESSION_INIT',
              session: session || null,
            })
          );
        }
        break;
      }

      // 2. Student Joins or Reconnects
      case 'STUDENT_JOIN': {
        clientInfo.role = 'STUDENT';
        clientInfo.sessionPin = data.sessionPin;
        clientInfo.studentId = data.studentId;
        store.activeSockets.set(ws, clientInfo);

        let student = null;
        try {
          student = store.registerOrUpdateStudent(data.sessionPin, {
            studentId: data.studentId,
            studentName: data.studentName,
            seatNumber: data.seatNumber,
            deviceInfo: data.deviceInfo,
            idPhoto: data.idPhoto || null,
            clientIp: ws._socket?.remoteAddress || '127.0.0.1',
          });
        } catch (err) {
          ws.send(JSON.stringify({ type: 'STUDENT_JOIN_ERROR', error: err.message }));
          return;
        }

        const session = store.getSession(data.sessionPin);
        const exam = session ? store.getExamById(session.examId) : null;
        const existingSub = store.getSubmission(data.sessionPin, data.studentId);

        // Sanitize exam questions for student (STRIP correctAnswer so students cannot inspect answers!)
        let sanitizedExam = null;
        if (exam) {
          sanitizedExam = {
            id: exam.id,
            title: exam.title,
            courseCode: exam.courseCode,
            description: exam.description,
            durationMinutes: exam.durationMinutes,
            totalMarks: exam.totalMarks,
            questions: (exam.questions || []).map((q) => ({
              id: q.id,
              order: q.order,
              type: q.type,
              points: q.points,
              prompt: q.prompt,
              options: q.options || [],
            })),
          };
        }

        const isScheduled = Boolean(
          session &&
          session.scheduledStartTime &&
          new Date(session.scheduledStartTime).getTime() > Date.now()
        );

        ws.send(
          JSON.stringify({
            type: 'STUDENT_INIT_SUCCESS',
            student,
            sessionInfo: session
              ? {
                  pin: session.pin,
                  roomName: session.roomName,
                  subject: session.subject || exam?.subject || 'Calculus I',
                  courseCode: session.courseCode || exam?.courseCode || 'MATH-101',
                  instructorName: session.instructorName || exam?.instructorName || 'Faculty Instructor',
                  durationMinutes: session.durationMinutes,
                  scheduledStartTime: session.scheduledStartTime || null,
                  instructions: session.instructions || exam?.instructions || 'Standard academic exam guidelines apply.',
                  status: isScheduled ? 'SCHEDULED' : session.status,
                  isScheduled,
                  startTime: session.startTime,
                  maxViolations: session.maxViolations || 3,
                }
              : null,
            exam: sanitizedExam,
            savedAnswers: existingSub ? existingSub.answers : {},
            isSuspended: student.isSuspended,
          })
        );

        // Notify Admins and Teachers in real time
        student.sessionPin = data.sessionPin;
        broadcastToAdminsAndTeachers(data.sessionPin, {
          type: 'STUDENT_STATUS_UPDATE',
          sessionPin: data.sessionPin,
          student,
        });
        break;
      }

      // 2b. Periodic Camera Snapshot (<15KB)
      case 'STUDENT_SNAPSHOT': {
        const student = store.recordStudentSnapshot(data.sessionPin, data.studentId, data.snapshotImage);
        if (student) {
          broadcastToAdminsAndTeachers(data.sessionPin, {
            type: 'STUDENT_SNAPSHOT_UPDATE',
            studentId: data.studentId,
            latestSnapshot: data.snapshotImage,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      // 3. Heartbeat from Student
      case 'STUDENT_HEARTBEAT': {
        const session = store.getSession(data.sessionPin);
        if (session && session.students[data.studentId]) {
          const student = session.students[data.studentId];
          student.lastHeartbeat = new Date().toISOString();
          if (data.battery !== undefined) student.deviceInfo.battery = data.battery;
          if (data.currentQuestionIndex !== undefined)
            student.currentQuestionIndex = data.currentQuestionIndex;
          if (data.answeredCount !== undefined) student.answeredCount = data.answeredCount;

          if (student.status === 'DISCONNECTED') {
            student.status = student.isSuspended ? 'SUSPENDED' : (student.violationsCount > 0 ? 'WARNING' : 'ACTIVE');
          }

          store.persistData();

          // Echo back state to student
          ws.send(
            JSON.stringify({
              type: 'HEARTBEAT_ACK',
              warningMessage: student.warningMessage,
              extraTimeGrantedMinutes: student.extraTimeGrantedMinutes || 0,
              isSuspended: student.isSuspended,
            })
          );

          broadcastToAdminsAndTeachers(data.sessionPin, {
            type: 'STUDENT_STATUS_UPDATE',
            student,
          });
        }
        break;
      }

      // 4. Critical Telemetry Violation (Focus Lost, Minimized, Fullscreen Exit)
      case 'STUDENT_VIOLATION': {
        const result = store.recordViolation(
          data.sessionPin,
          data.studentId,
          data.violationType,
          data.description
        );

        if (result && result.violation) {
          console.log(
            `🚨 [VIOLATION] Student: ${result.student.studentName} (${data.studentId}) | Type: ${data.violationType} | Count: ${result.student.violationsCount}/${result.maxAllowed}`
          );

          // Broadcast notification toast & alert to Admin
          broadcastToAdminsAndTeachers(data.sessionPin, {
            type: 'VIOLATION_NOTIFICATION',
            student: result.student,
            violation: result.violation,
            wasSuspendedNow: result.wasSuspendedNow,
            maxAllowed: result.maxAllowed,
          });

          // Check if student is automatically suspended
          if (result.wasSuspendedNow) {
            console.log(`⛔ [SUSPENSION] Student ${result.student.studentName} exceeded ${result.maxAllowed} violations -> SUSPENDED!`);

            // Send suspension command to student's socket immediately
            ws.send(
              JSON.stringify({
                type: 'EXAM_SUSPENDED',
                reason: `Maximum violation limit (${result.maxAllowed}) exceeded. You switched apps or left fullscreen too many times.`,
                violationsCount: result.student.violationsCount,
                maxAllowed: result.maxAllowed,
              })
            );

            // Broadcast high-priority suspension alert to Admin
            broadcastToAdminsAndTeachers(data.sessionPin, {
              type: 'STUDENT_SUSPENDED_ALERT',
              student: result.student,
              reason: `Exceeded ${result.maxAllowed} violations.`,
            });
          } else {
            // Acknowledge back to student with current count
            ws.send(
              JSON.stringify({
                type: 'VIOLATION_LOGGED',
                violation: result.violation,
                violationsCount: result.student.violationsCount,
                maxAllowed: result.maxAllowed,
              })
            );
          }
        }
        break;
      }

      // 5. Student Sync Answers
      case 'STUDENT_SYNC_ANSWERS': {
        const sub = store.saveStudentAnswers(
          data.sessionPin,
          data.studentId,
          data.answers,
          data.isFinalSubmission || false
        );

        ws.send(
          JSON.stringify({
            type: 'SYNC_ANSWERS_ACK',
            lastSaved: sub.lastSaved,
            isFinalSubmission: data.isFinalSubmission || false,
          })
        );

        const session = store.getSession(data.sessionPin);
        if (session && session.students[data.studentId]) {
          broadcastToAdminsAndTeachers(data.sessionPin, {
            type: 'STUDENT_STATUS_UPDATE',
            student: session.students[data.studentId],
          });
        }
        break;
      }

      // 6. Admin Actions (LIFT_SUSPENSION, SEND_WARNING, ADD_TIME, FORCE_SUBMIT, DISQUALIFY)
      case 'ADMIN_ACTION': {
        const student = store.applyAdminAction(
          data.sessionPin,
          data.studentId,
          data.action,
          data.payload
        );

        if (student) {
          // Direct socket update to the affected student
          for (const [sWs, info] of store.activeSockets.entries()) {
            if (
              info.role === 'STUDENT' &&
              info.sessionPin === data.sessionPin &&
              info.studentId === data.studentId &&
              sWs.readyState === sWs.OPEN
            ) {
              if (data.action === 'LIFT_SUSPENSION') {
                sWs.send(
                  JSON.stringify({
                    type: 'EXAM_RESUMED',
                    message: 'Your suspension was lifted by the Administrator. You may resume.',
                  })
                );
              } else if (data.action === 'FORCE_SUBMIT') {
                sWs.send(
                  JSON.stringify({
                    type: 'EXAM_FORCE_SUBMITTED',
                  })
                );
              } else if (data.action === 'DISQUALIFY') {
                sWs.send(
                  JSON.stringify({
                    type: 'EXAM_DISQUALIFIED',
                    reason: 'You have been disqualified by the Administrator.',
                  })
                );
              } else {
                sWs.send(
                  JSON.stringify({
                    type: 'ADMIN_COMMAND',
                    action: data.action,
                    payload: data.payload,
                    warningMessage: student.warningMessage,
                    extraTimeGrantedMinutes: student.extraTimeGrantedMinutes,
                  })
                );
              }
              break;
            }
          }

          // Broadcast updated student status to Admin and Teacher
          broadcastToAdminsAndTeachers(data.sessionPin, {
            type: 'STUDENT_STATUS_UPDATE',
            student,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  function broadcastToAdminsAndTeachers(sessionPin, payload) {
    if (payload && !payload.sessionPin) {
      payload.sessionPin = sessionPin;
    }
    const msg = JSON.stringify(payload);
    for (const [ws, info] of store.activeSockets.entries()) {
      const isRecipient = (info.role === 'ADMIN' || info.role === 'TEACHER') &&
        (info.sessionPin === sessionPin || info.sessionPin === 'ALL' || !info.sessionPin);

      if (isRecipient && ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  }

  return { broadcastToAdminsAndTeachers };
}

module.exports = { setupWebSocket };
