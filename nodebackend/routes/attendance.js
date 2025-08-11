// routes/attendance.js - Attendance handling routes
const express = require('express');
const router = express.Router();
const moment = require('moment');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' });
    }
    next();
};

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

// Get attendance report for date range
router.get('/reports/attendance', requireAuth, async (req, res) => {
    try {
        let startDate = req.query.start_date;
        let endDate = req.query.end_date;
        
        if (startDate) {
            startDate = moment(startDate, 'YYYY-MM-DD').startOf('day').toDate();
        }
        if (endDate) {
            endDate = moment(endDate, 'YYYY-MM-DD').endOf('day').toDate();
        }
        
        const reportData = await getAttendanceReport(req.db, startDate, endDate);
        res.json(reportData);
    } catch (error) {
        console.error('Error generating attendance report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get attendance summary for specific member
router.get('/reports/member/:student_id', requireAuth, async (req, res) => {
    try {
        const summary = await getMemberAttendanceSummary(req.db, req.params.student_id);
        res.json(summary);
    } catch (error) {
        console.error('Error getting member attendance summary:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get attendance for a specific date range with detailed analytics
router.get('/attendance/range', requireAuth, async (req, res) => {
    try {
        const { start_date, end_date, grade, include_summary } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                error: 'start_date and end_date are required' 
            });
        }
        
        const startDate = moment(start_date, 'YYYY-MM-DD').startOf('day').toDate();
        const endDate = moment(end_date, 'YYYY-MM-DD').endOf('day').toDate();
        
        const attendanceCollection = req.db.collection('attendance');
        const memberCollection = req.db.collection('member');
        
        // Build attendance query
        const attendanceQuery = {
            timestamp: { $gte: startDate, $lte: endDate }
        };
        
        // Get attendance records
        const attendanceRecords = await attendanceCollection
            .find(attendanceQuery)
            .sort({ timestamp: -1 })
            .toArray();
        
        // Get member details if needed
        if (grade && grade !== 'All') {
            const studentIds = attendanceRecords.map(r => r.student_id);
            const filteredMembers = await memberCollection
                .find({ 
                    student_id: { $in: studentIds },
                    grade: grade 
                })
                .toArray();
            
            const validStudentIds = new Set(filteredMembers.map(m => m.student_id));
            const filteredRecords = attendanceRecords.filter(r => 
                validStudentIds.has(r.student_id)
            );
            
            if (include_summary === 'true') {
                const summary = {
                    total_records: filteredRecords.length,
                    unique_students: new Set(filteredRecords.map(r => r.student_id)).size,
                    date_range: `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`,
                    grade_filter: grade
                };
                
                return res.json({
                    data: filteredRecords,
                    summary: summary
                });
            }
            
            return res.json(filteredRecords);
        }
        
        if (include_summary === 'true') {
            const summary = {
                total_records: attendanceRecords.length,
                unique_students: new Set(attendanceRecords.map(r => r.student_id)).size,
                date_range: `${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}`
            };
            
            return res.json({
                data: attendanceRecords,
                summary: summary
            });
        }
        
        res.json(attendanceRecords);
        
    } catch (error) {
        console.error('Error fetching attendance range:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get attendance statistics for dashboard
router.get('/attendance/stats', requireAuth, async (req, res) => {
    try {
        const attendanceCollection = req.db.collection('attendance');
        const memberCollection = req.db.collection('member');
        
        const today = moment().startOf('day').toDate();
        const thisWeek = moment().startOf('week').toDate();
        const thisMonth = moment().startOf('month').toDate();
        
        // Get today's attendance
        const todayAttendance = await attendanceCollection.countDocuments({
            timestamp: { 
                $gte: today, 
                $lt: moment(today).add(1, 'day').toDate() 
            }
        });
        
        // Get this week's unique students
        const thisWeekAttendance = await attendanceCollection.distinct('student_id', {
            timestamp: { $gte: thisWeek }
        });
        
        // Get this month's unique students
        const thisMonthAttendance = await attendanceCollection.distinct('student_id', {
            timestamp: { $gte: thisMonth }
        });
        
        // Get total active students
        const totalActiveStudents = await memberCollection.countDocuments({
            status: 'Active'
        });
        
        // Get attendance trend for last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, 'days').startOf('day').toDate();
            const nextDate = moment(date).add(1, 'day').toDate();
            
            const count = await attendanceCollection.countDocuments({
                timestamp: { $gte: date, $lt: nextDate }
            });
            
            last7Days.push({
                date: moment(date).format('YYYY-MM-DD'),
                count: count
            });
        }
        
        const stats = {
            today: {
                count: todayAttendance,
                percentage: totalActiveStudents > 0 ? 
                    Math.round((todayAttendance / totalActiveStudents) * 100) : 0
            },
            this_week: {
                unique_students: thisWeekAttendance.length,
                percentage: totalActiveStudents > 0 ? 
                    Math.round((thisWeekAttendance.length / totalActiveStudents) * 100) : 0
            },
            this_month: {
                unique_students: thisMonthAttendance.length,
                percentage: totalActiveStudents > 0 ? 
                    Math.round((thisMonthAttendance.length / totalActiveStudents) * 100) : 0
            },
            total_active_students: totalActiveStudents,
            last_7_days_trend: last7Days
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get detailed attendance for a specific student
router.get('/attendance/student/:student_id', requireAuth, async (req, res) => {
    try {
        const { student_id } = req.params;
        const { start_date, end_date, limit = 50 } = req.query;
        
        const attendanceCollection = req.db.collection('attendance');
        const memberCollection = req.db.collection('member');
        
        // Get student details
        const student = await memberCollection.findOne(
            { student_id: student_id },
            { projection: { _id: 0 } }
        );
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // Build query
        const query = { student_id: student_id };
        
        if (start_date && end_date) {
            query.timestamp = {
                $gte: moment(start_date, 'YYYY-MM-DD').startOf('day').toDate(),
                $lte: moment(end_date, 'YYYY-MM-DD').endOf('day').toDate()
            };
        }
        
        // Get attendance records
        const attendanceRecords = await attendanceCollection
            .find(query, { projection: { _id: 0 } })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();
        
        // Get summary statistics
        const totalAttendance = await attendanceCollection.countDocuments({
            student_id: student_id
        });
        
        const firstAttendance = await attendanceCollection.findOne(
            { student_id: student_id },
            { sort: { timestamp: 1 }, projection: { timestamp: 1 } }
        );
        
        const lastAttendance = await attendanceCollection.findOne(
            { student_id: student_id },
            { sort: { timestamp: -1 }, projection: { timestamp: 1 } }
        );
        
        const response = {
            student: student,
            attendance_records: attendanceRecords,
            summary: {
                total_attendance: totalAttendance,
                first_attendance: firstAttendance ? firstAttendance.timestamp : null,
                last_attendance: lastAttendance ? lastAttendance.timestamp : null,
                records_returned: attendanceRecords.length
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: error.message });
    }
});

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

module.exports = router;