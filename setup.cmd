@echo off
rem WeCare: dublu-click pe acest fisier ca sa instalezi si sa pornesti aplicatia pe Windows.
rem Ocoleste blocarea "not digitally signed" pentru scripturile descarcate de pe internet.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -Path .\setup.ps1 -ErrorAction SilentlyContinue"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" %*
echo.
pause