# Development startup script using Docker (Windows)

Write-Host "🚀 Starting Student Management System in DEVELOPMENT mode..." -ForegroundColor Green

# Check if .env.dev exists
if (!(Test-Path ".env.dev")) {
    Write-Host "📋 Creating .env.dev from example..." -ForegroundColor Yellow
    Copy-Item ".env.dev.example" ".env.dev"
    Write-Host "⚠️  Please edit .env.dev with your development settings" -ForegroundColor Yellow
}

# Start development containers
Write-Host "🐳 Starting development containers..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml --env-file .env.dev up --build

Write-Host "🎯 Development server started!" -ForegroundColor Green
Write-Host "📊 API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🗄️  MongoDB: localhost:27017" -ForegroundColor Cyan
Write-Host "📱 Mongo Express: http://localhost:8081" -ForegroundColor Cyan
