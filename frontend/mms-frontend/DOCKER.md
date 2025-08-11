# MMS Frontend - Docker Setup

This document explains how to run the MMS Frontend application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

### Development Mode

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Run frontend only (development):**
   ```bash
   docker-compose up mms-frontend-dev
   ```

3. **Run full stack (frontend + backend + MongoDB):**
   ```bash
   docker-compose --profile with-mongo up
   ```

### Production Mode

1. **Run frontend in production mode:**
   ```bash
   docker-compose --profile production up mms-frontend-prod
   ```

## Available Services

### Frontend Services

- **mms-frontend** (Development): Runs on http://localhost:5173
- **mms-frontend-prod** (Production): Runs on http://localhost:3000

### Backend Services (from root docker-compose.yml)

- **backend**: Flask API server on http://localhost:5000
- **mongodb**: MongoDB database on localhost:27017 (optional)

## Docker Commands

### Frontend Only

```bash
# Build frontend image
docker build -t mms-frontend .

# Build production image
docker build -t mms-frontend:prod --target production .

# Run development container
docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules mms-frontend

# Run production container
docker run -p 3000:80 mms-frontend:prod
```

### Using Docker Compose (Frontend Only)

```bash
# Development mode
docker-compose up mms-frontend-dev

# Production mode
docker-compose --profile production up mms-frontend-prod

# Build and run
docker-compose up --build mms-frontend-dev

# Run in background
docker-compose up -d mms-frontend-dev

# Stop services
docker-compose down

# View logs
docker-compose logs mms-frontend-dev
```

### Full Stack (from root directory)

```bash
# Run everything (frontend + backend + MongoDB)
docker-compose --profile with-mongo up

# Run frontend and backend only (using external MongoDB)
docker-compose up

# Production mode
docker-compose --profile production --profile with-mongo up
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Backend API URL for frontend
VITE_API_URL=http://localhost:5000

# MongoDB (if using local instance)
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
DB_NAME=student_management
MONGO_URI=mongodb://admin:password123@mongodb:27017/student_management?authSource=admin

# Backend
SECRET_KEY=your-super-secret-key-change-in-production
FLASK_ENV=development
```

## Development Workflow

1. **Start development environment:**
   ```bash
   docker-compose up mms-frontend-dev
   ```

2. **The application will be available at:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000 (if running backend)

3. **Hot reloading is enabled** - changes to source files will automatically reload the application.

4. **Stop the environment:**
   ```bash
   docker-compose down
   ```

## Production Deployment

1. **Build production image:**
   ```bash
   docker build -t mms-frontend:prod --target production .
   ```

2. **Run production container:**
   ```bash
   docker run -p 3000:80 mms-frontend:prod
   ```

Or use Docker Compose:
```bash
docker-compose --profile production up mms-frontend-prod
```

## Troubleshooting

### Port Already in Use
If you get port conflicts:
```bash
# Check what's using the port
netstat -an | findstr :5173

# Use different ports
docker-compose up -p 3001:5173 mms-frontend-dev
```

### Container Won't Start
1. Check logs:
   ```bash
   docker-compose logs mms-frontend-dev
   ```

2. Rebuild the image:
   ```bash
   docker-compose build --no-cache mms-frontend-dev
   ```

### Node Modules Issues
If you encounter node_modules issues:
```bash
# Remove the volume and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## File Structure

```
frontend/mms-frontend/
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Frontend services
├── nginx.conf             # Nginx config for production
├── .dockerignore          # Files to exclude from build
├── package.json           # Dependencies and scripts
└── src/                   # Source code
```

## Networks

All services run on the `mms-network` Docker network, allowing them to communicate using service names:
- Frontend can reach backend at `http://backend:5000`
- Backend can reach MongoDB at `mongodb:27017`
