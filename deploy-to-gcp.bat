@echo off
REM deploy-to-gcp.bat
REM Complete deployment script for Bala Vihar to Google Cloud Platform (Windows Batch)

setlocal enabledelayedexpansion

REM Configuration
set PROJECT_ID=bala-vihar-sms
set REGION=us-central1
set FRONTEND_SERVICE=bala-vihar-frontend
set BACKEND_SERVICE=bala-vihar-backend

echo.
echo ========================================
echo    Bala Vihar GCP Deployment Script
echo ========================================
echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo.

REM Check if gcloud is installed
@REM gcloud version >nul 2>&1
@REM if %errorlevel% neq 0 (
@REM     echo ERROR: gcloud CLI is not installed or not in PATH
@REM     echo Please install Google Cloud SDK from:
@REM     echo https://cloud.google.com/sdk/docs/install
@REM     pause
@REM     exit /b 1
@REM )

@REM echo ✓ Google Cloud SDK detected

REM Check authentication
for /f "delims=" %%i in ('gcloud auth list --filter^=status:ACTIVE --format^="value(account)" 2^>nul') do set CURRENT_ACCOUNT=%%i

if "%CURRENT_ACCOUNT%"=="" (
    echo Authenticating with Google Cloud...
    gcloud auth login
    if %errorlevel% neq 0 (
        echo ERROR: Authentication failed
        pause
        exit /b 1
    )
) else (
    echo ✓ Authenticated as: %CURRENT_ACCOUNT%
)

REM Set project
echo.
echo Setting GCP project to %PROJECT_ID%...
gcloud config set project %PROJECT_ID%
if %errorlevel% neq 0 (
    echo ERROR: Failed to set project
    pause
    exit /b 1
)

REM Check if project exists
for /f "delims=" %%i in ('gcloud projects describe %PROJECT_ID% --format^="value(projectId)" 2^>nul') do set PROJECT_EXISTS=%%i

if "%PROJECT_EXISTS%"=="" (
    echo Creating new project: %PROJECT_ID%...
    gcloud projects create %PROJECT_ID% --name="Bala Vihar SMS"
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create project
        pause
        exit /b 1
    )
    
    echo.
    echo IMPORTANT: Please enable billing for this project:
    echo https://console.cloud.google.com/billing/linkedaccount?project=%PROJECT_ID%
    echo.
    pause
)

REM Enable APIs
echo.
echo Enabling required APIs...
echo   - Cloud Build API
gcloud services enable cloudbuild.googleapis.com
if %errorlevel% neq 0 (
    echo ERROR: Failed to enable Cloud Build API
    pause
    exit /b 1
)

echo   - Cloud Run API
gcloud services enable run.googleapis.com
if %errorlevel% neq 0 (
    echo ERROR: Failed to enable Cloud Run API
    pause
    exit /b 1
)

echo   - Compute Engine API
gcloud services enable compute.googleapis.com
if %errorlevel% neq 0 (
    echo ERROR: Failed to enable Compute Engine API
    pause
    exit /b 1
)

echo   - Secret Manager API
gcloud services enable secretmanager.googleapis.com
if %errorlevel% neq 0 (
    echo ERROR: Failed to enable Secret Manager API
    pause
    exit /b 1
)

echo   - Container Registry API
gcloud services enable containerregistry.googleapis.com
if %errorlevel% neq 0 (
    echo ERROR: Failed to enable Container Registry API
    pause
    exit /b 1
)

echo ✓ All APIs enabled successfully

REM Create secrets
echo.
echo Setting up secrets...

REM Check if MongoDB secret exists
for /f "delims=" %%i in ('gcloud secrets describe mongodb-uri --format^="value(name)" 2^>nul') do set MONGO_SECRET_EXISTS=%%i

if "%MONGO_SECRET_EXISTS%"=="" (
    echo.
    echo Please enter your MongoDB connection string:
    echo Example: mongodb+srv://username:password@cluster.mongodb.net/bala_vihar_db
    set /p MONGO_URI="MongoDB URI: "
    
    if not "!MONGO_URI!"=="" (
        echo !MONGO_URI! | gcloud secrets create mongodb-uri --data-file=-
        if %errorlevel% neq 0 (
            echo ERROR: Failed to create MongoDB URI secret
            pause
            exit /b 1
        )
        echo ✓ MongoDB URI secret created
    ) else (
        echo WARNING: Skipping MongoDB URI secret creation
    )
) else (
    echo ✓ MongoDB URI secret already exists
)

REM Check if JWT secret exists
for /f "delims=" %%i in ('gcloud secrets describe jwt-secret --format^="value(name)" 2^>nul') do set JWT_SECRET_EXISTS=%%i

if "%JWT_SECRET_EXISTS%"=="" (
    echo Creating JWT secret...
    for /f "delims=" %%i in ('powershell -command "Get-Date -Format 'yyyyMMddHHmmss'"') do set TIMESTAMP=%%i
    echo bala-vihar-jwt-secret-!TIMESTAMP! | gcloud secrets create jwt-secret --data-file=-
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create JWT secret
        pause
        exit /b 1
    )
    echo ✓ JWT secret created
) else (
    echo ✓ JWT secret already exists
)

REM Deploy Backend
echo.
echo ========================================
echo Building and deploying backend...
echo ========================================

if not exist "nodebackend\cloudbuild.yaml" (
    echo ERROR: cloudbuild.yaml not found in backend directory
    echo Please ensure you've copied the GCP configuration files
    pause
    exit /b 1
)

if not exist "nodebackend\Dockerfile.gcp" (
    echo ERROR: Dockerfile.gcp not found in backend directory
    echo Please ensure you've copied the GCP configuration files
    pause
    exit /b 1
)

cd backend
echo Submitting build for backend...
gcloud builds submit --config cloudbuild.yaml .
if %errorlevel% neq 0 (
    echo ERROR: Backend deployment failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo ✓ Backend deployed successfully

REM Deploy Frontend
echo.
echo ========================================
echo Building and deploying frontend...
echo ========================================

if not exist "frontend\mms-frontend\cloudbuild.yaml" (
    echo ERROR: cloudbuild.yaml not found in frontend directory
    echo Please ensure you've copied the GCP configuration files
    pause
    exit /b 1
)

if not exist "frontend\mms-frontend\Dockerfile.gcp" (
    echo ERROR: Dockerfile.gcp not found in frontend directory
    echo Please ensure you've copied the GCP configuration files
    pause
    exit /b 1
)

cd frontend\mms-frontend
echo Submitting build for frontend...
gcloud builds submit --config cloudbuild.yaml .
if %errorlevel% neq 0 (
    echo ERROR: Frontend deployment failed
    cd ..\..
    pause
    exit /b 1
)
cd ..\..

echo ✓ Frontend deployed successfully

REM Get service URLs
echo.
echo Getting service URLs...
for /f "delims=" %%i in ('gcloud run services describe %BACKEND_SERVICE% --region^=%REGION% --format^="value(status.url)"') do set BACKEND_URL=%%i
for /f "delims=" %%i in ('gcloud run services describe %FRONTEND_SERVICE% --region^=%REGION% --format^="value(status.url)"') do set FRONTEND_URL=%%i

if "%BACKEND_URL%"=="" (
    echo ERROR: Failed to get backend URL
    pause
    exit /b 1
)

if "%FRONTEND_URL%"=="" (
    echo ERROR: Failed to get frontend URL
    pause
    exit /b 1
)

echo.
echo ========================================
echo    Deployment Completed Successfully!
echo ========================================
echo Frontend URL: %FRONTEND_URL%
echo Backend URL: %BACKEND_URL%

REM Update environment variables
echo.
echo Updating service configurations...
echo Updating frontend to use backend URL...
gcloud run services update %FRONTEND_SERVICE% --region=%REGION% --set-env-vars="VITE_API_URL=%BACKEND_URL%"
if %errorlevel% neq 0 (
    echo WARNING: Failed to update frontend environment variables
)

echo Updating backend CORS settings...
gcloud run services update %BACKEND_SERVICE% --region=%REGION% --set-env-vars="CORS_ORIGIN=%FRONTEND_URL%"
if %errorlevel% neq 0 (
    echo WARNING: Failed to update backend environment variables
)

echo ✓ All services updated and ready!

REM Create info file
echo.
echo Saving deployment information...
(
echo Bala Vihar GCP Deployment Information
echo =====================================
echo Deployment Date: %date% %time%
echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo.
echo Service URLs:
echo - Frontend: %FRONTEND_URL%
echo - Backend: %BACKEND_URL%
echo - Backend Health: %BACKEND_URL%/api/health
echo.
echo Management URLs:
echo - Cloud Console: https://console.cloud.google.com/run?project=%PROJECT_ID%
echo - Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=%PROJECT_ID%
echo - Secrets Manager: https://console.cloud.google.com/security/secret-manager?project=%PROJECT_ID%
) > deployment-info.txt

echo ✓ Deployment information saved to: deployment-info.txt

REM Display next steps
echo.
echo ========================================
echo               Next Steps
echo ========================================
echo 1. Test your application:
echo    Frontend: %FRONTEND_URL%
echo    Backend Health: %BACKEND_URL%/api/health
echo.
echo 2. Set up custom domain (optional):
echo    Run the load balancer setup commands from gcp-load-balancer.yaml
echo.
echo 3. Monitor your application:
echo    Cloud Console: https://console.cloud.google.com/run?project=%PROJECT_ID%
echo.
echo 4. View logs:
echo    Frontend: gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=%FRONTEND_SERVICE%"
echo    Backend: gcloud logs tail "resource.type=cloud_run_revision AND resource.labels.service_name=%BACKEND_SERVICE%"
echo.
echo ========================================
echo   Bala Vihar SMS is now live on GCP!
echo ========================================

pause