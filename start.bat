@echo off
echo Starting Plume Backend...
start /B node backend\dist\server.js
timeout /t 2 /nobreak >nul
echo Starting Plume Frontend...
cd frontend
npx vite --host
pause