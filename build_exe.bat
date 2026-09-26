@echo off
title Build ShopPOS EXE
cd /d "%~dp0"

echo [1/2] Installing PyInstaller...
py -3 -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo PyInstaller install failed. Check internet or Python install.
    pause
    exit /b 1
)

echo [2/2] Building single-file EXE...
py -3 -m PyInstaller --noconfirm --onefile --windowed --name ShopPOS pos.py
if errorlevel 1 (
    echo Build failed.
    pause
    exit /b 1
)

echo.
echo Done: dist\ShopPOS.exe
echo Copy that file anywhere and double-click to run.
pause
