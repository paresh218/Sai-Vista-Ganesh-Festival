@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22.12 or newer, then run this file again.
  if not defined CI pause
  exit /b 1
)
pushd "%~dp0"
node "%~dp0scripts\run-local.mjs" %*
set "runResult=%errorlevel%"
popd
if not "%runResult%"=="0" if not defined CI pause
exit /b %runResult%
