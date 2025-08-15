# create-secrets.ps1
# Script to create Google Cloud secrets from .env.gcp file

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "bala-vihar-sms"
)

Write-Host "Creating Google Cloud secrets for project: $ProjectId" -ForegroundColor Green

# Set the project
Write-Host "Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Read .env.gcp file and create secrets
if (Test-Path ".env.gcp") {
    Write-Host "Reading .env.gcp file..." -ForegroundColor Yellow
    
    $envContent = Get-Content ".env.gcp" | Where-Object { 
        $_ -and !$_.StartsWith("#") -and $_.Contains("=") 
    }
    
    foreach ($line in $envContent) {
        $parts = $line -split "=", 2
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()
        
        if ($key -and $value) {
            Write-Host "Processing secret: $key" -ForegroundColor Yellow
            
            # Create a temporary file for the secret value
            $tempFile = [System.IO.Path]::GetTempFileName()
            $value | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
            
            # Try to create the secret first
            $createResult = gcloud secrets create $key 2>&1
            
            # Add the secret version (works whether secret exists or not)
            $addResult = gcloud secrets versions add $key --data-file=$tempFile 2>&1
            
            # Clean up temp file
            Remove-Item $tempFile -Force
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Secret $key created/updated successfully" -ForegroundColor Green
            } else {
                Write-Host "❌ Failed to create/update secret $key" -ForegroundColor Red
                Write-Host "Error: $addResult" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "✅ Secrets creation completed!" -ForegroundColor Green
    Write-Host "To list all secrets, run: gcloud secrets list" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ .env.gcp file not found!" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the nodebackend directory" -ForegroundColor Yellow
    exit 1
}
