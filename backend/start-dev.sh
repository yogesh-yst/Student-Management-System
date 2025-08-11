#!/bin/bash
# Development startup script using Docker

echo "🚀 Starting Student Management System in DEVELOPMENT mode..."

# Check if .env.dev exists
if [ ! -f .env.dev ]; then
    echo "📋 Creating .env.dev from example..."
    cp .env.dev.example .env.dev
    echo "⚠️  Please edit .env.dev with your development settings"
fi

# Start development containers
echo "🐳 Starting development containers..."
docker-compose -f docker-compose.dev.yml --env-file .env.dev up --build

echo "🎯 Development server started!"
echo "📊 API: http://localhost:5000"
echo "🗄️  MongoDB: localhost:27017"
echo "📱 Mongo Express: http://localhost:8081"
