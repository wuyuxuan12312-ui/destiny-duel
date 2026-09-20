@echo off
chcp 65001 >nul
title Destiny Duel - auto build and test
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8

echo ============================================================
echo   Destiny Duel - QuickCreator auto build
echo ============================================================
echo   1. issue unique ids   (hero_xxxx / card_xxxx / status_xxxx)
echo   2. build matching skills and character links
echo   3. keep 15-card opening decks in CardPools
echo   4. validate data and compile JSON + game_config.js
echo   5. run the AI balance simulation report
echo ============================================================
where python >nul 2>nul
if errorlevel 1 goto nopython

python tools\editor.py quick-build
echo.
echo ============================================================
echo Done. If numbers did not apply, run these two manually:
echo     python tools\sync_balance.py
echo     node database\init_db.js
echo ============================================================
pause
exit /b 0

:nopython
echo [!] Python not found - cannot run the auto build.
pause
exit /b 1
