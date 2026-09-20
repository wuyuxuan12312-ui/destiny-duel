@echo off
chcp 65001 >nul
title Destiny Duel - sync numbers (Excel to JSON)
cd /d "%~dp0"
python "%~dp0sync_balance.py"
echo.
echo To refresh the SQLite copy as well, run:  node ..\database\init_db.js
pause
