// routes/members.js - Members management routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Unauthorized - Please login' });
    }
    next();
};

// Generate a unique member ID
async function generateMemberId(memberCollection, grade = null) {
    /**
     * Generate a unique member ID based on member type and sequence
     * Format: [S|T|P|O]00001 (always 5 digits)
     * S = Student, T = Teacher, P = Parent, O = Other
     */
    
    function getPrefix(grade) {
        if (!grade) return 'O';
        
        const gradeStr = String(grade).toLowerCase().trim();
        
        // Check if grade is numeric (student)
        if (!isNaN(parseInt(gradeStr)) || /^(pre-?k|k|kindergarten|\d+)$/i.test(gradeStr)) {
            return 'S'; // Student
        }
        
        // Check for teacher designations
        if (['teacher', 'instructor', 'staff', 'admin'].includes(gradeStr)) {
            return 'T'; // Teacher
        }
        
        // Check for parent designation
        if (['parent', 'guardian'].includes(gradeStr)) {
            return 'P'; // Parent
        }
        
        // Default to Other
        return 'O';
    }

    // Handle missing or invalid grade gracefully
    const prefix = getPrefix(grade);
    
    try {
        // Find all existing IDs with the same prefix to determine next sequence
        // Only consider properly formatted IDs with the specific prefix
        const regexPattern = `^${prefix}\\d{5}`;
        const express = require('express');
        const router = express.Router();
        const { body, validationResult } = require('express-validator');

        // Authentication middleware
        const requireAuth = (req, res, next) => {
            if (!req.session || !req.session.user) {
                return res.status(401).json({ error: 'Unauthorized - Please login' });
            }
            next();
        };

        const latestMember = await memberCollection.findOne(
            { 
                student_id: { 
                    $regex: regexPattern,
                    $options: 'i'
                }
            },
            { 
                sort: { student_id: -1 },
                projection: { student_id: 1 }
            }
        );

        let sequence = 1;
        
        if (latestMember && latestMember.student_id) {
            // Extract the numeric part and increment
            const numericPart = latestMember.student_id.substring(1);
            const currentSequence = parseInt(numericPart, 10);
            
            if (!isNaN(currentSequence)) {
                sequence = currentSequence + 1;
            }
        }

        // Format: [S|T|P|O]00001 (always 5 digits)
        const newMemberId = `${prefix}${sequence.toString().padStart(5, '0')}`;
        
        // Double-check uniqueness (in case of race conditions)
        const existingMember = await memberCollection.findOne({ 
            student_id: newMemberId 
        });
        
        if (existingMember) {
            // If somehow this ID exists, try the next sequence number
            sequence += 1;
            return `${prefix}${sequence.toString().padStart(5, '0')}`;
        }
        
        return newMemberId;
        
    } catch (error) {
        console.error('Error generating member ID:', error);
        // Fallback: use timestamp-based ID
        const timestamp = Date.now().toString().slice(-5);
        return `${prefix}${timestamp}`;
    }
}

// Validation middleware for member creation/update
const validateMember = [
    body('student_id')
        .optional() // Make student_id optional for auto-generation
        .isLength({ min: 1, max: 50 })
        .withMessage('Student ID must be between 1 and 50 characters'),
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters'),
    body('grade')
        .notEmpty()
        .withMessage('Grade is required')
        .isLength({ min: 1, max: 20 })
        .withMessage('Grade must be between 1 and 20 characters'),
    body('status')
        .optional()
        .isIn(['Active', 'Inactive', 'Alumni'])
        .withMessage('Status must be Active, Inactive, or Alumni'),
    body('email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('contact')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Contact number must be less than 20 characters'),
    body('parent_name')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Parent name must be less than 100 characters'),
    body('auto_generate_id')
        .optional()
        .isBoolean()
        .withMessage('auto_generate_id must be a boolean value')
];

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
router.get('/members', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { 
            status, 
            grade, 
            search, 
            page = 1, 
            limit = 100,
            sort_by = 'name',
            sort_order = 'asc'
        } = req.query;
        
        // Build query
        const query = {};
        
        if (status && status !== 'All') {
            query.status = status;
        }
        
        if (grade && grade !== 'All') {
            query.grade = grade;
        }
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { student_id: { $regex: search, $options: 'i' } },
                { parent_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Build sort
        const sortOrder = sort_order === 'desc' ? -1 : 1;
        const sortObj = { [sort_by]: sortOrder };
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get total count for pagination
        const totalCount = await memberCollection.countDocuments(query);
        
        // Get members
        const members = await memberCollection
            .find(query, { projection: { _id: 0 } })
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit))
            .toArray();
        
        // Get statistics
        const stats = await memberCollection.aggregate([
            { $match: query },
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
        
        const response = {
            members: members,
            pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                total_count: totalCount,
                limit: parseInt(limit),
                has_next: skip + parseInt(limit) < totalCount,
                has_prev: parseInt(page) > 1
            },
            statistics: stats.length > 0 ? stats[0] : {
                total: 0, active: 0, inactive: 0, alumni: 0
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get member by student ID
router.get('/members/:student_id', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const member = await memberCollection.findOne(
            { student_id: req.params.student_id },
            { projection: { _id: 0 } }
        );
        
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        // Get attendance summary for this member
        const attendanceCollection = req.db.collection('attendance');
        const attendanceStats = await attendanceCollection.aggregate([
            { $match: { student_id: req.params.student_id } },
            {
                $group: {
                    _id: null,
                    total_attendance: { $sum: 1 },
                    first_attendance: { $min: '$timestamp' },
                    last_attendance: { $max: '$timestamp' }
                }
            }
        ]).toArray();
        
        const response = {
            ...member,
            attendance_summary: attendanceStats.length > 0 ? attendanceStats[0] : {
                total_attendance: 0,
                first_attendance: null,
                last_attendance: null
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new member
router.post('/members', requireAuth, validateMember, handleValidationErrors, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const data = req.body;
        
        // Check if student_id already exists
        const existingMember = await memberCollection.findOne({
            $or: [
            { email: data.email },
            { name: data.name }
            ]
        });
        
        if (existingMember) {
            return res.status(409).json({ 
                error: "Student ID already exists" 
            });
        }
        
        // Prepare member data with defaults
        // Auto-generate student_id if not provided
        const memberData = {
            student_id: await generateMemberId(memberCollection, data.grade),
            name: data.name.trim(),
            grade: data.grade.trim(),
            status: data.status || 'Active',
            parent_name: data.parent_name ? data.parent_name.trim() : '',
            contact: data.contact ? data.contact.trim() : '',
            email: data.email ? data.email.trim().toLowerCase() : '',
            created_at: new Date(),
            updated_at: new Date(),
            created_by: req.session.user.username
        };
        
        // Validate email uniqueness if provided
        if (memberData.email) {
            const existingEmail = await memberCollection.findOne({ 
                email: memberData.email 
            });
            
            if (existingEmail) {
                return res.status(409).json({ 
                    error: "Email address already exists" 
                });
            }
        }
        
        const result = await memberCollection.insertOne(memberData);
        
        if (result.insertedId) {
            const newMember = await memberCollection.findOne(
                { student_id: data.student_id },
                { projection: { _id: 0 } }
            );
            
            res.status(201).json({
                message: 'Member created successfully',
                member: newMember
            });
        } else {
            res.status(500).json({ error: "Failed to create member" });
        }
        
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: error.message });
    }
});
 
// Update member
router.put('/members/:student_id', requireAuth, validateMember, handleValidationErrors, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { student_id } = req.params;
        const data = req.body;
        
        // Check if member exists
        const existingMember = await memberCollection.findOne({ 
            student_id: student_id 
        });
        
        if (!existingMember) {
            return res.status(404).json({ error: "Member not found" });
        }
        
        // Remove student_id from update data (not allowed to change)
        delete data.student_id;
        
        // Prepare update data
        const updateData = {
            ...data,
            updated_at: new Date(),
            updated_by: req.session.user.username
        };
        
        // Clean up string fields
        if (updateData.name) updateData.name = updateData.name.trim();
        if (updateData.grade) updateData.grade = updateData.grade.trim();
        if (updateData.parent_name) updateData.parent_name = updateData.parent_name.trim();
        if (updateData.contact) updateData.contact = updateData.contact.trim();
        if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
        
        // Validate email uniqueness if changed
        if (updateData.email && updateData.email !== existingMember.email) {
            const existingEmail = await memberCollection.findOne({ 
                email: updateData.email,
                student_id: { $ne: student_id }
            });
            
            if (existingEmail) {
                return res.status(409).json({ 
                    error: "Email address already exists" 
                });
            }
        }
        
        const result = await memberCollection.updateOne(
            { student_id: student_id },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Member not found" });
        }
        
        const updatedMember = await memberCollection.findOne(
            { student_id: student_id },
            { projection: { _id: 0 } }
        );
        
        res.json({
            message: 'Member updated successfully',
            member: updatedMember
        });
        
    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete member (soft delete by changing status)
router.delete('/members/:student_id', requireAuth, async (req, res) => {
    try {
        const memberCollection = req.db.collection('member');
        const { student_id } = req.params;
        const { permanent = false } = req.query;
        
        if (permanent === 'true') {
            // Hard delete (admin only)
            if (req.session.user.role !== 'admin') {
                return res.status(403).json({ 
                    error: 'Only administrators can permanently delete members' 
                });
            }
            
            const result = await memberCollection.deleteOne({ student_id: student_id });
            
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: "Member not found" });
            }
            
            res.json({ 
                message: 'Member permanently deleted',
                student_id: student_id
            });
        } else {
            // Soft delete - change status to Inactive
            const result = await memberCollection.updateOne(
                { student_id: student_id },
                { 
                    $set: { 
                        status: 'Inactive',
                        updated_at: new Date(),
                        updated_by: req.session.user.username
                    }
                }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: "Member not found" });
            }
            
            const updatedMember = await memberCollection.findOne(
                { student_id: student_id },
                { projection: { _id: 0 } }
            );
            
            res.json({
                message: 'Member deactivated successfully',
                member: updatedMember
            });
        }
        
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({ error: error.message });
    }
});

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

module.exports = router;