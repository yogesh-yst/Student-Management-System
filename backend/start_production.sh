#!/bin/bash

# Production startup script for Student Management System Backend
# This script starts the backend using Gunicorn (production WSGI server)

echo "🚀 Starting Student Management System Backend with Gunicorn..."

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "📦 Activating virtual environment..."
    source .venv/bin/activate
fi

# Install dependencies if requirements.txt is newer than last install
if [ requirements.txt -nt .requirements_installed ] || [ ! -f .requirements_installed ]; then
    echo "📋 Installing/updating dependencies..."
    pip install -r requirements.txt
    touch .requirements_installed
fi

# Start the application with Gunicorn
echo "🌐 Starting Gunicorn server..."
echo "📊 Access the API at: http://localhost:5000"
echo "📈 Health check: http://localhost:5000/api/health"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

exec gunicorn -c gunicorn_config.py wsgi:application
