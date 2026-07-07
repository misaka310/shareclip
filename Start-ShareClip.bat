@echo off
setlocal
cd /d "%~dp0"
title ShareClip

set "APP_EXE=release\ShareClip-win32-x64\ShareClip.exe"

echo.
echo ========================================
echo  ShareClip
echo ========================================
echo.

if exist "%APP_EXE%" (
  echo [INFO] Starting existing app.
  start "" "%APP_EXE%"
  exit /b 0
)

echo [INFO] ShareClip.exe was not found.
echo [INFO] Running first-time setup and build.
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
  echo [INFO] Installing dependencies. This may take a few minutes.
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
echo [INFO] Building ShareClip.exe.
echo.
call npm run dist
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

if not exist "%APP_EXE%" (
  echo.
  echo [ERROR] Build finished, but %APP_EXE% was not found.
  pause
  exit /b 1
)

echo.
echo [OK] ShareClip.exe is ready.
echo [INFO] Starting ShareClip.
echo On first run, enter your OCI settings in the Settings screen and save them.
echo.
start "" "%APP_EXE%"
exit /b 0
