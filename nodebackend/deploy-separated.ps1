# deploy-separated.ps1
# Alternative deployment approach - separate build and deploy steps
# This can help avoid quota restrictions

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectId = "bala-vihar-sms",
    
    [Parameter(Mandatory = $false)]
    [string]$Region = "us-central1",
    
    [Parameter(Mandatory = $false)]
    [switch]$BuildOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$DeployOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipSecrets
)

# Function to write colored output (PS 5.1 compatible)
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    switch ($Color) {
        "Red" { Write-Host $Message -ForegroundColor Red }
        "Green" { Write-Host $Message -ForegroundColor Green }
        "Yellow" { Write-Host $Message -ForegroundColor Yellow }
        "Blue" { Write-Host $Message -ForegroundColor Blue }
        "Cyan" { Write-Host $Message -ForegroundColor Cyan }
        default { Write-Host $Message }
    }
}

Write-ColorOutput "🚀 Bala Vihar Backend Deployment (Separated Build/Deploy)" "Green"
Write-ColorOutput "Project: $ProjectId" "Blue"
Write-ColorOutput "Region: $Region" "Blue"
Write-Host ""

# Set up GCP project
Write-ColorOutput "📋 Setting up GCP project..." "Yellow"
gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Failed to set project. Make sure you're authenticated and the project exists." "Red"
    exit 1
}

if (!$DeployOnly) {
    # Step 1: Create secrets if needed
    if (!$SkipSecrets) {
        Write-ColorOutput "🔐 Creating secrets from .env.gcp..." "Yellow"
        if (Test-Path ".env.gcp") {
            .\create-secrets.ps1 -ProjectId $ProjectId
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "❌ Failed to create secrets." "Red"
                exit 1
            }
        } else {
            Write-ColorOutput "❌ .env.gcp file not found!" "Red"
            exit 1
        }
    }

    # Step 2: Build image using Cloud Build
    Write-ColorOutput "🏗️ Building container image..." "Yellow"
    gcloud builds submit --config=cloudbuild-simple.yaml
    
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "❌ Build failed!" "Red"
        exit 1
    }
    
    if ($BuildOnly) {
        Write-ColorOutput "✅ Build completed! Image ready for deployment." "Green"
        exit 0
    }
}

# Step 3: Deploy to Cloud Run with environment variables from secrets
Write-ColorOutput "🚀 Deploying to Cloud Run..." "Yellow"

# Get secret values and deploy
$mongoUri = gcloud secrets versions access latest --secret="MONGO_URI" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
$dbName = gcloud secrets versions access latest --secret="DB_NAME" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
$sessionSecret = gcloud secrets versions access latest --secret="SESSION_SECRET" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
$sessionName = gcloud secrets versions access latest --secret="SESSION_NAME" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
$corsOrigin = gcloud secrets versions access latest --secret="CORS_ORIGIN" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }
$bcryptRounds = gcloud secrets versions access latest --secret="BCRYPT_ROUNDS" --format="get(payload.data)" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }

gcloud run deploy bala-vihar-backend `
    --image gcr.io/$ProjectId/bala-vihar-backend:latest `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 10 `
    --update-env-vars "NODE_ENV=production,PORT=8080,MONGO_URI=$mongoUri,DB_NAME=$dbName,SESSION_SECRET=$sessionSecret,SESSION_NAME=$sessionName,CORS_ORIGIN=$corsOrigin,BCRYPT_ROUNDS=$bcryptRounds"

if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "✅ Deployment completed successfully!" "Green"
    
    # Get the service URL
    $serviceUrl = gcloud run services describe bala-vihar-backend --region=$Region --format="value(status.url)"
    Write-ColorOutput "🌐 Backend URL: $serviceUrl" "Green"
    Write-ColorOutput "🔍 Health Check: $serviceUrl/api/health" "Green"
    
} else {
    Write-ColorOutput "❌ Deployment failed!" "Red"
    exit 1
}
