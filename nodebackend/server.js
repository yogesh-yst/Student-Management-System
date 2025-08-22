// server.js - Complete Node.js Express Backend
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
// const { MongoClient, ObjectId } = require('mongodb');
// const MongoStore = require('connect-mongo');
const pgSession = require('connect-pg-simple')(session);
const moment = require('moment');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');


require('dotenv').config();

// Import route modules
const authRoutes = require('./routes/auth');
const requireAuth = require('./middleware/requireAuth');
const attendanceRoutes = require('./routes/attendance');
const membersRoutes = require('./routes/members');
const reportsRoutes = require('./routes/reports');
const familiesRoutes = require('./routes/families');
const adminRoutes = require('./routes/admin');

const db = require('./scripts/db');


const app = express();
exports.app = app;
const PORT = process.env.PORT || 5000;

// // MongoDB Configuration
// const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// const DB_NAME = process.env.DB_NAME || "sms_db";

//let db;
let client;

// Custom error classes
class DuplicateAttendanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DuplicateAttendanceError';
    }
}

// Initialize PostgreSQL connection
async function connectToPostgreSQL() {
    try {
        // Test the connection
        await db.query('SELECT NOW()');
        console.log('Connected to PostgreSQL successfully');
        
        // Create default admin user if doesn't exist
        await createDefaultAdmin();
        await initializeDefaultReports();
    } catch (error) {
        console.error('PostgreSQL connection failed:', error);
        process.exit(1);
    }
}

// // Initialize MongoDB connection
// async function connectToMongoDB() {
//     try {
//         client = new MongoClient(MONGO_URI);
//         await client.connect();
//         db = client.db(DB_NAME);
//         console.log('Connected to MongoDB successfully');
        
//         // Create default admin user if doesn't exist
//         await createDefaultAdmin();
//         await initializeDefaultReports();
//     } catch (error) {
//         console.error('MongoDB connection failed:', error);
//         process.exit(1);
//     }
// }

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS Configuration
app.use(cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
}));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'pnSCE8RtcPqPetdV',
    resave: false,
    saveUninitialized: false,
    store: new pgSession({
        pool: db.pool, // Connection pool
        tableName: 'sessions' // Use another table-name than the default "session" one
    }),
    cookie: {
        secure: 'true',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'none',
    },
    name: process.env.SESSION_NAME || 'bala-vihar-session'
}));

// Make db available to routes
app.use((req, res, next) => {
    req.db = db;
//    req.DuplicateAttendanceError = DuplicateAttendanceError;
    next();
});

// Authentication Middleware
// const requireAuth = (req, res, next) => {
//     if (!req.session || !req.session.user) {
//         return res.status(401).json({ error: 'Unauthorized - Please login' });
//     }
//     next();
// };

// Utility Functions
async function createDefaultAdmin() {
    try {
        const adminQuery = 'SELECT id FROM users WHERE username = $1';
        const adminResult = await db.query(adminQuery, ['admin']);
        
        if (adminResult.rows.length === 0) {
            // Create default school if it doesn't exist
            const schoolQuery = 'SELECT id FROM schools WHERE name = $1';
            const schoolResult = await db.query(schoolQuery, ['Default School']);
            
            let schoolId;
            if (schoolResult.rows.length === 0) {
                const createSchoolQuery = `
                    INSERT INTO schools (name, address, city, state, country, created_at)
                    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                    RETURNING id
                `;
                const newSchoolResult = await db.query(createSchoolQuery, [
                    'Default School',
                    '123 Main Street',
                    'Default City',
                    'Default State',
                    'USA'
                ]);
                schoolId = newSchoolResult.rows[0].id;
                console.log('Default school created with ID:', schoolId);
            } else {
                schoolId = schoolResult.rows[0].id;
            }
            
            const hashedPassword = await bcrypt.hash('admin123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
            const insertQuery = `
                INSERT INTO users (username, password_hash, role, email, school_id, created_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            `;
            await db.query(insertQuery, ['admin', hashedPassword, 'admin', 'admin@cmc.com', schoolId]);
            console.log('Default admin user created with school_id:', schoolId);
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

async function initializeDefaultReports() {
    try {
        // Check if reports table exists and has data
        const reportQuery = 'SELECT COUNT(*) as count FROM reports';
        const reportResult = await db.query(reportQuery);
        const reportCount = parseInt(reportResult.rows[0].count);
        
        if (reportCount === 0) {
            // For now, just log that we would create default reports
            // This can be expanded later with proper PostgreSQL report creation
            console.log('No default reports found - reports table is empty');
            console.log('Note: Default report creation can be implemented later if needed');
        } else {
            console.log(`Found ${reportCount} existing reports`);
        }
    } catch (error) {
        console.error('Error initializing default reports:', error);
        // Don't fail startup if reports table doesn't exist or has issues
        console.log('Continuing startup without report initialization');
    }
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        await req.db.query('SELECT 1');
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            postgres: 'connected',
            session: req.session ? 'active' : 'inactive'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            postgres: 'disconnected',
            error: error.message
        });
    }
});

// Student lookup utility function
async function lookupStudent(db, studentId) {
    const memberCollection = db.collection('member');
    const student = await memberCollection.findOne(
        { student_id: studentId }, 
        { projection: { name: 1, _id: 0 } }
    );
    return student;
}

// Attendance logging function
async function logAttendance(db, studentId, name) {
    const attendanceCollection = db.collection('attendance');
    const timestamp = new Date();
    
    // Check for duplicate attendance today
    const todayStart = moment(timestamp).startOf('day').toDate();
    const todayEnd = moment(timestamp).endOf('day').toDate();
    
    const existingAttendance = await attendanceCollection.findOne({
        student_id: studentId,
        timestamp: { $gte: todayStart, $lte: todayEnd }
    });
    
    if (existingAttendance) {
        throw new DuplicateAttendanceError(
            `Duplicate attendance entry for student ID ${studentId} on ${moment(todayStart).format('YYYY-MM-DD')}.`
        );
    }
    
    const attendanceData = {
        student_id: studentId,
        name: name,
        timestamp: timestamp
    };
    
    const result = await attendanceCollection.insertOne(attendanceData);
    return { timestamp, insertedId: result.insertedId };
}

// Get today's attendance
async function getTodayAttendance(db) {
    const attendanceCollection = db.collection('attendance');
    const today = new Date();
    const todayStart = moment(today).startOf('day').toDate();
    const todayEnd = moment(today).endOf('day').toDate();
    
    const pipeline = [
        {
            $match: {
                timestamp: { $gte: todayStart, $lte: todayEnd }
            }
        },
        {
            $project: {
                _id: 0,
                student_id: 1,
                name: 1,
                timestamp: {
                    $dateToString: {
                        format: '%m/%d %H:%M:%S',
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

// Check-in Endpoint
// app.post('/api/checkin', requireAuth, async (req, res) => {
//     try {
//         const { studentId } = req.body;

//         if (!studentId) {
//             return res.status(400).json({ error: 'Invalid Student ID format' });
//         }

//         const pipeIndex = studentId.indexOf('|');
//         const match = pipeIndex !== -1 ? studentId.substring(0, pipeIndex) : studentId;
//         console.log("Extracted Student ID:", match);
//         if (!match) {
//             return res.status(400).json({ error: 'Invalid Student ID format' });
//         }

//         const student = await lookupStudent(db, match);
//         if (!student) {
//             return res.status(404).json({ 
//                 error: `Student ID ${studentId} not found.` 
//             });
//         }

//         const { timestamp } = await logAttendance(db, match, student.name);
//         const formattedTimestamp = moment(timestamp).format('HH:mm:ss');
        
//         res.json({
//             message: `Hari Om! ${student.name}! Your attendance has been marked at ${formattedTimestamp}.`
//         });

//     } catch (error) {
//         if (error instanceof DuplicateAttendanceError) {
//             return res.status(409).json({ error: error.message });
//         }
        
//         console.error('Check-in error:', error);
//         res.status(500).json({ 
//             error: 'Failed to log attendance: ' + error.message 
//         });
//     }
// });

// // Get Today's Attendance
// app.get('/api/attendance/today', requireAuth, async (req, res) => {
//     try {
//         const attendanceRecords = await getTodayAttendance(db);
//         res.json(attendanceRecords);
//     } catch (error) {
//         console.error('Error fetching today\'s attendance:', error);
//         res.status(500).json({ 
//             error: 'Failed to retrieve attendance: ' + error.message 
//         });
//     }
// });


// // Members Endpoints
// app.get('/api/members', requireAuth, async (req, res) => {
//     try {
//         const memberCollection = db.collection('member');
//         const members = await memberCollection.find(
//             {}, 
//             { projection: { _id: 0 } }
//         ).toArray();
        
//         res.json(members);
//     } catch (error) {
//         console.error('Error fetching members:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// app.post('/api/members', requireAuth, async (req, res) => {
//     try {
//         const memberCollection = db.collection('member');
//         const data = req.body;
        
//         // Validate required fields
//         const requiredFields = ['student_id', 'name', 'grade', 'status'];
//         for (const field of requiredFields) {
//             if (!data[field]) {
//                 return res.status(400).json({ 
//                     error: `${field} is required` 
//                 });
//             }
//         }
        
//         // Check if student_id already exists
//         const existingMember = await memberCollection.findOne({ 
//             student_id: data.student_id 
//         });
        
//         if (existingMember) {
//             return res.status(409).json({ 
//                 error: "Student ID already exists" 
//             });
//         }
        
//         // Prepare member data
//         const memberData = {
//             student_id: data.student_id,
//             name: data.name,
//             grade: data.grade,
//             status: data.status || 'Active',
//             parent_name: data.parent_name || '',
//             contact: data.contact || '',
//             email: data.email || '',
//             created_at: new Date(),
//             updated_at: new Date()
//         };
        
//         const result = await memberCollection.insertOne(memberData);
        
//         if (result.insertedId) {
//             const newMember = await memberCollection.findOne(
//                 { student_id: data.student_id },
//                 { projection: { _id: 0 } }
//             );
//             res.status(201).json(newMember);
//         } else {
//             res.status(500).json({ error: "Failed to create member" });
//         }
        
//     } catch (error) {
//         console.error('Error adding member:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// app.put('/api/members/:student_id', requireAuth, async (req, res) => {
//     try {
//         const memberCollection = db.collection('member');
//         const { student_id } = req.params;
//         const data = req.body;
        
//         // Remove student_id from update data if present
//         delete data.student_id;
        
//         // Add updated timestamp
//         data.updated_at = new Date();
        
//         const result = await memberCollection.updateOne(
//             { student_id: student_id },
//             { $set: data }
//         );
        
//         if (result.matchedCount === 0) {
//             return res.status(404).json({ error: "Member not found" });
//         }
        
//         const updatedMember = await memberCollection.findOne(
//             { student_id: student_id },
//             { projection: { _id: 0 } }
//         );
        
//         res.json(updatedMember);
        
//     } catch (error) {
//         console.error('Error updating member:', error);
//         res.status(500).json({ error: error.message });
//     }
// });

// Use route modules
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

// Start server
async function startServer() {
    await connectToPostgreSQL();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
        console.log(`👥 Members endpoint: http://localhost:${PORT}/api/members`);
        console.log(`📋 Attendance endpoint: http://localhost:${PORT}/api/attendance/today`);
        console.log(`📊 Reports endpoint: http://localhost:${PORT}/api/reports`);
    });
}

startServer().catch(console.error);

module.exports = app;