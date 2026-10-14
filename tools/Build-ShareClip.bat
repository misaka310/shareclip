@echo off
setlocal
cd /d "%~dp0\.."
title ShareClip build

echo.
echo ========================================
echo  ShareClip build
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
  echo Run this bat from inside the ShareClip repository.
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
echo [INFO] Building the distributable app folder.
echo.

call npm run dist
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo [OK] Build completed.
echo Start release\ShareClip-win32-x64\ShareClip.exe.
echo Use the whole ShareClip-win32-x64 folder. Do not copy only ShareClip.exe.
echo.
pause
exit /b 0
