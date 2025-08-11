# Production startup script using Docker (Windows)

Write-Host "🚀 Starting Student Management System in PRODUCTION mode..." -ForegroundColor Green

# Check if .env.prod exists
if (!(Test-Path ".env.prod")) {
    Write-Host "❌ .env.prod file not found!" -ForegroundColor Red
    Write-Host "📋 Creating .env.prod from example..." -ForegroundColor Yellow
    Copy-Item ".env.prod.example" ".env.prod"
    Write-Host "⚠️  IMPORTANT: Edit .env.prod with your production settings before continuing!" -ForegroundColor Red
    Write-Host "🔐 Make sure to set secure SECRET_KEY and MONGO_URI" -ForegroundColor Yellow
    exit 1
}

# Start production containers
Write-Host "🐳 Starting production containers..." -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

Write-Host "🎯 Production server started!" -ForegroundColor Green
Write-Host "📊 API: http://localhost:5000" -ForegroundColor Cyan
Write-Host "📈 Health check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "📋 View logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
