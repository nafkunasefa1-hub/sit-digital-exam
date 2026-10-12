@echo off
title Student Exam Client - Kiosk Launcher
color 0B

echo ==============================================================
echo    DIGITAL EXAM - STUDENT CLIENT KIOSK LAUNCHER (WINDOWS)
echo ==============================================================
echo Launching student lockdown exam room...
echo.

start msedge --kiosk "http://localhost:4000/student" --edge-kiosk-type=fullscreen --no-first-run
exit
