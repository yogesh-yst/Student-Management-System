#!/usr/bin/env python3
"""
CORS Verification Script
This script helps test CORS configuration between frontend and backend
"""

import requests
import json

# Your deployment URLs
FRONTEND_URL = "https://3xb6nq2gmh.us-east-2.awsapprunner.com"
BACKEND_URL = "https://uzbkpr7qm5.us-east-2.awsapprunner.com"

def test_cors_preflight():
    """Test CORS preflight request"""
    print("🔍 Testing CORS preflight request...")
    
    headers = {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
    }
    
    try:
        response = requests.options(f"{BACKEND_URL}/api/login", headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if 'Access-Control-Allow-Origin' in response.headers:
            print("✅ CORS preflight successful!")
            print(f"   Allowed Origin: {response.headers['Access-Control-Allow-Origin']}")
        else:
            print("❌ CORS preflight failed - no Access-Control-Allow-Origin header")
            
    except Exception as e:
        print(f"❌ Error testing CORS: {e}")

def test_backend_health():
    """Test backend health endpoint"""
    print("\n🏥 Testing backend health...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/health")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Backend is healthy!")
            print(f"   Status: {health_data.get('status')}")
            print(f"   MongoDB: {health_data.get('mongodb')}")
        else:
            print("❌ Backend health check failed")
            
    except Exception as e:
        print(f"❌ Error checking health: {e}")

def test_actual_login():
    """Test actual login request with CORS"""
    print("\n🔐 Testing login request with CORS...")
    
    headers = {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json'
    }
    
    data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/api/login", 
                               headers=headers, 
                               json=data)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if 'Access-Control-Allow-Origin' in response.headers:
            print("✅ Login request CORS successful!")
            print(f"   Allowed Origin: {response.headers['Access-Control-Allow-Origin']}")
        else:
            print("❌ Login request CORS failed")
            
        if response.status_code == 200:
            print("✅ Login successful!")
        else:
            print(f"❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing login: {e}")

if __name__ == "__main__":
    print("🧪 CORS Configuration Test")
    print(f"Frontend: {FRONTEND_URL}")
    print(f"Backend: {BACKEND_URL}")
    print("=" * 50)
    
    test_backend_health()
    test_cors_preflight()
    test_actual_login()
    
    print("\n" + "=" * 50)
    print("📝 If CORS is still failing:")
    print("   1. Redeploy the backend: copilot svc deploy --name sms-api --env dev")
    print("   2. Check the backend logs: copilot svc logs --name sms-api --env dev")
    print("   3. Verify environment variables are set correctly")
