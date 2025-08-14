# Login first and save session
$session = $null
$body = '{"username": "admin", "password": "admin123"}'
$loginResponse = Invoke-WebRequest -Uri "https://bala-vihar-backend-612621646571.us-central1.run.app/api/login" -Method POST -Headers @{ 'Content-Type' = 'application/json' } -Body $body -SessionVariable session
write-output $loginResponse.Content
write-output $session


# Then use the session for subsequent requests
Invoke-WebRequest -Uri "https://bala-vihar-backend-612621646571.us-central1.run.app/api/attendance/today" -Method GET -WebSession $session