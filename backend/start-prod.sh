#!/bin/bash
# Production startup script using Docker

echo "🚀 Starting Student Management System in PRODUCTION mode..."

# Check if .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod file not found!"
    echo "📋 Creating .env.prod from example..."
    cp .env.prod.example .env.prod
    echo "⚠️  IMPORTANT: Edit .env.prod with your production settings before continuing!"
    echo "🔐 Make sure to set secure SECRET_KEY and MONGO_URI"
    exit 1
fi

# Start production containers
echo "🐳 Starting production containers..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

echo "🎯 Production server started!"
echo "📊 API: http://localhost:5000"
echo "📈 Health check: http://localhost:5000/api/health"
echo "📋 View logs: docker-compose -f docker-compose.prod.yml logs -f"
