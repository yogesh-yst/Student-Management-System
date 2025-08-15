# deploy-with-secrets.ps1
# Complete deployment script using Google Secret Manager
# PowerShell 5.1 Compatible Version

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectId = "bala-vihar-sms",
    

    [Parameter(Mandatory = $false)]
    [string]$Region = "us-central1",
    
    [Parameter(Mandatory = $false)]
    [switch]$CreateSecretsOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipSecrets
)

# Function to write colored output (PS 5.1 compatible)
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

Write-ColorOutput "=== Bala Vihar Backend Deployment with Secret Manager ===" -ForegroundColor Green
Write-ColorOutput "Project: $ProjectId" -ForegroundColor Cyan
Write-ColorOutput "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Step 1: Set up GCP project
Write-ColorOutput "Step 1: Setting up GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERROR: Failed to set project. Make sure you're authenticated and the project exists." -ForegroundColor Red
    exit 1
}

# Step 2: Enable required APIs
Write-ColorOutput "Step 2: Enabling required Google Cloud APIs..." -ForegroundColor Yellow
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..."
    gcloud services enable $api
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "WARNING: Failed to enable $api" -ForegroundColor Yellow
    }
}

# Step 3: Create secrets from .env.gcp
if (!$SkipSecrets) {
    Write-ColorOutput "Step 3: Creating secrets from .env.gcp..." -ForegroundColor Yellow
    if (Test-Path ".env.gcp") {
        & ".\create-secrets.ps1" -ProjectId $ProjectId
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "ERROR: Failed to create secrets." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-ColorOutput "ERROR: .env.gcp file not found!" -ForegroundColor Red
        exit 1
    }
    
    if ($CreateSecretsOnly) {
        Write-ColorOutput "SUCCESS: Secrets created successfully! Exiting as requested." -ForegroundColor Green
        exit 0
    }
}

# Step 4: Grant Cloud Build access to secrets
Write-ColorOutput "Step 4: Granting Cloud Build access to secrets..." -ForegroundColor Yellow
try {
    $projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get project number"
    }
    
    $buildServiceAccount = "$projectNumber@cloudbuild.gserviceaccount.com"
    Write-Host "Cloud Build Service Account: $buildServiceAccount"
    
    $secrets = @("MONGO_URI", "DB_NAME", "SESSION_SECRET", "SESSION_NAME", "CORS_ORIGIN", "BCRYPT_ROUNDS")
    foreach ($secret in $secrets) {
        Write-Host "Granting access to secret: $secret"
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$buildServiceAccount" --role="roles/secretmanager.secretAccessor"
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "WARNING: Failed to grant access to secret $secret" -ForegroundColor Yellow
        }
    }
} catch {
    Write-ColorOutput "ERROR: Failed to grant Cloud Build access to secrets: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Build and deploy
Write-ColorOutput "Step 5: Building and deploying backend..." -ForegroundColor Yellow
gcloud builds submit --config=cloudbuild-with-secrets.yaml --region=$Region

if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "SUCCESS: Backend deployment completed successfully!" -ForegroundColor Green
    
    # Get the service URL
    try {
        $serviceUrl = gcloud run services describe bala-vihar-backend --region=$Region --format="value(status.url)"
        if ($serviceUrl) {
            Write-ColorOutput "Backend URL: $serviceUrl" -ForegroundColor Green
            Write-ColorOutput "Health Check: $serviceUrl/api/health" -ForegroundColor Green
        }
    } catch {
        Write-ColorOutput "Note: Could not retrieve service URL automatically." -ForegroundColor Yellow
    }
} else {
    Write-ColorOutput "ERROR: Deployment failed!" -ForegroundColor Red
    exit 1
}