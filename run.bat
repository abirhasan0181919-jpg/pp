@echo off
title ShopPOS
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 pos.py
) else (
    python pos.py
)
if errorlevel 1 pause
