from flask import Flask, request, jsonify
from datetime import datetime, date
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
#from bson import ObjectId
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)

# Allow CORS for requests from the frontend
CORS(app, origins=["http://localhost:5173"])


# MongoDB Configuration
MONGO_URI = "mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"  # Replace with your MongoDB connection string
DB_NAME = "sms_db"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
attendance_collection = db["attendance"]
member_collection = db["member"]

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

@app.route('/api/checkin', methods=['POST'])
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
def get_today_attendance_api():
    try:
        attendance_records = get_today_attendance()
        return jsonify(attendance_records), 200
    except Exception as e:
        return jsonify({'error': 'Failed to retrieve attendance: ' + str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)