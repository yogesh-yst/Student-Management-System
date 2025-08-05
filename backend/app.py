# from datetime import datetime, date
# from pymongo import MongoClient
# from pymongo.errors import DuplicateKeyError
# #from bson import ObjectId
# from flask_cors import CORS
# import pandas as pd
# from flask import Flask, request, jsonify, session
# from werkzeug.security import generate_password_hash, check_password_hash
# from functools import wraps
from reports_backend import ReportsManager
from datetime import datetime, date
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from flask_cors import CORS
import pandas as pd
from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask_session import Session

app = Flask(__name__)

# Session Configuration
app.config['SECRET_KEY'] = 'pnSCE8RtcPqPetdV'  # Change this to a secure random key
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

# Allow CORS for requests from the frontend
CORS(app, 
     origins=["http://localhost:5173"],
     supports_credentials=True,
     methods=["GET", "POST", "OPTIONS","PATCH", "PUT", "DELETE "],  
     expose_headers=["Content-Type", "X-CSRFToken"],
     allow_headers=["Content-Type", "X-CSRFToken"])



# MongoDB Configuration
MONGO_URI = "mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"  # Replace with your MongoDB connection string
DB_NAME = "sms_db"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
attendance_collection = db["attendance"]
member_collection = db["member"]
user_collection = db["users"]  
reports_manager = ReportsManager(db)

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

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

# Create an admin user if not exists
def create_default_admin():
    admin_user = user_collection.find_one({"username": "admin"})
    if not admin_user:
        user_collection.insert_one({
            "username": "admin",
            "password": generate_password_hash("admin123"),
            "role": "admin"
        })

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Login API
@app.route('/api/login', methods=['POST'] )
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = user_collection.find_one({"username": username})
    
    if user and check_password_hash(user['password'], password):
        session['user'] = username
        return jsonify({"message": "Login successful"})
    
    return jsonify({"error": "Invalid credentials"}), 401

# Logout API
@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"message": "Logout successful"})

@app.route('/api/checkin', methods=['POST'])
@login_required
def check_in():
    data = request.get_json()
    student_id = data.get('studentId')
    if not student_id:
        return jsonify({'error': 'Student ID is required'}), 400

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

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint to verify API and MongoDB connection status.
    Returns:
        JSON response with status and MongoDB connection state
    """
    try:
        # Test MongoDB connection
        client.admin.command('ping')
        mongodb_status = "connected"
    except ConnectionError:
        mongodb_status = "disconnected"
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'mongodb': mongodb_status
        }), 503

    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'mongodb': mongodb_status
    }), 200


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
    

@app.route('/api/members', methods=['POST'])
@login_required
def add_member():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'name', 'grade', 'status']
        for field in required_fields:
            if not data.get(field):
                return jsonify({"error": f"{field} is required"}), 400
        
        # Check if student_id already exists
        existing_member = member_collection.find_one({"student_id": data['student_id']})
        if existing_member:
            return jsonify({"error": "Student ID already exists"}), 409
        
        # Prepare member data with default values
        member_data = {
            "student_id": data['student_id'],
            "name": data['name'],
            "grade": data['grade'],
            "status": data.get('status', 'Active'),
            "parent_name": data.get('parent_name', ''),
            "contact": data.get('contact', ''),
            "email": data.get('email', ''),
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Insert the new member
        result = member_collection.insert_one(member_data)
        
        if result.inserted_id:
            # Fetch and return the created member (excluding MongoDB _id)
            new_member = member_collection.find_one(
                {"student_id": data['student_id']},
                {"_id": 0}
            )
            return jsonify(new_member), 201
        else:
            return jsonify({"error": "Failed to create member"}), 500
            
    except Exception as e:
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
    
if __name__ == '__main__':
    create_default_admin()
    reports_manager.initialize_default_reports()  
    app.run(debug=True)