# 🎓 Digital Exam Platform — University Campus Edition

An enterprise-grade, high-integrity digital examination and real-time lockdown proctoring platform engineered specifically for **University Campuses** operating over **Campus Wi-Fi**.

Capable of seamlessly handling **250+ concurrent students** taking exams simultaneously on **Android phones, iPhones, iPads, Windows laptops, and MacBooks**.

---

## 🚀 Quick Start (Instant Run)

### 1. Start the Server
Double-click `start-exam-server.bat` or run in terminal:
```bash
npm start
```
The server will start on port `4000` and display your campus Wi-Fi URL:
* **Teacher & Invigilator Radar**: `http://localhost:4000/teacher`
* **Student Exam Room**: `http://localhost:4000/student`
* **Campus Portal Hub**: `http://localhost:4000`

### 2. Open the Invigilator Dashboard
1. Go to `http://localhost:4000/teacher`.
2. Notice the **Hall Session PIN** (e.g. `552901`) displayed in the top bar.
3. Click the **"Simulate 250 Students"** button to immediately populate the live radar with 250 realistic student cards and live telemetry!

### 3. Take an Exam as a Student
1. Open an incognito browser tab or another device on your Wi-Fi and go to `http://localhost:4000/student`.
2. Enter the 6-digit Session PIN, your Student ID, and Name.
3. Click **"Lock Device & Start Exam"**.
4. **Try switching tabs, minimizing, or exiting full-screen**:
   * The client immediately triggers a red lockdown alert overlay.
   * Look back at the Teacher Radar: that student card immediately pulses red and displays the violation!

---

## 🛡️ Multi-Layer Security & Lockdown Architecture

| Platform | Lockdown Technology | Cheating Prevention Features |
| :--- | :--- | :--- |
| **Android Phones & Tablets** | `FLAG_SECURE` + `LockTaskMode` | • Prevents screenshots & screen recording<br>• Blocks home button & recent apps switcher<br>• Detects floating bubbles & overlay windows |
| **iPhones & iPads** | Apple `AutomaticAssessmentConfiguration` (`AEAssessmentSession`) | • Locks iOS into official Single App Mode<br>• Disables notifications, Siri, autocorrect, spellcheck<br>• Blocks screen recording & AirPlay |
| **Laptops (Windows / Mac)** | Fullscreen Kiosk Mode + Event Traps | • Traps focus, blocks F12/DevTools & keyboard shortcuts<br>• Logs `blur`, `visibilitychange`, and `fullscreenchange` |

---

## 📡 Live Proctoring Radar (250 Students)

* **Real-Time Telemetry Stream**: WebSocket heartbeats ping every 5 seconds per student (< 1 KB payload).
* **Instant In-Hall Radar**: Invigilators see 250 cards categorized into:
  * 🟢 **Normal & Active**: Student is locked in the app answering questions.
  * 🔴 **Lockdown Violation**: Student clicked outside, minimized the window, or exited fullscreen.
  * 🔵 **Submitted**: Finished and encrypted.
  * ⚪ **Disconnected**: Stalled Wi-Fi heartbeat.
* **Remote Proctor Controls**:
  * Push instant warning messages directly to student screens.
  * Grant extra time (+5 or +10 minutes).
  * Force-submit suspicious sessions.
  * Dismiss accidental violation flags.

---

## 💾 Offline Resilience (Campus Wi-Fi Protection)

1. The entire exam question packet is downloaded upon check-in.
2. Every answer choice and keystroke is saved **instantly to local device storage** (`localStorage` / SQLite).
3. Answers sync asynchronously over WebSockets. If campus Wi-Fi stutters or drops, the local countdown timer keeps running, the student continues answering without interruption, and answers auto-sync once the network recovers.

---

## 📁 Repository Directory Structure

```
Digital Exam/
├── server/
│   ├── src/
│   │   ├── index.js          # Express HTTP + WebSocket Server
│   │   ├── store.js          # Fast in-memory state & disk persistence
│   │   ├── socketHandler.js  # 250-student real-time telemetry & proctor alerts
│   │   ├── seed.js           # Seeds sample exams and default session
│   │   └── routes/
│   │       ├── exams.js      # Exam authoring and question banks
│   │       ├── sessions.js   # In-hall room PIN & 250-student simulator
│   │       └── grades.js     # Grading ledger & CSV export
│   └── data/                 # JSON persistent databases
│
├── client/public/
│   ├── index.html            # Campus portal hub
│   ├── teacher.html          # Invigilator 250-student live radar & exam builder
│   └── student.html          # Student lockdown exam room
│
├── mobile-lockdown/
│   ├── android/              # Native Kotlin Lockdown Activity recipe
│   └── ios/                  # Native Swift Apple Assessment recipe
│
├── package.json              # Project dependencies (Express, ws, cors, uuid)
├── start-exam-server.bat     # One-click Windows server launcher
└── launch-student-kiosk.bat  # One-click student kiosk launcher
```
