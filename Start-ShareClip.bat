@echo off
setlocal
cd /d "%~dp0"
title ShareClip

echo.
echo ========================================
echo  ShareClip start
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js LTS, then run this bat again.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available.
  echo Reinstall Node.js LTS, then run this bat again.
  echo.
  pause
  exit /b 1
)

if not exist package.json (
  echo [ERROR] package.json was not found.
  echo Run this bat from the ShareClip repository root.
  echo.
  pause
  exit /b 1
)

if not exist node_modules\electron\package.json (
  echo [INFO] Running first-time setup. This may take a few minutes.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [INFO] Dependencies are already installed.
)

echo.
echo [INFO] Starting ShareClip.
echo On first run, enter your OCI settings in the Settings screen and save them.
echo.

call npm run dev
if errorlevel 1 (
  echo.
  echo [ERROR] ShareClip failed to start.
  pause
  exit /b 1
)

exit /b 0
