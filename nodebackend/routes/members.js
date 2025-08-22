// // routes/members.js - Members management routes
// const express = require('express');
// const router = express.Router();
// const { body, validationResult } = require('express-validator');
// const jwt = require('jsonwebtoken');
// const requireAuth = require('../middleware/requireAuth');

// routes/attendance.js - Updated for PostgreSQL
const express = require('express');
const router = express.Router();
const { query, body, validationResult } = require('express-validator'); // Add body to imports
const requireAuth = require('../middleware/requireAuth');
const requireSchoolContext = require('../middleware/requireSchoolContext');

// Custom error class
class DuplicateAttendanceError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DuplicateAttendanceError';
    }
}

// Validation middleware for query parameters (GET requests)
const validateMemberQuery = [
    query('name').optional().trim().isLength({ min: 1 }).withMessage('Name is required'),
    query('grade').optional().trim().isLength({ min: 1 }).withMessage('Grade is required'),
    query('email').optional().isEmail().withMessage('Invalid email format'),
];

// Validation middleware for request body (POST requests)
const validateMemberBody = [
    body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
    body('grade').trim().isLength({ min: 1 }).withMessage('Grade is required'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('contact').optional().trim().isLength({ min: 1 }).withMessage('Contact must be valid'),
    body('status').optional().isIn(['Active', 'Inactive', 'Alumni']).withMessage('Status must be Active, Inactive, or Alumni')
    //body('date_of_birth').optional().isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD format)'),
    //body('address').optional().trim().isLength({ min: 1 }).withMessage('Address must be valid when provided'),
    //body('allergies').optional().trim(),
    //body('preferred_class_timing').optional().trim(),
    //body('academic_year').optional().trim().matches(/^\d{4}-\d{4}$/).withMessage('Academic year must be in YYYY-YYYY format (e.g., 2024-2025)'),
];

// Validation middleware for member updates (PUT requests) - all fields optional except when provided
const validateMemberUpdate = [
    body('name').optional().trim().isLength({ min: 1 }).withMessage('Name is required when provided'),
    body('grade').optional().trim().isLength({ min: 1 }).withMessage('Grade is required when provided'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('contact').optional().trim().isLength({ min: 1 }).withMessage('Contact must be valid when provided'),
    //body('parent_name').optional().trim().isLength({ min: 1 }).withMessage('Parent name must be valid when provided'),
    //body('emergency_contact').optional().trim().isLength({ min: 1 }).withMessage('Emergency contact must be valid when provided'),
    body('status').optional().isIn(['Active', 'Inactive', 'Alumni']).withMessage('Status must be Active, Inactive, or Alumni')
    //body('date_of_birth').optional().isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD format)'),
    //body('address').optional().trim().isLength({ min: 1 }).withMessage('Address must be valid when provided'),
    //body('allergies').optional().trim(),
    //body('preferred_class_timing').optional().trim(),
    //body('academic_year').optional().trim().matches(/^\d{4}-\d{4}$/).withMessage('Academic year must be in YYYY-YYYY format (e.g., 2024-2025)'),
];



// Generate a unique member ID
// async function generateMemberId(memberCollection, grade = null, campus = null) {
//     /**
//      * Generate a unique member ID based on member type and sequence
//      * Format: [S|T|P|O]00001 (always 5 digits)
//      * S = Student, T = Teacher, P = Parent, O = Other
//      */
    
//     function getPrefix(grade) {
//         if (!grade) return 'O';
        
//         const gradeStr = String(grade).toLowerCase().trim();
        
//         // Check if grade is numeric (student)
//         if (!isNaN(parseInt(gradeStr)) || /^(pre-?k|k|kindergarten|\d+)$/i.test(gradeStr)) {
//             return 'S'; // Student
//         }
        
//         // Check for teacher designations
//         if (['teacher', 'instructor', 'staff', 'admin'].includes(gradeStr)) {
//             return 'T'; // Teacher
//         }
        
//         // Check for parent designation
//         if (['parent', 'guardian'].includes(gradeStr)) {
//             return 'P'; // Parent
//         }
        
//         // Default to Other
//         return 'O';
//     }

//     // Handle missing or invalid grade gracefully
//     const prefix = getPrefix(grade);
    
//     try {
//         // Find all existing IDs with the same prefix to determine next sequence
//         // Only consider properly formatted IDs with the specific prefix
//         const regexPattern = `^${prefix}\\d{5}`;
//         const express = require('express');
//         const router = express.Router();
//         const { body, validationResult } = require('express-validator');

//         const latestMember = await memberCollection.findOne(
//             { 
//                 student_id: { 
//                     $regex: regexPattern,
//                     $options: 'i'
//                 }
//             },
//             { 
//                 sort: { student_id: -1 },
//                 projection: { student_id: 1 }
//             }
//         );

//         let sequence = 1;
        
//         if (latestMember && latestMember.student_id) {
//             // Extract the numeric part and increment
//             const numericPart = latestMember.student_id.substring(1);
//             const currentSequence = parseInt(numericPart, 10);
            
//             if (!isNaN(currentSequence)) {
//                 sequence = currentSequence + 1;
//             }
//         }

//         // Format: [S|T|P|O]00001 (always 5 digits)
//         const newMemberId = `${prefix}${sequence.toString().padStart(5, '0')}`;
        
//         // Double-check uniqueness (in case of race conditions)
//         const existingMember = await memberCollection.findOne({ 
//             student_id: newMemberId 
//         });
        
//         if (existingMember) {
//             // If somehow this ID exists, try the next sequence number
//             sequence += 1;
//             return `${prefix}${sequence.toString().padStart(5, '0')}`;
//         }
        
//         return newMemberId;
        
//     } catch (error) {
//         console.error('Error generating member ID:', error);
//         // Fallback: use timestamp-based ID
//         const timestamp = Date.now().toString().slice(-5);
//         return `${prefix}${timestamp}`;
//     }
// }
// Utility function to generate student ID
async function generateStudentId(db, grade) {
    const gradePrefix = grade.substring(0, 2).toUpperCase();
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Find the highest number for this grade and year
    const query = `
        SELECT student_id FROM members 
        WHERE student_id LIKE $1
        ORDER BY student_id DESC
        LIMIT 1
    `;
    
    const pattern = `${gradePrefix}${year}%`;
    const result = await db.query(query, [pattern]);
    
    let nextNumber = 1;
    if (result.rows.length > 0) {
        const lastId = result.rows[0].student_id;
        const lastNumber = parseInt(lastId.slice(-3));
        nextNumber = lastNumber + 1;
    }
    
    return `${gradePrefix}${year}${nextNumber.toString().padStart(3, '0')}`;
}

// // Validation middleware for member creation/update
// const validateMemberUpdated = [
//     body('student_id')
//         .optional()
//         .isLength({ min: 1, max: 50 })
//         .withMessage('Student ID must be between 1 and 50 characters'),
//     body('name')
//         .notEmpty()
//         .withMessage('Name is required')
//         .isLength({ min: 1, max: 100 })
//         .withMessage('Name must be between 1 and 100 characters'),
//     body('grade')
//         .notEmpty()
//         .withMessage('Grade is required')
//         .isLength({ min: 1, max: 20 })
//         .withMessage('Grade must be between 1 and 20 characters'),
//     body('status')
//         .optional()
//         .isIn(['Active', 'Inactive', 'Alumni'])
//         .withMessage('Status must be Active, Inactive, or Alumni'),
//     body('member_type')
//         .optional()
//         .isIn(['student', 'teacher', 'volunteer', 'admin', 'parent'])
//         .withMessage('Member type must be student, teacher, volunteer, admin, or parent'),
//     body('family_role')
//         .optional()
//         .isIn(['child', 'parent', 'guardian', 'sibling', 'other'])
//         .withMessage('Family role must be child, parent, guardian, sibling, or other'),
//     body('id_card_sub_text')
//         .optional()
//         .isLength({ max: 100 })
//         .withMessage('ID card sub text must be less than 100 characters'),
//     body('email')
//         .optional({ checkFalsy: true })
//         .isEmail()
//         .withMessage('Please provide a valid email address'),
//     body('contact')
//         .optional()
//         .isLength({ max: 20 })
//         .withMessage('Contact number must be less than 20 characters'),
//     body('parent_name')
//         .optional()
//         .isLength({ max: 100 })
//         .withMessage('Parent name must be less than 100 characters'),
//     body('student_info.allergies')
//         .optional()
//         .isArray()
//         .withMessage('Allergies must be an array'),
//     body('student_info.medical_conditions')
//         .optional()
//         .isArray()
//         .withMessage('Medical conditions must be an array'),
//     body('student_info.dietary_restrictions')
//         .optional()
//         .isArray()
//         .withMessage('Dietary restrictions must be an array')
// ];


// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// Routes

// Get all members with optional filtering and pagination
// Get all members with filtering and pagination
router.get('/', requireSchoolContext, async (req, res) => {
    console.log('=== DEBUG: GET /api/members route called ===');
    console.log('Request query parameters:', req.query);
    console.log('User from session:', req.user? req.user : {});
    console.log('School context:', { 
        schoolId: req.schoolId, 
        schoolName: req.schoolName 
    });

    try {
        const { 
            page = 1, 
            limit = 50, 
            status = 'All', 
            grade = 'All',
            search = ''
            // Remove school_id since it comes from session now
        } = req.query;
        
        console.log('Parsed query parameters:', {
            page, limit, status, grade, search
        });
        console.log('Using school_id from session:', req.schoolId);
        
        const offset = (page - 1) * limit;
        console.log('Calculated offset:', offset);
        
        // Build WHERE clause - always filter by school_id from session
        let whereConditions = [`school_id = $1`]; // Always filter by school
        let queryParams = [req.schoolId]; // Start with school_id from session
        let paramCount = 1;
        
        console.log('Building WHERE clause...');
        console.log('Added school_id filter from session:', req.schoolId);
        
        if (status !== 'All') {
            whereConditions.push(`status = $${++paramCount}`);
            queryParams.push(status);
            console.log('Added status filter:', status);
        }
        
        if (grade !== 'All') {
            whereConditions.push(`grade = $${++paramCount}`);
            queryParams.push(grade);
            console.log('Added grade filter:', grade);
        }
        
        if (search) {
            whereConditions.push(`(m.name ILIKE $${++paramCount} OR student_id ILIKE $${++paramCount})`);
            queryParams.push(`%${search}%`, `%${search}%`);
            paramCount++; // account for second parameter
            console.log('Added search filter:', search);
        }
        
        // Since we always have school_id, we always have a WHERE clause
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        console.log('Final WHERE clause:', whereClause);
        console.log('Query parameters so far:', queryParams);
        
        // Get members with pagination
        const membersQuery = `
            SELECT m.*, s.name as school_name 
            FROM members m
            LEFT JOIN schools s ON m.school_id = s.id
            ${whereClause}
            ORDER BY m.grade, m.name
            LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, offset);
        
        console.log('=== EXECUTING MEMBERS QUERY ===');
        console.log('Members query:', membersQuery);
        console.log('All query parameters:', queryParams);
        
        const membersResult = await req.db.query(membersQuery, queryParams);
        console.log('Members query result - rows found:', membersResult.rows.length);
        console.log('First few members:', membersResult.rows.slice(0, 2));
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM members m
            ${whereClause}
        `;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset
        console.log('=== EXECUTING COUNT QUERY ===');
        console.log('Count query:', countQuery);
        console.log('Count parameters:', countParams);
        
        const countResult = await req.db.query(countQuery, countParams);
        console.log('Total count result:', countResult.rows[0]);
        
        // Get statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive,
                COUNT(CASE WHEN status = 'Alumni' THEN 1 END) as alumni
            FROM members m
            ${whereClause}
        `;
        console.log('=== EXECUTING STATS QUERY ===');
        console.log('Stats query:', statsQuery);
        
        const statsResult = await req.db.query(statsQuery, countParams);
        console.log('Stats query result:', statsResult.rows[0]);
        
        const response = {
            members: membersResult.rows,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(countResult.rows[0].total / limit),
                total_records: parseInt(countResult.rows[0].total),
                records_per_page: parseInt(limit)
            },
            stats: statsResult.rows[0]
        };
        
        console.log('=== FINAL RESPONSE SUMMARY ===');
        console.log('Response stats:', response.stats);
        console.log('Response pagination:', response.pagination);
        console.log('Members returned:', response.members.length);
        console.log('=== END DEBUG ===');
        
        res.json(response);
        
    } catch (error) {
        console.error('=== ERROR in GET /api/members ===');
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=== END ERROR ===');
        res.status(500).json({ error: error.message });
    }
});

// Get member by student ID
router.get('/members/:student_id', requireAuth, async (req, res) => {
    try {
        const { student_id } = req.params;
        
        // Get member details
        const memberQuery = `
            SELECT m.*, s.name as school_name 
            FROM members m
            LEFT JOIN schools s ON m.school_id = s.id
            WHERE m.student_id = $1
        `;
        const memberResult = await req.db.query(memberQuery, [student_id]);
        
        if (memberResult.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        // Get attendance summary
        const attendanceQuery = `
            SELECT 
                COUNT(*) as total_attendance,
                MIN(timestamp) as first_attendance,
                MAX(timestamp) as last_attendance
            FROM attendance 
            WHERE student_id = $1
        `;
        const attendanceResult = await req.db.query(attendanceQuery, [student_id]);
        
        const response = {
            ...memberResult.rows[0],
            attendance_summary: attendanceResult.rows[0]
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ error: error.message });
    }
});


// Create new member
router.post('/', requireSchoolContext, validateMemberBody, async (req, res) => {
    try {
        // Log the request body
        console.log('=== DEBUG: POST /api/members request body ===');
        console.log('Request body:', req.body);
        console.log('=== END DEBUG ===');
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const school_id = req.schoolId; // Get school_id from session context
        console.log('Using school_id from session:', school_id);
        const {
            name, grade, status = 'Active', parent_name, contact, email,
            emergency_contact, allergies, date_of_birth, address,
            preferred_class_timing, academic_year
        } = req.body;
        
        // Check if student with same name and grade exists
        const existingQuery = `
            SELECT student_id FROM members 
            WHERE name = $1 AND grade = $2 AND school_id = $3
        `;
        const existingResult = await req.db.query(existingQuery, [name.trim(), grade.trim(), school_id]);
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({ 
                error: "Student with same name and grade already exists" 
            });
        }
        
        // Generate student ID
        const student_id = await generateStudentId(req.db, grade);
        
        // Insert new member
        const insertQuery = `
            INSERT INTO members (
                student_id, name, grade, status, parent_name, contact, email,
                emergency_contact, allergies, date_of_birth, address,
                preferred_class_timing, academic_year, school_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        const result = await req.db.query(insertQuery, [
            student_id, name.trim(), grade.trim(), status,
            parent_name?.trim(), contact?.trim(), email?.trim(),
            emergency_contact?.trim(), allergies?.trim(), date_of_birth,
            address?.trim(), preferred_class_timing?.trim(), academic_year, school_id
        ]);
        
        res.status(201).json({
            message: 'Member created successfully',
            member: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: error.message });
    }
});
 
// Update member
router.put('/members/:student_id', requireAuth, validateMemberUpdate, async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const { student_id } = req.params;
        const updates = req.body;
        
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        let paramCount = 0;
        
        const allowedFields = [
            'name', 'grade', 'status', 'parent_name', 'contact', 'email',
            'emergency_contact', 'allergies', 'date_of_birth', 'address',
            'preferred_class_timing', 'academic_year', 'school_id'
        ];
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateFields.push(`${field} = $${++paramCount}`);
                values.push(updates[field]);
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(student_id);
        
        const updateQuery = `
            UPDATE members 
            SET ${updateFields.join(', ')}
            WHERE student_id = $${++paramCount}
            RETURNING *
        `;
        
        const result = await req.db.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json({
            message: 'Member updated successfully',
            member: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: error.message });
    }
});


// Delete member (soft delete by changing status)
router.delete('/members/:student_id', requireAuth, async (req, res) => {
    try {
        const { student_id } = req.params;
        
        const updateQuery = `
            UPDATE members 
            SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
            RETURNING student_id, name
        `;
        
        const result = await req.db.query(updateQuery, [student_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        res.json({
            message: 'Member deactivated successfully',
            member: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: error.message });
    }
});

/*
// Bulk import members
router.post('/members/bulk-import', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { members } = req.body;
        
        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ 
                error: 'members must be a non-empty array' 
            });
        }
        
        const results = {
            successful: [],
            failed: [],
            duplicates: []
        };
        
        for (const memberData of members) {
            try {
                // Validate required fields
                if (!memberData.student_id || !memberData.name || !memberData.grade) {
                    results.failed.push({
                        data: memberData,
                        error: 'student_id, name, and grade are required'
                    });
                    continue;
                }
                
                // Check for existing student_id
                const existingMember = await memberCollection.findOne({ 
                    student_id: memberData.student_id 
                });
                
                if (existingMember) {
                    results.duplicates.push({
                        student_id: memberData.student_id,
                        existing_name: existingMember.name
                    });
                    continue;
                }
                
                // Prepare member data
                const preparedData = {
                    student_id: memberData.student_id.trim(),
                    name: memberData.name.trim(),
                    grade: memberData.grade.trim(),
                    status: memberData.status || 'Active',
                    parent_name: memberData.parent_name ? memberData.parent_name.trim() : '',
                    contact: memberData.contact ? memberData.contact.trim() : '',
                    email: memberData.email ? memberData.email.trim().toLowerCase() : '',
                    created_at: new Date(),
                    updated_at: new Date(),
                    created_by: req.session.user.username,
                    imported: true
                };
                
                // Insert member
                await memberCollection.insertOne(preparedData);
                results.successful.push({
                    student_id: preparedData.student_id,
                    name: preparedData.name
                });
                
            } catch (error) {
                results.failed.push({
                    data: memberData,
                    error: error.message
                });
            }
        }
        
        res.json({
            message: 'Bulk import completed',
            summary: {
                total_processed: members.length,
                successful: results.successful.length,
                failed: results.failed.length,
                duplicates: results.duplicates.length
            },
            results: results
        });
        
    } catch (error) {
        console.error('Error in bulk import:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get member grades/classes
router.get('/members/meta/grades', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const grades = await memberCollection.distinct('grade', { status: 'Active' });
        
        // Sort grades naturally (handle both numeric and text grades)
        const sortedGrades = grades.sort((a, b) => {
            // Try to parse as numbers first
            const numA = parseInt(a);
            const numB = parseInt(b);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            
            // Fall back to string comparison
            return a.localeCompare(b);
        });
        
        res.json(sortedGrades);
        
    } catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get member statistics
router.get('/members/stats', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        
        const stats = await memberCollection.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                    },
                    inactive: {
                        $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] }
                    },
                    alumni: {
                        $sum: { $cond: [{ $eq: ['$status', 'Alumni'] }, 1, 0] }
                    }
                }
            }
        ]).toArray();
        
        const gradeStats = await memberCollection.aggregate([
            { $match: { status: 'Active' } },
            {
                $group: {
                    _id: '$grade',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
        
        const recentMembers = await memberCollection
            .find(
                {},
                { projection: { student_id: 1, name: 1, created_at: 1, _id: 0 } }
            )
            .sort({ created_at: -1 })
            .limit(5)
            .toArray();
        
        const response = {
            overview: stats.length > 0 ? stats[0] : {
                total: 0, active: 0, inactive: 0, alumni: 0
            },
            by_grade: gradeStats,
            recent_additions: recentMembers
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching member statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate member ID endpoint
router.post('/members/generate-id', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { grade, count = 1 } = req.body;
        
        // Validate count
        if (count < 1 || count > 50) {
            return res.status(400).json({ 
                error: 'Count must be between 1 and 50' 
            });
        }
        
        const generatedIds = [];
        
        for (let i = 0; i < count; i++) {
            const memberId = await generateMemberId(memberCollection, grade);
            generatedIds.push(memberId);
        }
        
        // If generating multiple IDs, ensure they're unique
        if (count > 1) {
            const uniqueIds = [...new Set(generatedIds)];
            if (uniqueIds.length !== generatedIds.length) {
                // If duplicates found, regenerate
                const finalIds = [];
                for (let i = 0; i < count; i++) {
                    let newId;
                    let attempts = 0;
                    do {
                        newId = await generateMemberId(memberCollection, grade);
                        attempts++;
                    } while (finalIds.includes(newId) && attempts < 10);
                    
                    finalIds.push(newId);
                }
                
                return res.json({
                    generated_ids: finalIds,
                    count: finalIds.length,
                    grade: grade,
                    note: count === 1 ? 
                        'Single member ID generated' : 
                        `${finalIds.length} unique member IDs generated`
                });
            }
        }
        
        res.json({
            generated_ids: generatedIds,
            count: generatedIds.length,
            grade: grade,
            note: count === 1 ? 
                'Single member ID generated' : 
                `${generatedIds.length} unique member IDs generated`
        });
        
    } catch (error) {
        console.error('Error generating member ID:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check member ID availability
router.get('/members/check-id/:student_id', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { student_id } = req.params;
        
        if (!student_id || student_id.trim() === '') {
            return res.status(400).json({ 
                error: 'Student ID is required' 
            });
        }
        
        const existingMember = await memberCollection.findOne({ 
            student_id: student_id.trim() 
        });
        
        const isAvailable = !existingMember;
        
        // If not available, suggest alternatives
        let suggestions = [];
        if (!isAvailable) {
            // Try to extract grade from existing member or suggest generic alternatives
            const grade = existingMember.grade;
            for (let i = 0; i < 3; i++) {
                const suggestion = await generateMemberId(memberCollection, grade);
                if (!suggestions.includes(suggestion)) {
                    suggestions.push(suggestion);
                }
            }
        }
        
        res.json({
            student_id: student_id.trim(),
            available: isAvailable,
            existing_member: isAvailable ? null : {
                name: existingMember.name,
                grade: existingMember.grade,
                status: existingMember.status
            },
            suggestions: suggestions
        });
        
    } catch (error) {
        console.error('Error checking member ID availability:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's family information
router.get('/members/:student_id/family', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const familyCollection = req.db.collection('families');
        const familyMembersCollection = req.db.collection('family_members');
        
        const student = await memberCollection.findOne(
            { student_id: req.params.student_id },
            { projection: { family_id: 1, student_id: 1, name: 1 } }
        );
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        if (!student.family_id) {
            return res.json({ family: null, message: 'Student is not assigned to any family' });
        }
        
        // Get family details
        const family = await familyCollection.findOne(
            { family_id: student.family_id },
            { projection: { _id: 0 } }
        );
        
        // Get all family members
        const familyMembers = await familyMembersCollection.aggregate([
            { $match: { family_id: student.family_id } },
            {
                $lookup: {
                    from: 'member',
                    localField: 'member_id',
                    foreignField: 'student_id',
                    as: 'student_details'
                }
            },
            {
                $lookup: {
                    from: 'parents',
                    localField: 'member_id',
                    foreignField: 'parent_id',
                    as: 'parent_details'
                }
            },
            {
                $addFields: {
                    member_details: {
                        $cond: {
                            if: { $gt: [{ $size: '$student_details' }, 0] },
                            then: { $arrayElemAt: ['$student_details', 0] },
                            else: { $arrayElemAt: ['$parent_details', 0] }
                        }
                    }
                }
            }
        ]).toArray();
        
        const response = {
            student: {
                student_id: student.student_id,
                name: student.name
            },
            family: {
                ...family,
                members: familyMembers
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching student family:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's parents
router.get('/members/:student_id/parents', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const familyMembersCollection = req.db.collection('family_members');
        
        const student = await memberCollection.findOne(
            { student_id: req.params.student_id }
        );
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        if (!student.family_id) {
            return res.json({ parents: [] });
        }
        
        const parents = await familyMembersCollection.aggregate([
            {
                $match: {
                    family_id: student.family_id,
                    relationship_type: { $in: ['parent', 'guardian'] }
                }
            },
            {
                $lookup: {
                    from: 'parents',
                    localField: 'member_id',
                    foreignField: 'parent_id',
                    as: 'parent_details'
                }
            },
            {
                $addFields: {
                    parent: { $arrayElemAt: ['$parent_details', 0] }
                }
            },
            { $project: { parent_details: 0 } }
        ]).toArray();
        
        res.json({ parents });
        
    } catch (error) {
        console.error('Error fetching student parents:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's siblings
router.get('/members/:student_id/siblings', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const familyMembersCollection = req.db.collection('family_members');
        
        const student = await memberCollection.findOne(
            { student_id: req.params.student_id }
        );
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        if (!student.family_id) {
            return res.json({ siblings: [] });
        }
        
        const siblings = await familyMembersCollection.aggregate([
            {
                $match: {
                    family_id: student.family_id,
                    relationship_type: 'child',
                    member_id: { $ne: req.params.student_id } // Exclude the student themselves
                }
            },
            {
                $lookup: {
                    from: 'member',
                    localField: 'member_id',
                    foreignField: 'student_id',
                    as: 'sibling_details'
                }
            },
            {
                $addFields: {
                    sibling: { $arrayElemAt: ['$sibling_details', 0] }
                }
            },
            { $project: { sibling_details: 0 } }
        ]).toArray();
        
        res.json({ siblings });
        
    } catch (error) {
        console.error('Error fetching student siblings:', error);
        res.status(500).json({ error: error.message });
    }
});
*/
module.exports = router;