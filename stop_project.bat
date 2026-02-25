@echo off
title Cloud Space - Shutdown Script
color 0c

echo ===================================================
echo        CLOUD SPACE SYSTEM SHUTDOWN
echo ===================================================
echo.

echo [1/2] Terminating Backend (Port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [2/2] Terminating Frontend (Port 4200)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4200 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo Cleaning up remaining Node processes...
taskkill /f /im node.exe >nul 2>&1

echo.
echo ===================================================
echo SYSTEM SHUTDOWN COMPLETE
echo ===================================================
echo.
pause
