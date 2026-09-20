@echo off
chcp 65001 >nul
title Destiny Duel - Intranet Penetration Tunnel
cd /d %~dp0

echo ============================================================
echo   Destiny Duel - Public Tunnel (内网穿透)
echo ============================================================
echo   Local Server: http://localhost:3000
echo   Public URL  : https://yuxitea.loca.lt
echo ============================================================
echo.
echo [提示] 首次在浏览器打开时，如出现安全提示页面，
echo 点击 'Click to Continue' 或输入 Tunnel 密码即可直接进入！
echo.
echo 正在保持穿透连接，关闭本窗口即停止外网访问...
echo.

npx localtunnel --port 3000 --subdomain yuxitea
pause
