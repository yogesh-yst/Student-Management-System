# Docker Configuration Guide

This directory contains separate Docker configurations for development and production environments.

## Quick Start

### Development Environment
```bash
# Windows
.\start-dev.ps1

# Linux/Mac
./start-dev.sh
```

### Production Environment
```bash
# Windows
.\start-prod.ps1

# Linux/Mac
./start-prod.sh
```

## Manual Usage

### Development
```bash
# Copy and edit environment file
cp .env.dev.example .env.dev
# Edit .env.dev with your settings

# Start development environment
docker-compose -f docker-compose.dev.yml --env-file .env.dev up --build
```

### Production
```bash
# Copy and edit environment file
cp .env.prod.example .env.prod
# Edit .env.prod with your production settings

# Start production environment
docker-compose -f docker-compose.prod.yml --env-file .env.prod up --build -d
```

## File Structure

```
backend/
├── Dockerfile              # Production Dockerfile
├── Dockerfile.dev          # Development Dockerfile
├── docker-compose.yml      # Default compose file (production)
├── docker-compose.dev.yml  # Development compose file
├── docker-compose.prod.yml # Production compose file
├── .env.dev.example        # Development environment template
├── .env.prod.example       # Production environment template
├── start-dev.ps1/.sh       # Development startup scripts
├── start-prod.ps1/.sh      # Production startup scripts
└── docker/
    ├── mongo-init.js        # Dev MongoDB initialization
    └── mongo-init-prod.js   # Prod MongoDB initialization
```

## Environment Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Server** | Flask dev server | Gunicorn WSGI |
| **Database** | Local MongoDB | Atlas/Local MongoDB |
| **Debug Mode** | Enabled | Disabled |
| **Code Reload** | Auto-reload | No reload |
| **Volume Mounting** | Source code mounted | No mounting |
| **Admin UI** | Mongo Express included | Not included |
| **Logging** | Console only | File + Console |
| **Health Checks** | Basic | Advanced |

## Services

### Development Services
- **web**: Flask application with development server
- **mongodb**: Local MongoDB instance
- **mongo-express**: MongoDB admin interface

### Production Services
- **web**: Flask application with Gunicorn
- **mongodb**: Optional local MongoDB (comment out if using Atlas)

## Ports

| Service | Development | Production |
|---------|-------------|------------|
| API | 5000 | 5000 |
| MongoDB | 27017 | 27017 |
| Mongo Express | 8081 | - |

## Environment Variables

### Development (.env.dev)
```env
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=dev-secret-key
MONGO_URI=mongodb://admin:password@mongodb:27017/
DB_NAME=sms_db_dev
```

### Production (.env.prod)
```env
FLASK_ENV=production
SECRET_KEY=your-secure-secret-key
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=sms_db
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build
docker-compose -f docker-compose.prod.yml up --build

# Access container shell
docker-compose -f docker-compose.dev.yml exec web bash
docker-compose -f docker-compose.prod.yml exec web bash

# View container stats
docker stats
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   docker-compose down  # Stop existing containers
   ```

2. **Permission denied**
   ```bash
   chmod +x start-dev.sh start-prod.sh  # Make scripts executable
   ```

3. **Environment file not found**
   ```bash
   cp .env.dev.example .env.dev
   cp .env.prod.example .env.prod
   ```

4. **Database connection failed**
   - Check MongoDB service is running
   - Verify MONGO_URI in environment file
   - Ensure network connectivity

### Health Checks
- Development: http://localhost:5000/api/health
- Production: http://localhost:5000/api/health

### MongoDB Access
- Development: 
  - Direct: mongodb://admin:password@localhost:27017/
  - Admin UI: http://localhost:8081
- Production: Use your configured MONGO_URI
