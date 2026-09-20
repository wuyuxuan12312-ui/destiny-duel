@echo off
chcp 65001 >nul
title Destiny Duel Studio
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8

where python >nul 2>nul
if errorlevel 1 goto nopython

python tools\editor.py
echo.
pause
exit /b 0

:nopython
echo [!] Python not found. The studio needs Python + openpyxl:
echo       pip install openpyxl
echo     Alternative: run start_server.bat and use the web CMS at
echo       http://localhost:3000/admin
pause
exit /b 1
