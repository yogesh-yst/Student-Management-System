#!/usr/bin/env pwsh

Write-Host "Starting MMS Frontend in Docker..." -ForegroundColor Green
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please edit .env file with your configuration before running again." -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
}

Write-Host "Choose an option:" -ForegroundColor Cyan
Write-Host "1. Development mode (with hot reload)"
Write-Host "2. Production mode"
Write-Host "3. Full stack (frontend + backend + MongoDB)"
Write-Host "4. Build images only"
Write-Host "5. Stop all services"
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "Starting development mode..." -ForegroundColor Green
        docker-compose --profile development up mms-frontend-dev
    }
    "2" {
        Write-Host "Starting production mode..." -ForegroundColor Green
        docker-compose --profile production up mms-frontend-prod
    }
    "3" {
        Write-Host "Starting full stack..." -ForegroundColor Green
        Set-Location "..\..\\"
        docker-compose --profile with-mongo up
    }
    "4" {
        Write-Host "Building images..." -ForegroundColor Green
        docker build -t mms-frontend:dev --target development .
        docker build -t mms-frontend:prod --target production .
        Write-Host "Build complete!" -ForegroundColor Green
    }
    "5" {
        Write-Host "Stopping all services..." -ForegroundColor Yellow
        docker-compose down
        Set-Location "..\..\\"
        docker-compose down
        Write-Host "All services stopped!" -ForegroundColor Green
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Read-Host "Press Enter to continue"
