// MongoDB initialization script for development
db = db.getSiblingDB('sms_db_dev');

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

print('✓ Development database initialized with collections and indexes');
