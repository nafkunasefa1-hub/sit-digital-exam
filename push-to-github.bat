@echo off
title Push SIT Digital Exam to GitHub
color 0A
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Programs\git\cmd;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

echo ==============================================================
echo    SIT DIGITAL EXAM - PUSH TO GITHUB (FOR FREE HOSTING)
echo ==============================================================
echo.
echo Make sure you have created an empty repository on GitHub.
echo (e.g., https://github.com/your-username/sit-digital-exam)
echo.
set /p REPO_URL="Paste your GitHub repository URL: "

if "%REPO_URL%"=="" (
    echo Error: No repository URL entered.
    pause
    exit /b
)

echo.
echo Setting remote repository...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Pushing code to GitHub...
git push -u origin main

echo.
echo ==============================================================
echo DONE! Now go to https://render.com and deploy for free in 2 mins!
echo ==============================================================
pause
