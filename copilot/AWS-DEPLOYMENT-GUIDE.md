# AWS Copilot Deployment Guide for MMS Frontend

## 🚀 Prerequisites

### 1. AWS CLI Setup
```bash
# Install AWS CLI v2
# Configure your credentials
aws configure

# Verify your credentials
aws sts get-caller-identity
```

### 2. Copilot CLI Installation
```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/aws/copilot-cli/releases/latest/download/copilot-windows.exe" -OutFile "copilot.exe"

# Or using Chocolatey
choco install aws-copilot-cli

# Verify installation
copilot --version
```

## 📋 Current Setup Status

✅ **Application**: `cmc-member-management`  
✅ **Service**: `mms-frontend`  
✅ **Type**: Request-Driven Web Service (AWS App Runner)  
✅ **Docker**: Multi-stage build ready  
✅ **Manifest**: Configured for production deployment  

## 🔧 Configuration Updates Made

### Manifest File Updates (`copilot/mms-frontend/manifest.yml`)

1. **Build Configuration**:
   - ✅ Fixed Docker build path: `../../frontend/mms-frontend/Dockerfile`
   - ✅ Set target to `production` for optimized build
   - ✅ Changed port from `5173` to `80` for production

2. **Health Check**:
   - ✅ Enabled health check on `/` path
   - ✅ Configured appropriate timeouts and thresholds

3. **Environment Variables**:
   - ✅ Set `NODE_ENV=production`
   - ⚠️ **TODO**: Update `VITE_API_URL` with your backend URL

## 🚀 Deployment Steps

### Option 1: Quick Deploy (if environment exists)

```bash
# Navigate to project root
cd "f:\CMC\Student Management System"

# Deploy to existing environment
copilot svc deploy --name mms-frontend --env <your-env-name>
```

### Option 2: Complete Setup (new environment)

```bash
# Navigate to copilot directory
cd "f:\CMC\Student Management System\copilot"

# 1. Create new environment
copilot env init --name dev

# 2. Deploy environment infrastructure
copilot env deploy --name dev

# 3. Navigate back to root for build context
cd ..

# 4. Deploy the frontend service
copilot svc deploy --name mms-frontend --env dev
```

### Option 3: Use the PowerShell Script

```powershell
# Navigate to copilot directory
cd "f:\CMC\Student Management System\copilot"

# Run the deployment script
.\deploy-frontend.ps1
```

## 📝 Important Configuration Notes

### Environment Variables Update Required

⚠️ **IMPORTANT**: You need to update the backend API URL in the manifest:

```yaml
# In copilot/mms-frontend/manifest.yml
variables:
  NODE_ENV: production
  VITE_API_URL: https://your-backend-api-url  # 👈 UPDATE THIS
```

**Options for backend URL**:
1. If backend is deployed via Copilot: Use the service URL
2. If backend is elsewhere: Use the actual URL
3. If backend not deployed yet: Deploy backend first

### Resource Allocation

Current settings in manifest:
- **CPU**: 1024 units (1 vCPU)
- **Memory**: 2048 MiB (2 GB)

These are appropriate for a React/Vite frontend application.

## 🔍 Monitoring and Management

### Check Application Status
```bash
# Show application overview
copilot app show

# List environments
copilot env ls

# List services
copilot svc ls
```

### View Service Details
```bash
# Get service URL and details
copilot svc show --name mms-frontend --env <env-name>

# View service logs
copilot svc logs --name mms-frontend --env <env-name> --follow
```

### Update Service
```bash
# After making changes to code or manifest
copilot svc deploy --name mms-frontend --env <env-name>
```

## 🌐 Expected Deployment Result

After successful deployment, you'll get:

1. **AWS App Runner Service**: Automatically managed container service
2. **HTTPS URL**: Secure endpoint for your frontend application
3. **Auto Scaling**: Automatic scaling based on traffic
4. **Health Monitoring**: Built-in health checks and monitoring

Example URL: `https://random-string.region.awsapprunner.com`

## 🛠️ Troubleshooting

### Build Failures
```bash
# Check build logs
copilot svc logs --name mms-frontend --env <env-name>

# Force rebuild
copilot svc deploy --name mms-frontend --env <env-name> --force
```

### Common Issues

1. **Docker Build Context**: Ensure you're in the project root when deploying
2. **Environment Variables**: Double-check VITE_API_URL is correct
3. **Port Configuration**: Production build uses port 80, not 5173
4. **Health Check**: Ensure your app responds to `/` path

### Debug Commands
```bash
# Show detailed service information
copilot svc show --name mms-frontend --env <env-name> --json

# Check environment status
copilot env show --name <env-name>

# View CloudFormation events
copilot env status --name <env-name>
```

## 📋 Deployment Checklist

Before deploying:

- [ ] AWS credentials configured
- [ ] Copilot CLI installed and working
- [ ] Backend API URL determined
- [ ] Environment variables updated in manifest
- [ ] Docker build tested locally

After deployment:

- [ ] Service URL accessible
- [ ] Application loads correctly
- [ ] API calls work (if backend available)
- [ ] Health check passing
- [ ] Monitor logs for any errors

## 🔄 Next Steps

1. **Deploy Backend**: If not already deployed, consider deploying your Flask backend using Copilot as well
2. **Custom Domain**: Configure a custom domain for your frontend
3. **CI/CD Pipeline**: Set up automated deployments
4. **Monitoring**: Configure CloudWatch dashboards and alerts

## 🆘 Support Resources

- [AWS Copilot Documentation](https://aws.github.io/copilot-cli/)
- [App Runner Documentation](https://docs.aws.amazon.com/apprunner/)
- [Troubleshooting Guide](https://aws.github.io/copilot-cli/docs/developing/troubleshooting/)

---

Ready to deploy? Run the PowerShell script or use the manual commands above! 🚀
