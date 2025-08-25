@echo off
title FBMS Auto-Git-Push Automation
color 0A

echo.
echo ====================================
echo    FBMS Auto-Git-Push Automation
echo ====================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory of this batch file
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%.."

REM Change to project directory
cd /d "%PROJECT_DIR%"

echo [INFO] Current directory: %CD%
echo [INFO] Starting auto-git-push automation...
echo [INFO] Press Ctrl+C to stop
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not in a git repository!
    echo Please run this from your project root directory.
    pause
    exit /b 1
)

REM Show current git status
echo [INFO] Current git status:
git status --short 2>nul
echo.

REM Start the automation with default 2-minute interval
REM You can modify the parameters below as needed:
REM --interval 5        (change interval to 5 minutes)
REM --prefix "Backup"   (change commit message prefix)
REM --branch main       (specify target branch)
REM --no-log           (disable file logging)

echo [INFO] Starting with 2-minute intervals...
echo [INFO] Use --help for more options
echo.

node "%SCRIPT_DIR%auto-git-push.js" %*

REM If the script exits, show the exit code
if errorlevel 1 (
    echo.
    echo [ERROR] Auto-git-push exited with error code %errorlevel%
) else (
    echo.
    echo [INFO] Auto-git-push stopped gracefully
)

echo.
echo Press any key to exit...
pause >nul