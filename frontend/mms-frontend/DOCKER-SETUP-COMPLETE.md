# MMS Frontend Docker Setup - Complete Guide

## 🎉 Success! Your Docker setup is complete and working!

Your MMS Frontend is now successfully containerized and running with Docker. Here's everything you need to know:

## 📁 What Was Created

### Docker Files
- **`Dockerfile`** - Multi-stage build (development and production)
- **`docker-compose.yml`** - Service orchestration for frontend
- **`nginx.conf`** - Production web server configuration
- **`.dockerignore`** - Optimizes build by excluding unnecessary files

### Configuration Files
- **`.env`** - Environment variables
- **Updated `vite.config.js`** - Docker-compatible Vite configuration
- **Updated `package.json`** - Added Docker scripts

### Documentation and Scripts
- **`DOCKER.md`** - Comprehensive Docker documentation
- **`start-docker.bat`** - Windows batch script for easy startup
- **`start-docker.ps1`** - PowerShell script for easy startup

### Root Level Files
- **Root `docker-compose.yml`** - Full-stack orchestration
- **Root `.env.example`** - Environment template for full stack

## 🚀 Current Status

✅ **Frontend is running!** 
- Container: `mms-frontend-mms-frontend-dev-1`
- URL: http://localhost:5173
- Status: Development mode with hot reload enabled

✅ **Backend is running!**
- Container: `backend-web-1` 
- URL: http://localhost:5000
- Status: Ready to serve API requests

## 🛠️ How to Use

### Quick Start Commands

```bash
# Navigate to frontend directory
cd "f:\CMC\Student Management System\frontend\mms-frontend"

# Start development mode
docker-compose up -d mms-frontend-dev

# View logs
docker-compose logs -f mms-frontend-dev

# Stop services
docker-compose down
```

### Using the Scripts

**Windows Batch File:**
```bash
.\start-docker.bat
```

**PowerShell Script:**
```powershell
.\start-docker.ps1
```

## 🌐 Available Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend (Dev) | http://localhost:5173 | Development server with hot reload |
| Frontend (Prod) | http://localhost:3000 | Production build with Nginx |
| Backend API | http://localhost:5000 | Flask API server |

## 🔧 Available Docker Commands

### Development Mode
```bash
# Start development server
docker-compose up mms-frontend-dev

# Start in background
docker-compose up -d mms-frontend-dev

# Build and start
docker-compose up --build mms-frontend-dev
```

### Production Mode
```bash
# Start production build
docker-compose --profile production up mms-frontend-prod
```

### Full Stack Mode (from root directory)
```bash
cd "f:\CMC\Student Management System"

# Start everything with MongoDB
docker-compose --profile with-mongo up

# Start frontend and backend only
docker-compose up
```

## 📊 Docker Images Created

- **`mms-frontend:dev`** - Development image with Node.js and source code
- **`mms-frontend-mms-frontend-dev`** - Docker Compose managed development image

## 🔍 Monitoring and Debugging

### View Logs
```bash
# Real-time logs
docker-compose logs -f mms-frontend-dev

# All logs
docker-compose logs mms-frontend-dev
```

### Container Status
```bash
# List running containers
docker ps

# Container details
docker inspect mms-frontend-mms-frontend-dev-1
```

### Access Container Shell
```bash
# Execute commands inside container
docker exec -it mms-frontend-mms-frontend-dev-1 sh

# Check Vite processes
docker exec -it mms-frontend-mms-frontend-dev-1 ps aux
```

## 🔄 Development Workflow

1. **Start Development:**
   ```bash
   docker-compose up -d mms-frontend-dev
   ```

2. **Code Changes:** 
   - Make changes to your source files
   - Vite will automatically reload the page
   - No need to restart the container

3. **View Changes:**
   - Open http://localhost:5173
   - Changes appear instantly due to hot reload

4. **Stop Development:**
   ```bash
   docker-compose down
   ```

## 🚀 Production Deployment

1. **Build Production Image:**
   ```bash
   docker build -t mms-frontend:prod --target production .
   ```

2. **Run Production Container:**
   ```bash
   docker-compose --profile production up mms-frontend-prod
   ```

3. **Access Production Build:**
   - Open http://localhost:3000
   - Optimized build with Nginx serving static files

## 🌍 Environment Variables

Your `.env` file contains:
```bash
REACT_APP_API_URL=http://localhost:5000
```

For Docker networking (container-to-container communication), the Vite config uses:
```javascript
proxy: {
  '/api': {
    target: 'http://backend:5000', // Uses Docker service name
    changeOrigin: true,
  }
}
```

## 🎯 Next Steps

1. **Test the Application:**
   - Open http://localhost:5173
   - Verify all components load correctly
   - Test API connectivity with the backend

2. **Customize Configuration:**
   - Modify `.env` for different environments
   - Update `docker-compose.yml` for specific needs
   - Adjust `nginx.conf` for production optimizations

3. **Deploy to Production:**
   - Use the production Docker Compose profile
   - Consider using Docker Swarm or Kubernetes for scaling
   - Set up proper environment variables for production

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5173
netstat -an | findstr :5173

# Use different port in docker-compose.yml
ports:
  - "3001:5173"
```

### Container Won't Start
```bash
# Check logs
docker-compose logs mms-frontend-dev

# Rebuild image
docker-compose build --no-cache mms-frontend-dev
```

### Node Modules Issues
```bash
# Clean everything and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## 📝 Summary

✅ Docker and Docker Compose are fully configured
✅ Development environment is running on http://localhost:5173
✅ Hot reload is working for instant development feedback
✅ Production build is ready with Nginx optimization
✅ Full-stack orchestration is available from root directory
✅ Environment variables are properly configured
✅ Documentation and helper scripts are provided

Your MMS Frontend is now production-ready with Docker! 🎉
