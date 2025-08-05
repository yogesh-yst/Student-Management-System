from bson import ObjectId
from datetime import datetime, timedelta
from pymongo import MongoClient

class ReportsManager:
    def __init__(self, db):
        self.db = db
        self.reports_collection = db.reports

    def initialize_default_reports(self):
        """Initialize default reports if the reports collection is empty."""
        if self.reports_collection.count_documents({}) == 0:
            default_reports = [
                {
                    "report_id": "attendance_summary",
                    "title": "Attendance Summary Report",
                    "description": "Summary of student attendance for a specified date range",
                    "category": "Attendance",
                    "is_active": True,
                    "parameters": [
                        {
                            "name": "start_date",
                            "type": "date",
                            "label": "Start Date",
                            "required": True
                        },
                        {
                            "name": "end_date",
                            "type": "date",
                            "label": "End Date",
                            "required": True
                        },
                        {
                            "name": "grade",
                            "type": "select",
                            "label": "Grade",
                            "required": False,
                            "options": ["All", "Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8"]
                        }
                    ],
                    "output_format": ["PDF", "Excel"],
                    "estimated_time": "2-5 minutes",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                },
                {
                    "report_id": "student_roster",
                    "title": "Student Roster Report",
                    "description": "Complete list of students with their details and contact information",
                    "category": "Students",
                    "is_active": True,
                    "parameters": [
                        {
                            "name": "status",
                            "type": "select",
                            "label": "Student Status",
                            "required": False,
                            "options": ["All", "Active", "Inactive", "Alumni"]
                        },
                        {
                            "name": "grade",
                            "type": "select",
                            "label": "Grade",
                            "required": False,
                            "options": ["All", "Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8"]
                        },
                        {
                            "name": "include_contact",
                            "type": "checkbox",
                            "label": "Include Parent Contact Information",
                            "required": False,
                            "default": True
                        }
                    ],
                    "output_format": ["PDF", "Excel"],
                    "estimated_time": "1-3 minutes",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                },
                {
                    "report_id": "daily_attendance",
                    "title": "Daily Attendance Report",
                    "description": "Daily attendance report for a specific date",
                    "category": "Attendance",
                    "is_active": True,
                    "parameters": [
                        {
                            "name": "date",
                            "type": "date",
                            "label": "Date",
                            "required": True,
                            "default": "today"
                        }
                    ],
                    "output_format": ["PDF", "Excel"],
                    "estimated_time": "1 minute",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                },
                {
                    "report_id": "enrollment_statistics",
                    "title": "Enrollment Statistics",
                    "description": "Statistical overview of student enrollment and demographics",
                    "category": "Analytics",
                    "is_active": True,
                    "parameters": [
                        {
                            "name": "academic_year",
                            "type": "select",
                            "label": "Academic Year",
                            "required": True,
                            "options": ["2024-2025", "2023-2024", "2022-2023"]
                        }
                    ],
                    "output_format": ["PDF", "Excel"],
                    "estimated_time": "2-4 minutes",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                },
                {
                    "report_id": "volunteer_contribution",
                    "title": "Volunteer Contribution Report",
                    "description": "Report on volunteer/teacher contributions and participation",
                    "category": "Volunteers",
                    "is_active": False,  # Example of disabled report
                    "parameters": [
                        {
                            "name": "start_date",
                            "type": "date",
                            "label": "Start Date",
                            "required": True
                        },
                        {
                            "name": "end_date",
                            "type": "date",
                            "label": "End Date",
                            "required": True
                        }
                    ],
                    "output_format": ["PDF"],
                    "estimated_time": "3-6 minutes",
                    "created_at": datetime.now(),
                    "updated_at": datetime.now()
                }
            ]
            
            self.reports_collection.insert_many(default_reports)
            print("Default reports initialized successfully")

    def get_attendance_report(self, start_date=None, end_date=None):
        """Get attendance report for a date range"""
        if not start_date:
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if not end_date:
            end_date = start_date + timedelta(days=1)

        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': start_date, '$lt': end_date}
                }
            },
            {
                '$project': {
                    '_id': 0,
                    'student_id': 1,
                    'name': 1,
                    'timestamp': {
                        '$dateToString': {
                            'format': '%Y-%m-%d %H:%M:%S',
                            'date': '$timestamp'
                        }
                    }
                }
            },
            {
                '$sort': {'timestamp': -1}
            }
        ]
        return list(self.db.attendance.aggregate(pipeline))

    def get_member_attendance_summary(self, student_id):
        """Get attendance summary for a specific member"""
        pipeline = [
            {
                '$match': {
                    'student_id': student_id
                }
            },
            {
                '$group': {
                    '_id': '$student_id',
                    'total_attendance': {'$sum': 1},
                    'first_attendance': {'$min': '$timestamp'},
                    'last_attendance': {'$max': '$timestamp'}
                }
            }
        ]
        return list(self.db.attendance.aggregate(pipeline))

    def get_reports(self, category=None, active_only=True):
        """Get all available reports with optional filtering"""
        query = {}
        if active_only:
            query['is_active'] = True
        if category:
            query['category'] = category
        
        return list(self.reports_collection.find(query, {'_id': 0}).sort('category', 1).sort('title', 1))

    # ...other report-related methods...

