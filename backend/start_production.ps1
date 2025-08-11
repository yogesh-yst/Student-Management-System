# Production startup script for Student Management System Backend (Windows)
# This script starts the backend using Waitress (Windows-compatible WSGI server)

Write-Host "🚀 Starting Student Management System Backend with Waitress..." -ForegroundColor Green

# Check if virtual environment exists and activate it
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "📦 Activating virtual environment..." -ForegroundColor Yellow
    & "venv\Scripts\Activate.ps1"
} elseif (Test-Path ".venv\Scripts\Activate.ps1") {
    Write-Host "📦 Activating virtual environment..." -ForegroundColor Yellow
    & ".venv\Scripts\Activate.ps1"
}

# Install dependencies if needed
if ((Test-Path "requirements.txt") -and (!(Test-Path ".requirements_installed") -or ((Get-Item "requirements.txt").LastWriteTime -gt (Get-Item ".requirements_installed").LastWriteTime))) {
    Write-Host "📋 Installing/updating dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    New-Item -ItemType File -Path ".requirements_installed" -Force | Out-Null
}

# Start the application with Waitress
Write-Host "🌐 Starting Waitress server..." -ForegroundColor Green
Write-Host "📊 Access the API at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📈 Health check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

try {
    waitress-serve --host=0.0.0.0 --port=5000 --threads=4 --connection-limit=1000 --channel-timeout=120 wsgi:application
} catch {
    Write-Host "❌ Error starting Waitress: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure you have installed the requirements: pip install -r requirements.txt" -ForegroundColor Yellow
}
