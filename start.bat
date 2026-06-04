@echo off
title ResultBondhu - HSC Exam System
color 0A

echo ============================================
echo   ResultBondhu - HSC Grade Management System
echo   রেজাল্ট বন্ধু
echo ============================================
echo.

:: Check Docker
docker --version > nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker not found! Please install Docker Desktop first.
    echo Download: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [1/3] Starting PostgreSQL database...
docker-compose up -d db
timeout /t 5 > nul

echo [2/3] Starting backend (FastAPI)...
docker-compose up -d backend
timeout /t 5 > nul

echo [3/3] Starting frontend (React)...
docker-compose up -d frontend
timeout /t 3 > nul

echo.
echo ============================================
echo   System is running!
echo   Open your browser and go to:
echo   http://localhost
echo.
echo   Default login:
echo   Email: admin@resultbondhu.com
echo   Password: admin123
echo ============================================
echo.
echo Press any key to open the browser...
pause > nul
start http://localhost
