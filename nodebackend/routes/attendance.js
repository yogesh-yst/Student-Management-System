// routes/attendance.js - Attendance handling routes
const express = require('express');
const router = express.Router();
const moment = require('moment');
const requireAuth = require('../middleware/requireAuth');

// Custom error class
class DuplicateAttendanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DuplicateAttendanceError';
    }
}

// Utility functions
async function getAttendanceReport(db, startDate = null, endDate = null) {
    const attendanceCollection = db.collection('attendance');
    
    if (!startDate) {
        startDate = moment().startOf('day').toDate();
    }
    if (!endDate) {
        endDate = moment(startDate).add(1, 'day').toDate();
    }

    const pipeline = [
        {
            $match: {
                timestamp: { $gte: startDate, $lt: endDate }
            }
        },
        {
            $project: {
                _id: 0,
                student_id: 1,
                name: 1,
                timestamp: {
                    $dateToString: {
                        format: '%Y-%m-%d %H:%M:%S',
                        date: '$timestamp'
                    }
                }
            }
        },
        {
            $sort: { timestamp: -1 }
        }
    ];
    
    return await attendanceCollection.aggregate(pipeline).toArray();
}

async function getMemberAttendanceSummary(db, studentId) {
    const attendanceCollection = db.collection('attendance');
    
    const pipeline = [
        {
            $match: {
                student_id: studentId
            }
        },
        {
            $group: {
                _id: '$student_id',
                total_attendance: { $sum: 1 },
                first_attendance: { $min: '$timestamp' },
                last_attendance: { $max: '$timestamp' }
            }
        }
    ];
    
    return await attendanceCollection.aggregate(pipeline).toArray();
}

// Routes
// Check-in attendance
router.post('/checkin', requireAuth, async (req, res) => {
    try {
        const { student_id } = req.body;
        
        if (!student_id) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        
        // Extract student ID (handle QR code format with pipe separator)
        const pipeIndex = student_id.indexOf('|');
        const cleanStudentId = pipeIndex !== -1 ? 
            student_id.substring(0, pipeIndex) : student_id;
        
        // Check if student exists
        const studentQuery = `
            SELECT student_id, name, status FROM members 
            WHERE student_id = $1
        `;
        const studentResult = await req.db.query(studentQuery, [cleanStudentId]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ 
                error: `Student ID ${cleanStudentId} not found.` 
            });
        }
        
        const student = studentResult.rows[0];
        
        if (student.status !== 'Active') {
            return res.status(400).json({ 
                error: `Student ${student.name} is not active.` 
            });
        }
        
        // Check if already checked in today
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();
        
        const existingQuery = `
            SELECT id FROM attendance 
            WHERE student_id = $1 AND timestamp >= $2 AND timestamp < $3
        `;
        const existingResult = await req.db.query(existingQuery, [cleanStudentId, today, tomorrow]);
        
        if (existingResult.rows.length > 0) {
            throw new DuplicateAttendanceError(
                `${student.name} has already been marked present today.`
            );
        }
        
        // Insert attendance record
        const insertQuery = `
            INSERT INTO attendance (student_id, timestamp, check_in_method, marked_by)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
            RETURNING timestamp
        `;
        
        const attendanceResult = await req.db.query(insertQuery, [
            cleanStudentId, 
            'qr', 
            req.session.user?.id
        ]);
        
        const timestamp = attendanceResult.rows[0].timestamp;
        const formattedTime = moment(timestamp).format('HH:mm:ss');
        
        res.json({
            message: `Hari Om! ${student.name}! Your attendance has been marked at ${formattedTime}.`
        });
        
    } catch (error) {
        if (error instanceof DuplicateAttendanceError) {
            return res.status(409).json({ error: error.message });
        }
        
        console.error('Check-in error:', error);
        res.status(500).json({ 
            error: 'Failed to log attendance: ' + error.message 
        });
    }
});

// Get today's attendance
router.get('/today', requireAuth, async (req, res) => {
    try {
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();
        
        const query = `
            SELECT 
                a.student_id,
                m.name,
                m.grade,
                a.timestamp,
                a.check_in_method
            FROM attendance a
            JOIN members m ON a.student_id = m.student_id
            WHERE a.timestamp >= $1 AND a.timestamp < $2
            ORDER BY a.timestamp DESC
        `;
        
        const result = await req.db.query(query, [today, tomorrow]);
        
        // Format the response
        const attendanceRecords = result.rows.map(record => ({
            student_id: record.student_id,
            name: record.name,
            grade: record.grade,
            timestamp: record.timestamp,
            time: moment(record.timestamp).format('HH:mm:ss'),
            check_in_method: record.check_in_method
        }));
        
        res.json(attendanceRecords);
        
    } catch (error) {
        console.error('Error fetching today\'s attendance:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve attendance: ' + error.message 
        });
    }
});

// Get attendance statistics
router.get('/attendance/stats', requireAuth, async (req, res) => {
    try {
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();
        const thisWeek = moment().startOf('week').toDate();
        const thisMonth = moment().startOf('month').toDate();
        
        // Today's attendance count
        const todayQuery = `
            SELECT COUNT(*) as count
            FROM attendance 
            WHERE timestamp >= $1 AND timestamp < $2
        `;
        const todayResult = await req.db.query(todayQuery, [today, tomorrow]);
        
        // This week's unique students
        const weekQuery = `
            SELECT COUNT(DISTINCT student_id) as count
            FROM attendance 
            WHERE timestamp >= $1
        `;
        const weekResult = await req.db.query(weekQuery, [thisWeek]);
        
        // This month's unique students
        const monthResult = await req.db.query(weekQuery, [thisMonth]);
        
        // Total active students
        const activeQuery = `
            SELECT COUNT(*) as count
            FROM members 
            WHERE status = 'Active'
        `;
        const activeResult = await req.db.query(activeQuery);
        
        // Last 7 days trend
        const trendQuery = `
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as count
            FROM attendance 
            WHERE timestamp >= $1
            GROUP BY DATE(timestamp)
            ORDER BY date
        `;
        const sevenDaysAgo = moment().subtract(6, 'days').startOf('day').toDate();
        const trendResult = await req.db.query(trendQuery, [sevenDaysAgo]);
        
        // Fill in missing dates with 0 count
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').format('YYYY-MM-DD');
            const found = trendResult.rows.find(row => 
                moment(row.date).format('YYYY-MM-DD') === date
            );
            last7Days.push({
                date: date,
                count: found ? parseInt(found.count) : 0
            });
        }
        
        const totalActive = parseInt(activeResult.rows[0].count);
        const todayCount = parseInt(todayResult.rows[0].count);
        const weekCount = parseInt(weekResult.rows[0].count);
        const monthCount = parseInt(monthResult.rows[0].count);
        
        const stats = {
            today: {
                count: todayCount,
                percentage: totalActive > 0 ? Math.round((todayCount / totalActive) * 100) : 0
            },
            this_week: {
                unique_students: weekCount,
                percentage: totalActive > 0 ? Math.round((weekCount / totalActive) * 100) : 0
            },
            this_month: {
                unique_students: monthCount,
                percentage: totalActive > 0 ? Math.round((monthCount / totalActive) * 100) : 0
            },
            total_active_students: totalActive,
            last_7_days_trend: last7Days
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get attendance for specific student
router.get('/attendance/student/:student_id', requireAuth, async (req, res) => {
    try {
        const { student_id } = req.params;
        const { start_date, end_date, limit = 50 } = req.query;
        
        // Get student details
        const studentQuery = `
            SELECT * FROM members WHERE student_id = $1
        `;
        const studentResult = await req.db.query(studentQuery, [student_id]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Build attendance query
        let attendanceQuery = `
            SELECT timestamp, check_in_method, notes
            FROM attendance 
            WHERE student_id = $1
        `;
        const queryParams = [student_id];
        
        if (start_date && end_date) {
            attendanceQuery += ` AND timestamp >= $2 AND timestamp <= $3`;
            queryParams.push(
                moment(start_date, 'YYYY-MM-DD').startOf('day').toDate(),
                moment(end_date, 'YYYY-MM-DD').endOf('day').toDate()
            );
        }
        
        attendanceQuery += ` ORDER BY timestamp DESC LIMIT ${queryParams.length + 1}`;
        queryParams.push(parseInt(limit));
        
        const attendanceResult = await req.db.query(attendanceQuery, queryParams);
        
        // Get summary statistics
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_attendance,
                MIN(timestamp) as first_attendance,
                MAX(timestamp) as last_attendance
            FROM attendance 
            WHERE student_id = $1
        `;
        const summaryResult = await req.db.query(summaryQuery, [student_id]);
        
        const response = {
            student: studentResult.rows[0],
            attendance_records: attendanceResult.rows.map(record => ({
                timestamp: record.timestamp,
                time: moment(record.timestamp).format('HH:mm:ss'),
                date: moment(record.timestamp).format('YYYY-MM-DD'),
                check_in_method: record.check_in_method,
                notes: record.notes
            })),
            summary: {
                total_attendance: parseInt(summaryResult.rows[0].total_attendance),
                first_attendance: summaryResult.rows[0].first_attendance,
                last_attendance: summaryResult.rows[0].last_attendance
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get attendance by date range
router.get('/attendance/range', requireAuth, async (req, res) => {
    try {
        const { start_date, end_date, grade, school_id } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'start_date and end_date are required' 
            });
        }
        
        let query = `
            SELECT 
                a.student_id,
                m.name,
                m.grade,
                a.timestamp,
                a.check_in_method
            FROM attendance a
            JOIN members m ON a.student_id = m.student_id
            WHERE a.timestamp >= $1 AND a.timestamp <= $2
        `;
        
        const queryParams = [
            moment(start_date, 'YYYY-MM-DD').startOf('day').toDate(),
            moment(end_date, 'YYYY-MM-DD').endOf('day').toDate()
        ];
        
        if (grade && grade !== 'All') {
            query += ` AND m.grade = ${queryParams.length + 1}`;
            queryParams.push(grade);
        }
        
        if (school_id) {
            query += ` AND m.school_id = ${queryParams.length + 1}`;
            queryParams.push(school_id);
        }
        
        query += ` ORDER BY a.timestamp DESC`;
        
        const result = await req.db.query(query, queryParams);
        
        const attendanceData = result.rows.map(record => ({
            student_id: record.student_id,
            name: record.name,
            grade: record.grade,
            timestamp: record.timestamp,
            date: moment(record.timestamp).format('YYYY-MM-DD'),
            time: moment(record.timestamp).format('HH:mm:ss'),
            check_in_method: record.check_in_method
        }));
        
        res.json({
            attendance_records: attendanceData,
            summary: {
                total_records: attendanceData.length,
                unique_students: new Set(attendanceData.map(r => r.student_id)).size,
                date_range: `${start_date} to ${end_date}`
            }
        });
        
    } catch (error) {
        console.error('Error fetching attendance range:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
/*
// Bulk check-in endpoint (for importing data or batch operations)
router.post('/attendance/bulk-checkin', requireAuth, async (req, res) => {
    try {
        const { attendanceData } = req.body;
        
        if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
            return res.status(400).json({ 
                error: 'attendanceData must be a non-empty array' 
            });
        }
        
        const attendanceCollection = req.db.collection('attendance');
        const memberCollection = req.db.collection('member');
        
        const results = {
            successful: [],
            failed: [],
            duplicates: []
        };
        
        for (const entry of attendanceData) {
            try {
                const { student_id, timestamp } = entry;
                
                if (!student_id || !timestamp) {
                    results.failed.push({
                        entry: entry,
                        error: 'student_id and timestamp are required'
                    });
                    continue;
                }
                
                // Verify student exists
                const student = await memberCollection.findOne(
                    { student_id: student_id },
                    { projection: { name: 1 } }
                );
                
                if (!student) {
                    results.failed.push({
                        entry: entry,
                        error: `Student ID ${student_id} not found`
                    });
                    continue;
                }
                
                const attendanceTimestamp = new Date(timestamp);
                const dayStart = moment(attendanceTimestamp).startOf('day').toDate();
                const dayEnd = moment(attendanceTimestamp).endOf('day').toDate();
                
                // Check for duplicate
                const existingAttendance = await attendanceCollection.findOne({
                    student_id: student_id,
                    timestamp: { $gte: dayStart, $lte: dayEnd }
                });
                
                if (existingAttendance) {
                    results.duplicates.push({
                        entry: entry,
                        existing_timestamp: existingAttendance.timestamp
                    });
                    continue;
                }
                
                // Insert attendance record
                const attendanceRecord = {
                    student_id: student_id,
                    name: student.name,
                    timestamp: attendanceTimestamp
                };
                
                await attendanceCollection.insertOne(attendanceRecord);
                results.successful.push({
                    student_id: student_id,
                    name: student.name,
                    timestamp: attendanceTimestamp
                });
                
            } catch (error) {
                results.failed.push({
                    entry: entry,
                    error: error.message
                });
            }
        }
        
        res.json({
            message: 'Bulk check-in completed',
            summary: {
                total_processed: attendanceData.length,
                successful: results.successful.length,
                failed: results.failed.length,
                duplicates: results.duplicates.length
            },
            results: results
        });
        
    } catch (error) {
        console.error('Error in bulk check-in:', error);
        res.status(500).json({ error: error.message });
    }
});
*/

module.exports = router;