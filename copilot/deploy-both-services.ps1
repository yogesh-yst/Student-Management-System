# AWS Deployment Script for Both Services
# Run this script to deploy both frontend and backend with proper CORS configuration

Write-Host "🚀 Deploying Student Management System to AWS..." -ForegroundColor Green

# Get the current directory
$ProjectRoot = Get-Location

Write-Host "📍 Project root: $ProjectRoot" -ForegroundColor Yellow

# Deploy Backend API first
Write-Host "🔧 Deploying Backend API (sms-api)..." -ForegroundColor Blue
try {
    copilot svc deploy --name sms-api --env dev
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend API deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend API deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error deploying backend: $_" -ForegroundColor Red
    exit 1
}

# Deploy Frontend
Write-Host "🔧 Deploying Frontend (mms-frontend)..." -ForegroundColor Blue
try {
    copilot svc deploy --name mms-frontend --env dev
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend deployment failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error deploying frontend: $_" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test your frontend at: https://3xb6nq2gmh.us-east-2.awsapprunner.com" -ForegroundColor White
Write-Host "   2. Test your backend at: https://uzbkpr7qm5.us-east-2.awsapprunner.com" -ForegroundColor White
Write-Host "   3. Check logs if there are any issues: copilot svc logs --name <service-name> --env dev" -ForegroundColor White
