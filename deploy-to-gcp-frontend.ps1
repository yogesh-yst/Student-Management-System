# deploy-to-gcp.ps1
# Complete deployment script for Bala Vihar to Google Cloud Platform (Windows PowerShell)

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "bala-vihar-sms",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-central1",
    
    [Parameter(Mandatory=$false)]
    [string]$FrontendService = "bala-vihar-sms",
    
    [Parameter(Mandatory=$false)]
    [string]$BackendService = "bala-vihar-backend"
)

# Colors for output (compatible with Windows PowerShell 5.1+ and PowerShell 7+)
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Reset = "White"  # Not directly used but kept for compatibility

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $Reset
    )
    Write-Host $Message -ForegroundColor $Color
}
try {
} catch {
    # Fallback for older PowerShell versions
}

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $Reset
    )
    Write-Host "$Color$Message$Reset"
}

# Function to check command success
function Test-LastCommand {
    param([string]$ErrorMessage)
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput " $ErrorMessage" $Red
        exit 1
    }
}

# Write-ColorOutput " Starting Bala Vihar GCP Deployment" $Green
# Write-ColorOutput "Project ID: $ProjectId" $Blue
# Write-ColorOutput "Region: $Region" $Blue

# Check if gcloud is installed
# try {
#     $gcloudVersion = gcloud version --format="value(Google Cloud SDK)" 2>$null
#     Write-ColorOutput " Google Cloud SDK detected: $gcloudVersion" $Green
# } catch {
#     Write-ColorOutput " gcloud CLI is not installed. Please install it first." $Red
#     Write-ColorOutput "Download from: https://cloud.google.com/sdk/docs/install" $Yellow
#     exit 1
# }

try {
    $currentAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ([string]::IsNullOrEmpty($currentAccount)) {
        Write-ColorOutput " No active Google Cloud account found!" $Red
        Write-ColorOutput " Please authenticate with Google Cloud..." $Yellow
        gcloud auth login
        Test-LastCommand "Authentication failed"
    } else {
        Write-ColorOutput " Authenticated as: $currentAccount" $Green
    }
} 
catch {
    Write-ColorOutput " Failed to authenticate" $Red
}
finally {
        Test-LastCommand "Authentication failed"
}

# Set project
Write-ColorOutput " Setting GCP project to $ProjectId..." $Yellow
gcloud config set project $ProjectId
Test-LastCommand "Failed to set project"

# # Check if project exists, create if it doesn't
# $projectExists = gcloud projects describe $ProjectId --format="value(projectId)" 2>$null
# if ([string]::IsNullOrEmpty($projectExists)) {
#     Write-ColorOutput " Creating new project: $ProjectId..." $Yellow
#     gcloud projects create $ProjectId --name="Bala Vihar SMS"
#     Test-LastCommand "Failed to create project"
    
#     Write-ColorOutput "  Please enable billing for this project in the Google Cloud Console:" $Yellow
#     Write-ColorOutput "   https://console.cloud.google.com/billing/linkedaccount?project=$ProjectId" $Blue
#     $continue = Read-Host "Press Enter after enabling billing, or type 'skip' to continue anyway"
# }

# Enable required APIs
Write-ColorOutput " Enabling required APIs..." $Yellow
$apis = @(
    "cloudbuild.googleapis.com",
    "run.googleapis.com", 
    "compute.googleapis.com",
    "secretmanager.googleapis.com",
    "containerregistry.googleapis.com"
)

foreach ($api in $apis) {
    Write-ColorOutput "   Enabling $api..." $Blue
    gcloud services enable $api
    Test-LastCommand "Failed to enable $api"
}

Write-ColorOutput " All APIs enabled successfully" $Green

# Create secrets
Write-ColorOutput " Setting up secrets..." $Yellow

# Check if secrets already exist
$mongoSecretExists = gcloud secrets describe mongodb-uri --format="value(name)" 2>$null
$jwtSecretExists = gcloud secrets describe jwt-secret --format="value(name)" 2>$null

if ([string]::IsNullOrEmpty($mongoSecretExists)) {
    Write-ColorOutput " Please enter your MongoDB connection string:" $Yellow
    Write-ColorOutput "   Example: mongodb+srv://username:password@cluster.mongodb.net/bala_vihar_db" $Blue
    $mongoUri = Read-Host "MongoDB URI"
    
    if (![string]::IsNullOrEmpty($mongoUri)) {
        $mongoUri | gcloud secrets create mongodb-uri --data-file=-
        Test-LastCommand "Failed to create mongodb-uri secret"
        Write-ColorOutput " MongoDB URI secret created" $Green
    } else {
        Write-ColorOutput "  Skipping MongoDB URI secret creation" $Yellow
    }
} else {
    Write-ColorOutput " MongoDB URI secret already exists" $Green
}

if ([string]::IsNullOrEmpty($jwtSecretExists)) {
    Write-ColorOutput " Creating JWT secret..." $Yellow
    $jwtSecret = "bala-vihar-jwt-secret-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $jwtSecret | gcloud secrets create jwt-secret --data-file=-
    Test-LastCommand "Failed to create jwt-secret"
    Write-ColorOutput " JWT secret created" $Green
} else {
    Write-ColorOutput " JWT secret already exists" $Green
}

# # Deploy Backend
# Write-ColorOutput "  Building and deploying backend..." $Yellow
$originalLocation = Get-Location

# try {
#     Set-Location "nodebackend"
    
#     # Check if cloudbuild.yaml exists
#     if (!(Test-Path "cloudbuild.yaml")) {
#         Write-ColorOutput " cloudbuild.yaml not found in backend directory" $Red
#         Write-ColorOutput "   Please ensure you've copied the GCP configuration files" $Yellow
#         exit 1
#     }
    
#     # Check if Dockerfile.gcp exists
#     if (!(Test-Path "Dockerfile.gcp")) {
#         Write-ColorOutput " Dockerfile.gcp not found in backend directory" $Red
#         Write-ColorOutput "   Please ensure you've copied the GCP configuration files" $Yellow
#         exit 1
#     }
    
#     Write-ColorOutput "   Submitting build for backend..." $Blue
#     gcloud builds submit --config cloudbuild.yaml .
#     Test-LastCommand "Backend deployment failed"
    
#     Write-ColorOutput " Backend deployed successfully" $Green
# } catch {
#     Write-ColorOutput " Error during backend deployment: $_" $Red
#     exit 1
# } finally {
#     Set-Location $originalLocation
# }

# Deploy Frontend
Write-ColorOutput "  Building and deploying frontend..." $Yellow

try {
    Set-Location "frontend/mms-frontend"
    
    # Check if cloudbuild.yaml exists
    if (!(Test-Path "cloudbuild.yaml")) {
        Write-ColorOutput " cloudbuild.yaml not found in frontend directory" $Red
        Write-ColorOutput "   Please ensure you've copied the GCP configuration files" $Yellow
        exit 1
    }
    
    # Check if Dockerfile.gcp exists
    if (!(Test-Path "Dockerfile.gcp")) {
        Write-ColorOutput " Dockerfile.gcp not found in frontend directory" $Red
        Write-ColorOutput "   Please ensure you've copied the GCP configuration files" $Yellow
        exit 1
    }
    
    Write-ColorOutput "   Submitting build for frontend..." $Blue
    gcloud builds submit --config cloudbuild.yaml .
    Test-LastCommand "Frontend deployment failed"
    
    Write-ColorOutput " Frontend deployed successfully" $Green
} catch {
    Write-ColorOutput " Error during frontend deployment: $_" $Red
    exit 1
} finally {
    Set-Location $originalLocation
}

# Get service URLs
Write-ColorOutput " Getting service URLs..." $Yellow
$BackendUrl = gcloud run services describe $BackendService --region=$Region --format="value(status.url)"
$FrontendUrl = gcloud run services describe $FrontendService --region=$Region --format="value(status.url)"

if ([string]::IsNullOrEmpty($BackendUrl) -or [string]::IsNullOrEmpty($FrontendUrl)) {
    Write-ColorOutput " Failed to get service URLs. Deployment may have failed." $Red
    exit 1
}

Write-ColorOutput " Deployment completed successfully!" $Green
Write-ColorOutput " Service Information:" $Blue
Write-ColorOutput "   Frontend URL: $FrontendUrl" $Green
Write-ColorOutput "   Backend URL: $BackendUrl" $Green

# Update frontend environment variable to point to backend
Write-ColorOutput " Updating frontend to use backend URL..." $Yellow
gcloud run services update $FrontendService --region=$Region --set-env-vars="VITE_API_URL=$BackendUrl"
Test-LastCommand "Failed to update frontend environment variables"

# Update backend CORS to allow frontend
Write-ColorOutput " Updating backend CORS settings..." $Yellow
gcloud run services update $BackendService --region=$Region --set-env-vars="CORS_ORIGIN=$FrontendUrl"
Test-LastCommand "Failed to update backend environment variables"

Write-ColorOutput " All services updated and ready!" $Green

# # Display next steps
# Write-ColorOutput "`n Next Steps:" $Yellow
# Write-ColorOutput "1.  Test your application:" $Blue
# Write-ColorOutput "   Frontend: $FrontendUrl" $Green
# Write-ColorOutput "   Backend Health: $BackendUrl/api/health" $Green
# Write-ColorOutput "`n2.  Set up custom domain (optional):" $Blue
# Write-ColorOutput "   Run the load balancer setup commands from gcp-load-balancer.yaml" $Yellow
# Write-ColorOutput "`n3.  Monitor your application:" $Blue
# Write-ColorOutput "   Cloud Console: https://console.cloud.google.com/run?project=$ProjectId" $Yellow
# Write-ColorOutput "`n4.  View logs:" $Blue
# Write-ColorOutput "   Frontend: gcloud logs tail `"resource.type=cloud_run_revision AND resource.labels.service_name=$FrontendService`"" $Yellow
# Write-ColorOutput "   Backend: gcloud logs tail `"resource.type=cloud_run_revision AND resource.labels.service_name=$BackendService`"" $Yellow

# Save URLs to file for reference
$urlInfo = @"
Bala Vihar GCP Deployment Information
=====================================
Deployment Date: $(Get-Date)
Project ID: $ProjectId
Region: $Region

Service URLs:
- Frontend: $FrontendUrl
- Backend: $BackendUrl
- Backend Health: $BackendUrl/api/health

Management URLs:
- Cloud Console: https://console.cloud.google.com/run?project=$ProjectId
- Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=$ProjectId
- Secrets Manager: https://console.cloud.google.com/security/secret-manager?project=$ProjectId

Log Commands:
- Frontend Logs: gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=$FrontendService"
- Backend Logs: gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=$BackendService"
"@

$urlInfo | Out-File -FilePath "deployment-info.txt" -Encoding UTF8
#Write-ColorOutput "`n Deployment information saved to: deployment-info.txt" $Green

#Write-ColorOutput "`n Bala Vihar School Management System is now live on Google Cloud Platform!" $Green