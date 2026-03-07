@echo off
REM restart-dev-port5174.cmd
REM Launches a new cmd window to stop anything on port 5174 and start the dev server.
REM This variant uses `start` to open a persistent window so it won't close instantly.

set REPO_DIR=C:\Users\USER\voids-arcana

REM Build the command to run in the new window.
set CMDLINE=powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $e = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -First 1; if ($e) { $pid=$e.OwningProcess; Write-Host 'Found and stopping PID:' $pid; Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } else { Write-Host 'No listener on port 5174' }; Set-Location '%REPO_DIR%'; Write-Host 'Starting dev server on port 5174'; npm run dev -- --port 5174 }"

echo Opening new window to run dev server (will remain open)...
REM Use the PowerShell script we created to avoid complex quoting issues.
set SCRIPT_PATH=%~dp0restart-dev-port5174.ps1
if not exist "%SCRIPT_PATH%" (
	echo Could not find %SCRIPT_PATH%
	pause
	goto :eof
)
start "Voids Arcana Dev Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%"

echo Launched. A new window titled "Voids Arcana Dev Server" should be visible.
pause