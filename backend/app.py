import io
import os
import secrets
import uuid
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import pandas as pd
from flask import send_file
import tempfile
from reports_backend import ReportsManager
from datetime import datetime, date
from reports_generator import  ReportGenerator, create_excel_report, create_pdf_report
from dotenv import load_dotenv
from datetime import datetime

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from flask_cors import CORS
import pandas as pd
from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_session import Session

import re
from werkzeug.security import generate_password_hash
# Removed problematic import - create_default_admin is defined in this file

app = Flask(__name__)

# Session Configuration
#app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'qT6XEOyjuVxTVV7r-am9f_dRhhjTNDdKcNVjrHLllSw')  # Change this to a secure random key
#app.config['SECRET_KEY'] = 'qT6XEOyjuVxTVV7r-am9f_dRhhjTNDdKcNVjrHLllSw'
# Change this to a secure random key
app_secret = secrets.token_urlsafe(32)
print(f"Generated secret key: {app_secret}")

app.config.update(
    SESSION_TYPE='null',
    SECRET_KEY = app_secret,
    SESSION_COOKIE_SECURE=True,  # Only send cookies over HTTPS
    SESSION_COOKIE_HTTPONLY=True,  # Prevent JavaScript access to cookies
    SESSION_COOKIE_SAMESITE='Lax',  # Restrict cross-site cookie sharing
    SESSION_PERMANENT=False,
    SESSION_USE_SIGNER=True
)

# Initialize session (but with null type, it uses Flask's built-in signed cookies)
Session(app)

# Load environment variables
load_dotenv()

CORS(
    app,
    origins=[os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5713')],
    supports_credentials=True,
    methods=["GET", "POST", "OPTIONS", "PATCH", "PUT", "DELETE"],
    allow_headers=[
        "Content-Type", 
        "Authorization", 
        "X-CSRFToken",
        "Accept",
        "Origin",
        "X-Requested-With"
    ],
    expose_headers=["Content-Type"],
    max_age=86400,  # Cache preflight requests for 24 hours
    vary_header=False
)

# MongoDB Configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
DB_NAME = os.getenv('DB_NAME', 'sms_db')  # Default to 'sms_db' if not set

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Collections 
attendance_collection = db["attendance"]
member_collection = db["member"]
user_collection = db["users"]  
generated_reports_collection = db["generated_reports"]
reports_manager = ReportsManager(db)

# Initialize report generator
report_generator = ReportGenerator({
    'attendance': attendance_collection,
    'member': member_collection,
    'generated_reports': generated_reports_collection
})

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running."""
    try:
        # Test database connection
        db.command('ismaster')
        return jsonify({
            "status": "healthy",
            "message": "Student Management System API is running",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "message": "Database connection failed",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 503

# Test endpoint for CORS verification
@app.route('/api/test', methods=['GET', 'POST', 'OPTIONS'])
def test_endpoint():
    """Test endpoint to verify CORS and request handling."""
    if request.method == 'GET':
        return jsonify({
            "message": "GET request successful",
            "origin": request.headers.get('Origin'),
            "method": request.method
        })
    elif request.method == 'POST':
        return jsonify({
            "message": "POST request successful", 
            "origin": request.headers.get('Origin'),
            "method": request.method,
            "content_type": request.headers.get('Content-Type'),
            "has_json": request.is_json,
            "data": request.get_json() if request.is_json else "No JSON data"
        })
    
    return jsonify({"message": "OPTIONS handled by before_request"})

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Global CORS and request handler
@app.before_request
def handle_cors():
    # Handle preflight requests for all endpoints
    if request.method == 'OPTIONS':
        response = app.make_default_options_response()
        headers = response.headers
        origin = request.headers.get('Origin')
        if origin:
            allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5713').split(',')
            if origin.strip() in [o.strip() for o in allowed_origins] or '*' in allowed_origins:
                headers['Access-Control-Allow-Origin'] = origin
                headers['Access-Control-Allow-Credentials'] = 'true'
        headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
        headers['Access-Control-Max-Age'] = '86400'
        return response

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        allowed_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5713').split(',')
        if origin.strip() in [o.strip() for o in allowed_origins] or '*' in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
            response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Add new API endpoints for reports
@app.route('/api/reports/attendance', methods=['GET'])
@login_required
def attendance_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
            
        report_data = get_attendance_report(db, start_date, end_date)
        return jsonify(report_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/member/<student_id>', methods=['GET'])
@login_required
def member_attendance_summary(student_id):
    try:
        summary = get_member_attendance_summary(db, student_id)
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

class DuplicateAttendanceError(Exception):
    """Custom exception for duplicate attendance entries."""
    pass

def log_attendance(student_id, name):
    """Log attendance for a student."""
    timestamp = datetime.now()

    # Use pandas to get today's start and end datetime
    today_range = pd.date_range(timestamp.date(), periods=2, freq='D')
    today_start = today_range[0].to_pydatetime()
    today_end = today_range[1].to_pydatetime()
    # If student ID is longer than 6 chars, look for pattern {a99999}
    if len(student_id) > 6:
        pattern = r'[a-zA-Z]\d{5}'   # Matches 'a' followed by 5 digits
        match = re.search(pattern, student_id)
        if match:
            student_id = match.group()

    query = {
        "student_id": student_id,
        "timestamp": {"$gte": today_start, "$lt": today_end}
    }
    if attendance_collection.count_documents(query) > 0:
        raise DuplicateAttendanceError(f"Duplicate attendance entry for student ID {student_id} on {today_start.date()}.")

    attendance_data = {
        "student_id": student_id,
        "name": name,
        "timestamp": timestamp
    }
    attendance_id = attendance_collection.insert_one(attendance_data).inserted_id
    return timestamp

def get_today_attendance():
    """Retrieve today's attendance records."""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

    # Use the aggregation pipeline to format the date in the desired format
    pipeline = [
        {
            '$match': {
                'timestamp': {'$gte': today_start, '$lte': today_end}
            }
        },
        {
            '$project': {
                '_id': 0,
                'student_id': 1,
                'name': 1,
                'timestamp': {
                    '$dateToString': {
                        'format': '%m/%d %H:%M:%S',
                        'date': '$timestamp'
                    }
                }
            }
        },
        {
            '$sort': {'timestamp': -1}
        }
    ]
    rows = list(attendance_collection.aggregate(pipeline))
    return rows

def lookup_student(student_id):
    """Check if the student exists in the member table."""
    student = member_collection.find_one({"student_id": student_id}, {"name": 1, "_id": 0})
    return student

def create_default_admin(user_collection):
    admin_user = user_collection.find_one({"username": "admin"})
    if not admin_user:
        user_collection.insert_one({
            "username": "admin",
            "password": generate_password_hash("admin123"),
            "role": "admin"
        })


# Login API
@app.route('/api/login', methods=['POST'])
def login():
    try:
        # Log request details for debugging
        print(f"Request method: {request.method}")
        print(f"Request Content-Type: {request.headers.get('Content-Type')}")
        print(f"Request origin: {request.headers.get('Origin')}")
        print(f"Request data: {request.get_data()}")
        
        # Check if request has the right content type
        if not request.is_json:
            print("Request is not JSON")
            return jsonify({
                "error": "Content-Type must be application/json",
                "received_content_type": request.headers.get('Content-Type')
            }), 415
        
        data = request.get_json()
        if not data:
            print("No JSON data found in request")
            return jsonify({"error": "No JSON data provided"}), 400
            
        username = data.get('username')
        password = data.get('password')
        
        print(f"Login attempt for username: {username}")
        
        if not username or not password:
            print("Missing username or password in login request.")
            return jsonify({"error": "Username and password are required"}), 400
        
        user = user_collection.find_one({"username": username})
        print(f"User found: {user is not None}")

        if user and check_password_hash(user['password'], password):
            print(f"Password hash check passed for user: {username}")

            # Set user session
            session['user'] = username
            print(f"Login successful for user: {username}")
            print(f"Session after login: {dict(session)}")
            
            response = jsonify({"message": "Login successful", "user": username})
            return response
        else:
            print(f"Login failed for username: {username}")
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed due to server error", "details": str(e)}), 500

# Logout API
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"message": "Logout successful"})

# Session check API
@app.route('/api/session', methods=['GET'])
def check_session():
    """Check if user is logged in and return session info"""
    try:
        print(f"Session check - Current session: {dict(session)}")
        print(f"Session keys: {list(session.keys())}")
        
        if 'user' in session:
            print(f"Session valid for user: {session['user']}")
            return jsonify({
                "authenticated": True,
                "user": session['user'],
                "session_id": session.get('_id', 'unknown')
            })
        else:
            print("No active session found.")
            return jsonify({
                "authenticated": False,
                "message": "No active session"
            }), 401
    except Exception as e:
        print(f"Session check error: {str(e)}")
        return jsonify({"error": "Session check failed"}), 500

@app.route('/api/checkin', methods=['POST'])
@login_required
def check_in():
    data = request.get_json()
    student_id = data.get('studentId')
    if not student_id:
        return jsonify({'error': 'Student ID is required'}), 400

    # If student ID is longer than 6 chars, look for pattern {a99999}
    if len(student_id) > 6:
        pattern = r'[a-zA-Z]\d{5}'  # Matches any letter followed by 5 digits
        match = re.search(pattern, student_id)
        if match:
            student_id = match.group()

    student = lookup_student(student_id)
    if not student:
        return jsonify({'error': f'Student ID {student_id} not found.'}), 404

    try:
        timestamp = log_attendance(student_id, student['name'])
        formatted_timestamp = timestamp.strftime("%H:%M:%S")  # Format the timestamp
        return jsonify({'message': f'Hari Om! {student["name"]}! Your attendance has been marked at {formatted_timestamp}.'}), 200
    except DuplicateAttendanceError as e:
        return jsonify({'error': str(e)}), 409
    except Exception as e:
        return jsonify({'error': 'Failed to log attendance: ' + str(e)}), 500

@app.route('/api/attendance/today', methods=['GET'])
@login_required
def get_today_attendance_api():
    try:
        attendance_records = get_today_attendance()
        return jsonify(attendance_records), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve attendance: ' + str(e)}), 500

@app.route('/api/members', methods=['GET'])
@login_required
def get_members():
    try:
        members = list(member_collection.find({}, {'_id': 0}))
        return jsonify(members)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Generate a unique member ID
def generate_member_id(grade=None):
    """Generate a unique member ID based on member type and sequence"""
    def get_prefix(grade):
        if isinstance(grade, (int, str)) and str(grade).isdigit():
            return 'S'  # Student
        elif str(grade).lower() == 'teacher':
            return 'T'  # Teacher
        elif str(grade).lower() == 'parent':
            return 'P'  # Parent
        else:
            return 'O'  # Other

    # Handle missing or invalid grade gracefully
    if not grade:
        prefix = 'O'
    else:
        prefix = get_prefix(grade)
    
    # Find all existing IDs to determine next sequence
    # Ensure all student_ids are zero-padded to 5 digits for correct sorting
    latest_member = member_collection.find_one(
        {"student_id": {"$regex": "^[STPO]\\d{5}$"}},  # Only consider properly formatted IDs
        sort=[("student_id", -1)]
    )

    if latest_member:
        # Extract the numeric part and increment
        sequence = int(latest_member["student_id"][1:]) + 1
    else:
        sequence = 1

    # Format: [S|T|P|O]00001 (always 5 digits)
    return f"{prefix}{sequence:05d}"



@app.route('/api/members', methods=['POST'])
@login_required
def add_member():
    try:

        member_data = request.get_json()
        # Validate required fields
        required_fields = ['name', 'grade', 'status']
        for field in required_fields:
            if not member_data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Check if student_id already exists
        # Check if a member with the same name or email already exists
        existing_member = member_collection.find_one({
            "$or": [
            {"name": member_data.get('name')},
            {"email": member_data.get('email')}
            ]
        })
        if existing_member:
            return jsonify({"error": "Member with name or email already exists"}), 409
        
        # Generate new member ID
        member_data['student_id'] = generate_member_id(member_data.get('grade'))
        
        # Add timestamps
        member_data['created_at'] = datetime.utcnow()
        member_data['updated_at'] = datetime.utcnow()
        
        # Insert new member
        member_collection.insert_one(member_data)
        
        # Return the complete member data including the generated ID
        member_data['_id'] = str(member_data['_id'])
        return jsonify(member_data), 201
        
    except Exception as e:
        print(f"Error occurred while adding member: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/members/<student_id>', methods=['PUT'])
@login_required
def update_member(student_id):
    try:
        data = request.get_json()
        
        # Remove any attempts to modify the student_id
        if 'student_id' in data:
            del data['student_id']
        
        # Add updated timestamp
        data['updated_at'] = datetime.now()
            
        # Update the member
        result = member_collection.update_one(
            {"student_id": student_id},
            {"$set": data}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Member not found"}), 404
            
        # Fetch and return the updated member
        updated_member = member_collection.find_one(
            {"student_id": student_id},
            {"_id": 0}
        )
        
        return jsonify(updated_member)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports', methods=['GET'])
@login_required
def get_reports():
    try:
        category = request.args.get('category')
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        reports = reports_manager.get_reports(category, active_only)
        return jsonify(reports), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<report_id>', methods=['GET'])
@login_required
def get_report_details(report_id):
    """Get detailed information about a specific report"""
    try:
        #report = reports_collection.find_one(
        report = reports_manager.reports_collection.find_one(
            {"report_id": report_id}, 
            {"_id": 0}
        )
        
        if not report:
            return jsonify({"error": "Report not found"}), 404
            
        return jsonify(report), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/reports/<report_id>/generate', methods=['POST'])
@login_required
def generate_report(report_id):
    """Generate a report with given parameters"""
    try:
        # Get report details
        report = reports_manager.reports_collection.find_one({"report_id": report_id})
        if not report:
            return jsonify({"error": "Report not found"}), 404
            
        if not report.get('is_active', False):
            return jsonify({"error": "Report is not active"}), 400
            
        # Get parameters from request
        data = request.get_json()
        parameters = data.get('parameters', {})
        output_format = data.get('output_format', 'PDF')
        
        # Validate required parameters
        for param in report.get('parameters', []):
            if param.get('required', False) and not parameters.get(param['name']):
                return jsonify({
                    "error": f"Required parameter '{param['label']}' is missing"
                }), 400
        # Log parameters for debugging
        print(f"Report ID: {report_id}")
        print(f"Parameters received: {parameters}")
        print(f"Output format: {output_format}")
        # Generate report data based on report type
        report_data = None
        if report_id == 'attendance_summary':
            report_data = report_generator.generate_attendance_summary(parameters)
        elif report_id == 'student_roster':
            report_data = report_generator.generate_student_roster(parameters)
        elif report_id == 'daily_attendance':
            report_data = report_generator.generate_daily_attendance(parameters)
        elif report_id == 'member_id_cards':  # NEW ID CARD REPORT
            report_data = report_generator.generate_member_id_cards(parameters)
        else:
            return jsonify({"error": "Report generation not implemented for this report type"}), 400
        
        # Generate file
        file_buffer = None
        file_extension = None
        content_type = None
        print(f"report_data received: {report_data}")
        if output_format == 'PDF':
            # Use specialized ID card PDF generator for ID card reports
            if report_id == 'member_id_cards':
                file_buffer = report_generator.create_id_card_pdf(report_data)
            else:
                file_buffer = create_pdf_report(report_data)
            file_extension = 'pdf'
            content_type = 'application/pdf'
        elif output_format == 'Excel':
            if report_id == 'member_id_cards':
                return jsonify({"error": "Excel format not supported for ID card reports"}), 400
            file_buffer = create_excel_report(report_data)
            file_extension = 'xlsx'
            content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        else:
            return jsonify({"error": "Unsupported output format"}), 400
        
        # Save file information to database
        file_id = str(uuid.uuid4())
        filename = f"{report_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        
        # Save file to temporary directory (in production, use cloud storage)
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_buffer.getvalue())
        
        # Store metadata in database
        report_metadata = {
            "file_id": file_id,
            "report_id": report_id,
            "filename": filename,
            "file_path": file_path,
            "parameters": parameters,
            "output_format": output_format,
            "generated_at": datetime.now(),
            "generated_by": session.get('user', 'unknown'),
            "expires_at": datetime.now() + timedelta(days=7),  # Files expire after 7 days
            "file_size": os.path.getsize(file_path),
            "download_count": 0
        }
        
        generated_reports_collection.insert_one(report_metadata)
        
        response = {
            "status": "success",
            "message": f"Report '{report['title']}' generated successfully",
            "file_id": file_id,
            "filename": filename,
            "download_url": f"/api/reports/download/{file_id}",
            "generated_at": datetime.now().isoformat(),
            "expires_at": report_metadata['expires_at'].isoformat(),
            "file_size": report_metadata['file_size']
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/download/<file_id>', methods=['GET'])
@login_required
def download_report(file_id):
    """Download a generated report file"""
    try:
        # Find the file metadata
        file_metadata = generated_reports_collection.find_one({"file_id": file_id})
        
        if not file_metadata:
            return jsonify({"error": "File not found"}), 404
        
        # Check if file has expired
        if datetime.now() > file_metadata['expires_at']:
            return jsonify({"error": "File has expired"}), 410
        
        # Check if file exists
        if not os.path.exists(file_metadata['file_path']):
            return jsonify({"error": "File no longer available"}), 404
        
        # Update download count
        generated_reports_collection.update_one(
            {"file_id": file_id},
            {"$inc": {"download_count": 1}}
        )
        
        # Determine content type
        content_type = 'application/pdf' if file_metadata['filename'].endswith('.pdf') else \
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        
        return send_file(
            file_metadata['file_path'],
            mimetype=content_type,
            as_attachment=True,
            download_name=file_metadata['filename']
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports/generated', methods=['GET'])
@login_required
def get_generated_reports():
    """Get list of generated reports for the current user"""
    try:
        user = session.get('user', 'unknown')
        
        # Get reports generated by current user that haven't expired
        generated_reports = list(generated_reports_collection.find(
            {
                "generated_by": user,
                "expires_at": {"$gte": datetime.now()}
            },
            {"_id": 0}
        ).sort("generated_at", -1))
        
        return jsonify(generated_reports), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__ == '__main__':
    # This is only for development mode
    # For production, use: gunicorn -c gunicorn_config.py wsgi:application
    create_default_admin(user_collection)
    reports_manager.initialize_default_reports()  
    
    # Development server - will show the warning you mentioned
    print("⚠️  Running in DEVELOPMENT mode!")
    print("🔧 For production, use: gunicorn -c gunicorn_config.py wsgi:application")
    app.run(debug=True, host='0.0.0.0', port=5000)