#!/usr/bin/env python3
"""
Session Testing Script
This script helps test session functionality and authentication
"""

import requests
import json

# Your deployment URLs
FRONTEND_URL = "https://3xb6nq2gmh.us-east-2.awsapprunner.com"
BACKEND_URL = "https://uzbkpr7qm5.us-east-2.awsapprunner.com"

def test_login_flow():
    """Test complete login flow"""
    print("🔐 Testing login flow...")
    
    # Create a session to maintain cookies
    session = requests.Session()
    
    # Set headers similar to browser
    headers = {
        'Origin': FRONTEND_URL,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
    }
    
    # Test 1: Check session before login
    print("\n1️⃣ Checking session before login...")
    try:
        response = session.get(f"{BACKEND_URL}/api/session", headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        print(f"   Cookies: {dict(response.cookies)}")
    except Exception as e:
        print(f"   Error: {e}")
    
    # Test 2: Attempt login
    print("\n2️⃣ Attempting login...")
    login_data = {
        'username': 'admin',
        'password': 'admin123'
    }
    
    try:
        response = session.post(f"{BACKEND_URL}/api/login", 
                               headers=headers, 
                               json=login_data)
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        print(f"   Cookies after login: {dict(response.cookies)}")
        print(f"   Session cookies: {dict(session.cookies)}")
        
        if response.status_code == 200:
            print("   ✅ Login successful!")
            login_successful = True
        else:
            print("   ❌ Login failed!")
            login_successful = False
            
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        login_successful = False
    
    # Test 3: Check session after login
    if login_successful:
        print("\n3️⃣ Checking session after login...")
        try:
            response = session.get(f"{BACKEND_URL}/api/session", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
            print(f"   Cookies: {dict(session.cookies)}")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 4: Try accessing protected endpoint
        print("\n4️⃣ Testing protected endpoint...")
        try:
            response = session.get(f"{BACKEND_URL}/api/members", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                print("   ✅ Protected endpoint accessible!")
            elif response.status_code == 401:
                print("   ❌ Still getting 401 - session not working!")
            else:
                print(f"   ⚠️  Unexpected status: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   Error: {e}")

def test_health_check():
    """Test health check"""
    print("\n🏥 Testing health check...")
    try:
        response = requests.get(f"{BACKEND_URL}/api/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    print("🧪 Session and Authentication Test")
    print(f"Frontend: {FRONTEND_URL}")
    print(f"Backend: {BACKEND_URL}")
    print("=" * 60)
    
    test_health_check()
    test_login_flow()
    
    print("\n" + "=" * 60)
    print("📝 If you're still getting 401 errors:")
    print("   1. Check the backend logs: copilot svc logs --name sms-api --env dev")
    print("   2. Verify cookies are being set and sent")
    print("   3. Check if CORS is working properly")
    print("   4. Consider using JWT tokens instead of sessions")
