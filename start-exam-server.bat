@echo off
title Digital Exam - Campus Wi-Fi Server
color 0A
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

echo ==============================================================
echo    DIGITAL EXAM PLATFORM - CAMPUS WI-FI SERVER
echo ==============================================================
echo Starting backend server and real-time proctoring hub...
echo.

node server/src/index.js
pause
