@echo off
chcp 65001 >nul
title Destiny Duel Server (port 3000)
cd /d "%~dp0"

netstat -ano | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 goto busy

echo ============================================================
echo   Destiny Duel - local server + admin CMS
echo ============================================================
echo   game   : http://localhost:3000
echo   admin  : http://localhost:3000/admin   (admin / admin888)
echo   keep this window open while playing
echo ============================================================
echo.
node server\server.js
echo.
echo [!] Server exited. If you see an error above, check that
echo     Node.js 22+ is installed (it needs the built-in node:sqlite).
pause
exit /b 0

:busy
echo [!] Port 3000 is already in use - a server is probably running.
echo     Just open http://localhost:3000
echo     To restart, close that other window first, then run this again.
echo.
pause
exit /b 0
