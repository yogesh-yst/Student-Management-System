// MongoDB initialization script for production
db = db.getSiblingDB('sms_db');

// Create collections
db.createCollection('users');
db.createCollection('member');
db.createCollection('attendance');
db.createCollection('generated_reports');

// Create indexes for better performance
db.member.createIndex({ "student_id": 1 }, { unique: true });
db.attendance.createIndex({ "student_id": 1, "date": 1 });
db.attendance.createIndex({ "date": 1 });
db.users.createIndex({ "username": 1 }, { unique: true });

// Create additional indexes for production optimization
db.attendance.createIndex({ "date": 1, "status": 1 });
db.member.createIndex({ "grade": 1 });
db.generated_reports.createIndex({ "generated_at": -1 });

print('✓ Production database initialized with collections and indexes');
