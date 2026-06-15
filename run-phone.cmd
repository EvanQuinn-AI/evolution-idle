@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-phone.ps1" %*
if errorlevel 1 (
  echo.
  pause
)
endlocal
