#!/usr/bin/env pwsh
# AWS Copilot Deployment Script for MMS Frontend

Write-Host "🚀 AWS Copilot Deployment Script for MMS Frontend" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
$currentPath = Get-Location
Write-Host "Current directory: $currentPath" -ForegroundColor Yellow

# Check if copilot CLI is installed
try {
    $copilotVersion = copilot --version
    Write-Host "✅ Copilot CLI found: $copilotVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Copilot CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   https://aws.github.io/copilot-cli/docs/getting-started/install/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Choose deployment option:" -ForegroundColor Cyan
Write-Host "1. Deploy to existing environment"
Write-Host "2. Create new environment and deploy"
Write-Host "3. Show current application status"
Write-Host "4. Show logs"
Write-Host "5. Show service details"
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" 
    {
        Write-Host "🚀 Deploying to existing environment..." -ForegroundColor Green
        Write-Host ""
        
        # List available environments
        Write-Host "Available environments:" -ForegroundColor Cyan
        copilot env ls
        Write-Host ""
        
        $envName = Read-Host "Enter environment name"
        
        Write-Host ""
        Write-Host "Building and deploying frontend service..." -ForegroundColor Yellow
        
        # Navigate to root directory for build context
        Set-Location "../../"
        
        # Deploy the service
        copilot svc deploy --name mms-frontend --env $envName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Deployment successful!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Getting service URL..." -ForegroundColor Yellow
            copilot svc show --name mms-frontend --env $envName
        } else {
            Write-Host "❌ Deployment failed!" -ForegroundColor Red
        }
    }
    "2" 
    {
        Write-Host "🏗️  Creating new environment and deploying..." -ForegroundColor Green
        Write-Host ""
        
        $envName = Read-Host "Enter new environment name (e.g., 'dev', 'staging', 'prod')"
        
        Write-Host ""
        Write-Host "Creating environment: $envName" -ForegroundColor Yellow
        
        # Create new environment
        copilot env init --name $envName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Environment created successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Deploying environment infrastructure..." -ForegroundColor Yellow
            copilot env deploy --name $envName
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Environment deployed successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Deploying frontend service..." -ForegroundColor Yellow
                
                # Navigate to root directory for build context
                Set-Location "../../"
                
                copilot svc deploy --name mms-frontend --env $envName
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host ""
                    Write-Host "✅ Complete deployment successful!" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Getting service URL..." -ForegroundColor Yellow
                    copilot svc show --name mms-frontend --env $envName
                }
            }
        } else 
        {
            Write-Host "❌ Environment creation failed!" -ForegroundColor Red
        }
    }
    "3" 
    {
        Write-Host "📊 Application Status" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Application overview:" -ForegroundColor Cyan
        copilot app show
        
        Write-Host ""
        Write-Host "Environments:" -ForegroundColor Cyan
        copilot env ls
        
        Write-Host ""
        Write-Host "Services:" -ForegroundColor Cyan
        copilot svc ls
    }
    "4" 
    {
        Write-Host "📋 Service Logs" -ForegroundColor Green
        Write-Host ""
        
        copilot env ls
        $envName = Read-Host "Enter environment name to view logs"
        
        Write-Host ""
        Write-Host "Fetching logs for mms-frontend in $envName environment..." -ForegroundColor Yellow
        copilot svc logs --name mms-frontend --env $envName --follow
    }
    "5" 
    {
        Write-Host "🔍 Service Details" -ForegroundColor Green
        Write-Host ""
        
        copilot env ls
        $envName = Read-Host "Enter environment name"
        
        Write-Host ""
        Write-Host "Service details for mms-frontend in $envName environment:" -ForegroundColor Yellow
        copilot svc show --name mms-frontend --env $envName
    }
    default 
    {
        Write-Host "Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Script completed!" -ForegroundColor Green
Read-Host "Press Enter to continue"
