#!/usr/bin/env python3
"""
WSGI entry point for the Student Management System backend.
This file is used by WSGI servers like Gunicorn to serve the Flask application.
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask application
from app import app, create_default_admin

# Initialize the application for production
from reports_backend import ReportsManager

# Initialize MongoDB connection and default data
try:
    from pymongo import MongoClient
    
    # Get MongoDB connection details from environment or use defaults
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    database_name = os.getenv('DB_NAME', 'sms_db')
    
    # Initialize MongoDB client
    client = MongoClient(mongo_uri)
    db = client[database_name]
    user_collection = db.users
    
    # Create default admin and initialize reports
    create_default_admin(user_collection)
    
    # Initialize reports manager
    reports_manager = ReportsManager(db)
    reports_manager.initialize_default_reports()
    
    print("✓ Application initialized successfully")
    
except Exception as e:
    print(f"⚠ Warning: Could not initialize default data: {e}")
    print("The application will still start, but you may need to set up admin user manually")

# The WSGI callable that Gunicorn will use
application = app

if __name__ == "__main__":
    # This is only for development/testing
    # In production, use: gunicorn -c gunicorn_config.py wsgi:application
    application.run(debug=False, host='0.0.0.0', port=5000)
