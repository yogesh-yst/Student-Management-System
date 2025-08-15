# deploy-with-secrets.ps1
# Complete deployment script using Google Secret Manager

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectId = "bala-vihar-sms",
    
    [Parameter(Mandatory = $false)]
    [string]$Region = "us-east1",
    
    [Parameter(Mandatory = $false)]
    [switch]$CreateSecretsOnly,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipSecrets
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

Write-Host "${Green}🚀 Bala Vihar Backend Deployment with Secret Manager${Reset}"
Write-Host "${Blue}Project: $ProjectId${Reset}"
Write-Host "${Blue}Region: $Region${Reset}"
Write-Host ""

# Step 1: Set up GCP project
Write-Host "${Yellow}📋 Setting up GCP project...${Reset}"
gcloud config set project $ProjectId
if ($LASTEXITCODE -ne 0) {
    Write-Host "${Red}❌ Failed to set project. Make sure you're authenticated and the project exists.${Reset}"
    exit 1
}

# Step 2: Enable required APIs
Write-Host "${Yellow}🔧 Enabling required Google Cloud APIs...${Reset}"
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "Enabling $api..."
    gcloud services enable $api
}

# Step 3: Create secrets from .env.gcp
if (!$SkipSecrets) {
    Write-Host "${Yellow}🔐 Creating secrets from .env.gcp...${Reset}"
    if (Test-Path ".env.gcp") {
        .\create-secrets.ps1 -ProjectId $ProjectId
        if ($LASTEXITCODE -ne 0) {
            Write-Host "${Red}❌ Failed to create secrets.${Reset}"
            exit 1
        }
    } else {
        Write-Host "${Red}❌ .env.gcp file not found!${Reset}"
        exit 1
    }
    
    if ($CreateSecretsOnly) {
        Write-Host "${Green}✅ Secrets created successfully! Exiting as requested.${Reset}"
        exit 0
    }
}

# Step 4: Grant Cloud Build access to secrets
Write-Host "${Yellow}🔑 Granting Cloud Build access to secrets...${Reset}"
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$buildServiceAccount = "$projectNumber@cloudbuild.gserviceaccount.com"

$secrets = @("MONGO_URI", "DB_NAME", "SESSION_SECRET", "SESSION_NAME", "CORS_ORIGIN", "BCRYPT_ROUNDS")
foreach ($secret in $secrets) {
    gcloud secrets add-iam-policy-binding $secret `
        --member="serviceAccount:$buildServiceAccount" `
        --role="roles/secretmanager.secretAccessor"
}

# Step 5: Build and deploy
Write-Host "${Yellow}🏗️ Building and deploying backend...${Reset}"
gcloud builds submit --config=cloudbuild-with-secrets.yaml --region=$Region

if ($LASTEXITCODE -eq 0) {
    Write-Host "${Green}✅ Backend deployment completed successfully!${Reset}"
    # Get the service URL
    $serviceUrl = gcloud run services describe bala-vihar-backend --region=$Region --format="value(status.url)"
    Write-Host "${Green}🌐 Backend URL: $serviceUrl${Reset}"
    Write-Host "${Green}🔍 Health Check: $serviceUrl/api/health${Reset}"
}
