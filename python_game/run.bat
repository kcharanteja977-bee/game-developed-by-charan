@echo off
title Hand-Gesture Airplane Shooter Launcher
echo ========================================================
echo   Webcam Hand-Gesture Airplane Shooter (Pygame + MediaPipe)
echo ========================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not found on your system PATH!
    echo Please install Python 3.10 or 3.11 64-bit from https://www.python.org
    echo Make sure to check the box "Add Python to PATH" during installation.
    pause
    exit /b
)

echo [OK] Python is installed:
python --version
echo.

:: 2. Check or create virtual environment
if not exist "venv\" (
    echo [SETUP] Creating virtual environment (venv)...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b
    )
)

:: 3. Activate virtual environment
call venv\Scripts\activate.bat

:: 4. Upgrade pip and install requirements
echo [SETUP] Installing / Verifying dependencies (Pygame, OpenCV, MediaPipe)...
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install requirements.
    echo Tip: If you are on Python 3.12, please use Python 3.10 or 3.11 for MediaPipe compatibility.
    pause
    exit /b
)

:: 5. Launch the game!
echo.
echo ========================================================
echo   Starting Game! Position your hand in front of webcam.
echo   1 Finger = Shoot Laser
echo   2 Fingers = Launch AOE Bomb
echo   Open Palm = Shield Mode
echo   Closed Fist = Cease Fire
echo ========================================================
echo.
python main.py

pause
