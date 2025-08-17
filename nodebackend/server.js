// server.js - Complete Node.js Express Backend
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');
const MongoStore = require('connect-mongo');
const moment = require('moment');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const jwt = require('jsonwebtoken');

require('dotenv').config();

// Import route modules
const requireAuth = require('./requireAuth');
const attendanceRoutes = require('./routes/attendance');
const membersRoutes = require('./routes/members');
const reportsRoutes = require('./routes/reports');


const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Configuration
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://yogeshramakrishnan:pnSCE8RtcPqPetdV@cluster0.qar08.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = process.env.DB_NAME || "sms_db";

let db;
let client;

// Custom error classes
class DuplicateAttendanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DuplicateAttendanceError';
    }
}

// Initialize MongoDB connection
async function connectToMongoDB() {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('Connected to MongoDB successfully');
        
        // Create default admin user if doesn't exist
        await createDefaultAdmin();
        await initializeDefaultReports();
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
}

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
    store: MongoStore.create({
        mongoUrl: MONGO_URI,
        dbName: DB_NAME,
        collectionName: 'sessions',
        touchAfter: 24 * 3600
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
    req.DuplicateAttendanceError = DuplicateAttendanceError;
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
        const usersCollection = db.collection('users');
        const adminExists = await usersCollection.findOne({ username: 'admin' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
            await usersCollection.insertOne({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date()
            });
            console.log('Default admin user created');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

async function initializeDefaultReports() {
    try {
        const reportsCollection = db.collection('reports');
        const reportCount = await reportsCollection.countDocuments();
        
        if (reportCount === 0) {
            const defaultReports = [
                {
                    report_id: "attendance_summary",
                    title: "Attendance Summary Report",
                    description: "Summary of student attendance for a specified date range",
                    category: "Attendance",
                    is_active: true,
                    parameters: [
                        {
                            name: "start_date",
                            type: "date",
                            label: "Start Date",
                            required: true
                        },
                        {
                            name: "end_date",
                            type: "date",
                            label: "End Date",
                            required: true
                        },
                        {
                            name: "grade",
                            type: "select",
                            label: "Grade",
                            required: false,
                            options: ["All", "Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8"]
                        }
                    ],
                    output_format: ["PDF", "Excel"],
                    estimated_time: "2-5 minutes",
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    report_id: "student_roster",
                    title: "Student Roster Report",
                    description: "Complete list of students with their details and contact information",
                    category: "Students",
                    is_active: true,
                    parameters: [
                        {
                            name: "status",
                            type: "select",
                            label: "Student Status",
                            required: false,
                            options: ["All", "Active", "Inactive", "Alumni"]
                        },
                        {
                            name: "grade",
                            type: "select",
                            label: "Grade",
                            required: false,
                            options: ["All", "Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8"]
                        },
                        {
                            name: "include_contact",
                            type: "checkbox",
                            label: "Include Parent Contact Information",
                            required: false,
                            default: true
                        }
                    ],
                    output_format: ["PDF", "Excel"],
                    estimated_time: "1-3 minutes",
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    report_id: "daily_attendance",
                    title: "Daily Attendance Report",
                    description: "Daily attendance report for a specific date",
                    category: "Attendance",
                    is_active: true,
                    parameters: [
                        {
                            name: "date",
                            type: "date",
                            label: "Date",
                            required: true,
                            default: "today"
                        }
                    ],
                    output_format: ["PDF", "Excel"],
                    estimated_time: "1 minute",
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            
            await reportsCollection.insertMany(defaultReports);
            console.log('Default reports initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing default reports:', error);
    }
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        await db.admin().ping();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            mongodb: 'connected',
            session: req.session ? 'active' : 'inactive'
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            mongodb: 'disconnected',
            error: error.message
        });
    }
});

// Authentication Endpoints
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username: username.toLowerCase() });

        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            role: user.role
        };

        //  Create JWT token
        const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,   // make sure this is set in Cloud Run!
        { expiresIn: "1d" }
        );

        // // ✅ Store it in a cookie
        // res.cookie("token", token, {
        // httpOnly: true,
        // secure: true,       // Cloud Run is HTTPS
        // sameSite: "None",   // allow cross-site requests
        // maxAge: 24 * 60 * 60 * 1000
        // });

        //res.json({token});
        res.json({ token, user: { username: user.username, role: user.role } });
        //res.json({ message: "Login successful", success: true, token: token, user: { id: user._id, username: user.username, role: user.role } });

        await usersCollection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    lastLogin: new Date(),
                    loginCount: (user.loginCount || 0) + 1
                }
            }
        );

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            error: 'Internal server error during login' 
        });
    }
});

app.post('/api/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ 
                    error: 'Could not log out, please try again' 
                });
            }
            
            res.clearCookie('bala-vihar-session');
            res.json({ message: 'Logout successful' });
        });
    } else {
        res.json({ message: 'No active session found' });
    }
});

app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false
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
app.post('/api/checkin', requireAuth, async (req, res) => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ error: 'Invalid Student ID format' });
        }

        const pipeIndex = studentId.indexOf('|');
        const match = pipeIndex !== -1 ? studentId.substring(0, pipeIndex) : studentId;
        console.log("Extracted Student ID:", match);
        if (!match) {
            return res.status(400).json({ error: 'Invalid Student ID format' });
        }

        const student = await lookupStudent(db, match);
        if (!student) {
            return res.status(404).json({ 
                error: `Student ID ${studentId} not found.` 
            });
        }

        const { timestamp } = await logAttendance(db, match, student.name);
        const formattedTimestamp = moment(timestamp).format('HH:mm:ss');
        
        res.json({
            message: `Hari Om! ${student.name}! Your attendance has been marked at ${formattedTimestamp}.`
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

// Get Today's Attendance
app.get('/api/attendance/today', requireAuth, async (req, res) => {
    try {
        const attendanceRecords = await getTodayAttendance(db);
        res.json(attendanceRecords);
    } catch (error) {
        console.error('Error fetching today\'s attendance:', error);
        res.status(500).json({ 
            error: 'Failed to retrieve attendance: ' + error.message 
        });
    }
});

// Members Endpoints
app.get('/api/members', requireAuth, async (req, res) => {
    try {
        const memberCollection = db.collection('member');
        const members = await memberCollection.find(
            {}, 
            { projection: { _id: 0 } }
        ).toArray();
        
        res.json(members);
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/members', requireAuth, async (req, res) => {
    try {
        const memberCollection = db.collection('member');
        const data = req.body;
        
        // Validate required fields
        const requiredFields = ['student_id', 'name', 'grade', 'status'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return res.status(400).json({ 
                    error: `${field} is required` 
                });
            }
        }
        
        // Check if student_id already exists
        const existingMember = await memberCollection.findOne({ 
            student_id: data.student_id 
        });
        
        if (existingMember) {
            return res.status(409).json({ 
                error: "Student ID already exists" 
            });
        }
        
        // Prepare member data
        const memberData = {
            student_id: data.student_id,
            name: data.name,
            grade: data.grade,
            status: data.status || 'Active',
            parent_name: data.parent_name || '',
            contact: data.contact || '',
            email: data.email || '',
            created_at: new Date(),
            updated_at: new Date()
        };
        
        const result = await memberCollection.insertOne(memberData);
        
        if (result.insertedId) {
            const newMember = await memberCollection.findOne(
                { student_id: data.student_id },
                { projection: { _id: 0 } }
            );
            res.status(201).json(newMember);
        } else {
            res.status(500).json({ error: "Failed to create member" });
        }
        
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/members/:student_id', requireAuth, async (req, res) => {
    try {
        const memberCollection = db.collection('member');
        const { student_id } = req.params;
        const data = req.body;
        
        // Remove student_id from update data if present
        delete data.student_id;
        
        // Add updated timestamp
        data.updated_at = new Date();
        
        const result = await memberCollection.updateOne(
            { student_id: student_id },
            { $set: data }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Member not found" });
        }
        
        const updatedMember = await memberCollection.findOne(
            { student_id: student_id },
            { projection: { _id: 0 } }
        );
        
        res.json(updatedMember);
        
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: error.message });
    }
});

// Use route modules
app.use('/api/attendance', attendanceRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/reports', reportsRoutes);

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
    await connectToMongoDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/login`);
        console.log(`👥 Members endpoint: http://localhost:${PORT}/api/members`);
        console.log(`📋 Attendance endpoint: http://localhost:${PORT}/api/attendance/today`);
        console.log(`📊 Reports endpoint: http://localhost:${PORT}/api/reports`);
    });
}

startServer().catch(console.error);

module.exports = app;