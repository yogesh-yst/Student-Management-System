@echo off
echo Starting MMS Frontend in Docker...
echo.

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please edit .env file with your configuration before running again.
    pause
    exit /b 1
)

echo Choose an option:
echo 1. Development mode (with hot reload)
echo 2. Production mode
echo 3. Full stack (frontend + backend + MongoDB)
echo 4. Build images only
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Starting development mode...
    docker-compose up mms-frontend-dev
) else if "%choice%"=="2" (
    echo Starting production mode...
    docker-compose --profile production up mms-frontend-prod
) else if "%choice%"=="3" (
    echo Starting full stack...
    cd ..\..\
    docker-compose --profile with-mongo up
) else if "%choice%"=="4" (
    echo Building images...
    docker build -t mms-frontend:dev --target development .
    docker build -t mms-frontend:prod --target production .
    echo Build complete!
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

pause
