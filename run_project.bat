@echo off
title Cloud Space - Startup Script
color 0b

echo ===================================================
echo        CLOUD SPACE SYSTEM STARTUP
echo ===================================================
echo.

:: Set current directory to the script location
set BASE_DIR=%~dp0
cd /d "%BASE_DIR%"

echo [1/2] Starting Backend Server...
start "Cloud Space Backend" cmd /k "cd /d "%BASE_DIR%backend" && echo Installing dependencies (if any)... && npm install && echo Starting Backend... && npm run dev"

echo.
echo [2/2] Starting Frontend Application...
start "Cloud Space Frontend" cmd /k "cd /d "%BASE_DIR%frontend-angular" && echo Installing dependencies (if any)... && npm install && echo Starting Frontend... && npm start"

echo.
echo ===================================================
echo SYSTEM STARTUP INITIATED
echo.
echo Backend will be available at: http://localhost:5000
echo Frontend will be available at: http://localhost:4200
echo ===================================================
echo.
echo Windows will open in new terminal windows.
echo Keep them running to use the application.
echo.
pause
