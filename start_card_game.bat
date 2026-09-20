@echo off
chcp 65001 >nul
title Destiny Duel Launcher
cd /d "%~dp0"
echo ============================================================
echo   Destiny Duel - launcher
echo ============================================================

where node >nul 2>nul
if errorlevel 1 goto offline

set tries=
netstat -ano | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 goto opened

echo [server] starting in background...
start "Destiny Duel Server" /min node server\server.js
set tries=0

:wait_port
ping -n 2 127.0.0.1 >nul
set /a tries+=1
netstat -ano | findstr /C:":3000" | findstr /C:"LISTENING" >nul 2>&1
if not errorlevel 1 goto opened
if not "%tries%"=="8" goto wait_port
echo [warn] server did not report ready within 8s; trying anyway.

:opened
echo [game] opening http://localhost:3000
start "" "http://localhost:3000"
goto done

:offline
echo [offline] Node.js not found - opening the static client instead.
echo           Gold and gacha pity will stay local to the browser only.
start "" "%~dp0client\index.html"

:done
echo.
echo Tip: closing the minimized server window takes the game offline.
ping -n 6 127.0.0.1 >nul
exit
