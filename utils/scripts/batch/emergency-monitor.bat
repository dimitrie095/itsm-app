@echo off
echo ========================================
echo ITSM Emergency Security Monitor
echo ========================================
echo.
echo Starting security monitoring...
echo Logs will be saved to: security-monitor.log
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    exit /b 1
)

REM Create initial log entry
echo [%date% %time%] [INFO] Starting emergency security monitoring... > security-monitor.log

REM Run the monitor
echo Press Ctrl+C to stop the monitoring...
node ../js/emergency-monitor.js

if %ERRORLEVEL% equ 0 (
    echo.
    echo Monitoring stopped normally.
) else (
    echo.
    echo Monitoring stopped with error.
    exit /b 1
)