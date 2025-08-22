// ============================================================================
// NEW FILE: nodebackend/routes/families.js
// Family Management Routes for PostgreSQL
// ============================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const requireSchoolContext = require('../middleware/requireSchoolContext');

// Validation middleware for family
const validateFamily = [
    body('family_name')
        .notEmpty()
        .withMessage('Family name is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Family name must be between 1 and 100 characters'),
    body('primary_contact_phone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters'),
    body('primary_contact_email')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('status')
        .optional()
        .isIn(['Active', 'Inactive'])
        .withMessage('Status must be Active or Inactive')
];

// Validation middleware for parent
const validateParent = [
    body('first_name')
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters'),
    body('last_name')
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 1, max: 50 })
        .withMessage('Last name must be between 1 and 50 characters'),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address'),
    body('phone')
        .optional()
        .isLength({ max: 20 })
        .withMessage('Phone number must be less than 20 characters')
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

// ============================================================================
// FAMILY ROUTES
// ============================================================================

// Get all families with optional filtering
router.get('/', requireSchoolContext, async (req, res) => {
    try {
        const { 
            status, 
            search, 
            page = 1, 
            limit = 100,
            sort_by = 'family_name',
            sort_order = 'asc'
        } = req.query;
        
        let query = `
            SELECT 
                f.*,
                COUNT(fm.id) as member_count,
                COUNT(CASE WHEN fm.member_type = 'student' THEN 1 END) as children_count,
                COUNT(CASE WHEN fm.member_type IN ('parent', 'guardian') THEN 1 END) as parents_count
            FROM families f
            LEFT JOIN family_members fm ON f.family_id = fm.family_id
        `;
        
        const queryParams = [];
        const conditions = [];
        
        // Add search condition
        if (search) {
            conditions.push(`(
                f.family_name ILIKE $${queryParams.length + 1} OR 
                f.family_id ILIKE $${queryParams.length + 1} OR 
                f.primary_contact_email ILIKE $${queryParams.length + 1}
            )`);
            queryParams.push(`%${search}%`);
        }
        
        // Add status filter
        if (status && status !== 'All') {
            conditions.push(`f.status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }
        
        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Add GROUP BY and ORDER BY
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        query += ` 
            GROUP BY f.id, f.family_id, f.family_name, f.primary_contact_phone, 
                     f.primary_contact_email, f.status, f.created_at, f.updated_at
            ORDER BY f.${sort_by} ${sortDirection}
        `;
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await req.db.query(query, queryParams);
        
        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(DISTINCT f.id) as total 
            FROM families f
        `;
        const countParams = [];
        
        if (search || (status && status !== 'All')) {
            const countConditions = [];
            
            if (search) {
                countConditions.push(`(
                    f.family_name ILIKE $${countParams.length + 1} OR 
                    f.family_id ILIKE $${countParams.length + 1} OR 
                    f.primary_contact_email ILIKE $${countParams.length + 1}
                )`);
                countParams.push(`%${search}%`);
            }
            
            if (status && status !== 'All') {
                countConditions.push(`f.status = $${countParams.length + 1}`);
                countParams.push(status);
            }
            
            if (countConditions.length > 0) {
                countQuery += ` WHERE ${countConditions.join(' AND ')}`;
            }
        }
        
        const countResult = await req.db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            families: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching families:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get family by ID with all members
router.get('/:family_id', requireSchoolContext, async (req, res) => {
    try {
        const { family_id } = req.params;
        
        // Get family details
        const familyQuery = `
            SELECT f.*, s.name as school_name
            FROM families f
            LEFT JOIN schools s ON f.school_id = s.id
            WHERE f.family_id = $1
        `;
        const familyResult = await req.db.query(familyQuery, [family_id]);
        
        if (familyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Family not found' });
        }
        
        // Get all family members with their details
        const membersQuery = `
            SELECT 
                fm.*,
                CASE 
                    WHEN fm.member_type = 'student' THEN 
                        json_build_object(
                            'student_id', m.student_id,
                            'name', m.name,
                            'grade', m.grade,
                            'status', m.status,
                            'email', m.email,
                            'contact', m.contact,
                            'photo_url', m.photo_url,
                            'id_card_sub_text', m.id_card_sub_text
                        )
                    ELSE 
                        json_build_object(
                            'parent_id', p.parent_id,
                            'first_name', p.first_name,
                            'last_name', p.last_name,
                            'full_name', p.full_name,
                            'email', p.email,
                            'phone', p.phone,
                            'occupation', p.occupation,
                            'employer', p.employer
                        )
                END as member_details
            FROM family_members fm
            LEFT JOIN members m ON fm.member_id = m.student_id AND fm.member_type = 'student'
            LEFT JOIN parents p ON fm.member_id = p.parent_id AND fm.member_type IN ('parent', 'guardian')
            WHERE fm.family_id = $1
            ORDER BY 
                CASE fm.member_type 
                    WHEN 'parent' THEN 1 
                    WHEN 'guardian' THEN 2 
                    WHEN 'student' THEN 3 
                    ELSE 4 
                END,
                fm.created_at
        `;
        const membersResult = await req.db.query(membersQuery, [family_id]);
        
        const family = {
            ...familyResult.rows[0],
            members: membersResult.rows
        };
        
        res.json(family);
        
    } catch (error) {
        console.error('Error fetching family:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new family
router.post('/', requireSchoolContext, validateFamily, handleValidationErrors, async (req, res) => {
    try {
        const {
            family_name,
            primary_contact_phone,
            primary_contact_email,
            primary_address,
            city,
            state,
            zip_code,
            country = 'USA',
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_email,
            notes,
            language_preference = 'English',
            communication_preference = 'email',
            pickup_authorization = [],
            family_preferences = {},
            status = 'Active',
            school_id = 1
        } = req.body;
        
        const query = `
            INSERT INTO families (
                family_name, primary_contact_phone, primary_contact_email,
                primary_address, city, state, zip_code, country,
                emergency_contact_name, emergency_contact_phone, emergency_contact_email,
                notes, language_preference, communication_preference,
                pickup_authorization, family_preferences, status, school_id,
                created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        
        const values = [
            family_name, primary_contact_phone, primary_contact_email,
            primary_address, city, state, zip_code, country,
            emergency_contact_name, emergency_contact_phone, emergency_contact_email,
            notes, language_preference, communication_preference,
            JSON.stringify(pickup_authorization), JSON.stringify(family_preferences),
            status, school_id, req.user?.id || 1
        ];
        
        const result = await req.db.query(query, values);
        
        res.status(201).json({
            message: 'Family created successfully',
            family: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating family:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(409).json({ error: 'Family with this name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update family
router.put('/:family_id', requireSchoolContext, validateFamily, handleValidationErrors, async (req, res) => {
    try {
        const { family_id } = req.params;
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        // Build dynamic update query
        const allowedFields = [
            'family_name', 'primary_contact_phone', 'primary_contact_email',
            'primary_address', 'city', 'state', 'zip_code', 'country',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_email',
            'notes', 'language_preference', 'communication_preference',
            'pickup_authorization', 'family_preferences', 'status'
        ];
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateFields.push(`${field} = $${paramIndex}`);
                if (field === 'pickup_authorization' || field === 'family_preferences') {
                    values.push(JSON.stringify(req.body[field]));
                } else {
                    values.push(req.body[field]);
                }
                paramIndex++;
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        // Add updated_at field
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(family_id);
        
        const query = `
            UPDATE families 
            SET ${updateFields.join(', ')}
            WHERE family_id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await req.db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Family not found' });
        }
        
        res.json({
            message: 'Family updated successfully',
            family: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating family:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add member to family
router.post('/:family_id/members', requireSchoolContext, async (req, res) => {
    try {
        const { family_id } = req.params;
        const {
            member_id,
            member_type,
            relationship_type,
            relationship_to_primary,
            is_primary_contact = false,
            is_emergency_contact = false,
            is_pickup_authorized = true,
            custody_info = {},
            contact_preferences = { receive_notifications: true, preferred_method: 'email', language: 'English' }
        } = req.body;
        
        // Validate family exists
        const familyCheck = await req.db.query('SELECT id FROM families WHERE family_id = $1', [family_id]);
        if (familyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Family not found' });
        }
        
        // Validate member exists
        let memberExists = false;
        if (member_type === 'student') {
            const studentCheck = await req.db.query('SELECT id FROM members WHERE student_id = $1', [member_id]);
            memberExists = studentCheck.rows.length > 0;
        } else if (member_type === 'parent' || member_type === 'guardian') {
            const parentCheck = await req.db.query('SELECT id FROM parents WHERE parent_id = $1', [member_id]);
            memberExists = parentCheck.rows.length > 0;
        }
        
        if (!memberExists) {
            return res.status(404).json({ error: 'Member not found' });
        }
        
        // Create family member relationship
        const query = `
            INSERT INTO family_members (
                family_id, member_id, member_type, relationship_type, relationship_to_primary,
                is_primary_contact, is_emergency_contact, is_pickup_authorized,
                custody_info, contact_preferences
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        
        const values = [
            family_id, member_id, member_type, relationship_type, relationship_to_primary,
            is_primary_contact, is_emergency_contact, is_pickup_authorized,
            JSON.stringify(custody_info), JSON.stringify(contact_preferences)
        ];
        
        const result = await req.db.query(query, values);
        
        // Update student's family_id if it's a student
        if (member_type === 'student') {
            await req.db.query(
                'UPDATE members SET family_id = $1, family_role = $2 WHERE student_id = $3',
                [family_id, 'child', member_id]
            );
        }
        
        res.status(201).json({
            message: 'Member added to family successfully',
            relationship: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error adding member to family:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(409).json({ error: 'Member already belongs to this family' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Remove member from family
router.delete('/:family_id/members/:member_id', requireSchoolContext, async (req, res) => {
    try {
        const { family_id, member_id } = req.params;
        
        const query = `
            DELETE FROM family_members 
            WHERE family_id = $1 AND member_id = $2
            RETURNING *
        `;
        
        const result = await req.db.query(query, [family_id, member_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Family relationship not found' });
        }
        
        // Remove family_id from student if it was a student
        if (result.rows[0].member_type === 'student') {
            await req.db.query(
                'UPDATE members SET family_id = NULL, family_role = NULL WHERE student_id = $1',
                [member_id]
            );
        }
        
        res.json({ message: 'Member removed from family successfully' });
        
    } catch (error) {
        console.error('Error removing member from family:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// PARENT ROUTES
// ============================================================================

// Get all parents
router.get('/parents', requireSchoolContext, async (req, res) => {
    try {
        const { 
            status, 
            search, 
            page = 1, 
            limit = 100,
            sort_by = 'full_name',
            sort_order = 'asc'
        } = req.query;
        
        let query = `
            SELECT p.*, s.name as school_name,
                   COUNT(fm.id) as family_count
            FROM parents p
            LEFT JOIN schools s ON p.school_id = s.id
            LEFT JOIN family_members fm ON p.parent_id = fm.member_id AND fm.member_type IN ('parent', 'guardian')
        `;
        
        const queryParams = [];
        const conditions = [];
        
        // Add search condition
        if (search) {
            conditions.push(`(
                p.full_name ILIKE ${queryParams.length + 1} OR 
                p.first_name ILIKE ${queryParams.length + 1} OR 
                p.last_name ILIKE ${queryParams.length + 1} OR 
                p.email ILIKE ${queryParams.length + 1} OR 
                p.parent_id ILIKE ${queryParams.length + 1}
            )`);
            queryParams.push(`%${search}%`);
        }
        
        // Add status filter
        if (status && status !== 'All') {
            conditions.push(`p.status = ${queryParams.length + 1}`);
            queryParams.push(status);
        }
        
        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Add GROUP BY and ORDER BY
        const sortDirection = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        query += ` 
            GROUP BY p.id, p.parent_id, p.first_name, p.last_name, p.full_name, p.email, p.status, s.name
            ORDER BY p.${sort_by} ${sortDirection}
        `;
        
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT ${queryParams.length + 1} OFFSET ${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await req.db.query(query, queryParams);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM parents p`;
        const countParams = [];
        
        if (search || (status && status !== 'All')) {
            const countConditions = [];
            
            if (search) {
                countConditions.push(`(
                    p.full_name ILIKE ${countParams.length + 1} OR 
                    p.first_name ILIKE ${countParams.length + 1} OR 
                    p.last_name ILIKE ${countParams.length + 1} OR 
                    p.email ILIKE ${countParams.length + 1} OR 
                    p.parent_id ILIKE ${countParams.length + 1}
                )`);
                countParams.push(`%${search}%`);
            }
            
            if (status && status !== 'All') {
                countConditions.push(`p.status = ${countParams.length + 1}`);
                countParams.push(status);
            }
            
            if (countConditions.length > 0) {
                countQuery += ` WHERE ${countConditions.join(' AND ')}`;
            }
        }
        
        const countResult = await req.db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            parents: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching parents:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get parent by ID
router.get('/parents/:parent_id', requireSchoolContext, async (req, res) => {
    try {
        const { parent_id } = req.params;
        
        // Get parent details
        const parentQuery = `
            SELECT p.*, s.name as school_name
            FROM parents p
            LEFT JOIN schools s ON p.school_id = s.id
            WHERE p.parent_id = $1
        `;
        const parentResult = await req.db.query(parentQuery, [parent_id]);
        
        if (parentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        
        // Get family relationships
        const familyQuery = `
            SELECT fm.*, f.family_name, f.family_id
            FROM family_members fm
            JOIN families f ON fm.family_id = f.family_id
            WHERE fm.member_id = $1 AND fm.member_type IN ('parent', 'guardian')
        `;
        const familyResult = await req.db.query(familyQuery, [parent_id]);
        
        const parent = {
            ...parentResult.rows[0],
            families: familyResult.rows
        };
        
        res.json(parent);
        
    } catch (error) {
        console.error('Error fetching parent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new parent
router.post('/parents', requireSchoolContext, validateParent, handleValidationErrors, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            title,
            email,
            phone,
            alternate_phone,
            work_phone,
            occupation,
            employer,
            work_address,
            preferred_communication = 'email',
            available_for_volunteering = false,
            volunteer_interests = [],
            skills = [],
            alumni_student = false,
            years_associated = 0,
            previous_volunteer_roles = [],
            status = 'Active',
            school_id = 1
        } = req.body;
        
        const query = `
            INSERT INTO parents (
                first_name, last_name, title, email, phone, alternate_phone, work_phone,
                occupation, employer, work_address, preferred_communication,
                available_for_volunteering, volunteer_interests, skills,
                alumni_student, years_associated, previous_volunteer_roles,
                status, school_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `;
        
        const values = [
            first_name, last_name, title, email, phone, alternate_phone, work_phone,
            occupation, employer, work_address, preferred_communication,
            available_for_volunteering, volunteer_interests, skills,
            alumni_student, years_associated, previous_volunteer_roles,
            status, school_id
        ];
        
        const result = await req.db.query(query, values);
        
        res.status(201).json({
            message: 'Parent created successfully',
            parent: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating parent:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(409).json({ error: 'Email address already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update parent
router.put('/parents/:parent_id', requireSchoolContext, validateParent, handleValidationErrors, async (req, res) => {
    try {
        const { parent_id } = req.params;
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        
        // Build dynamic update query
        const allowedFields = [
            'first_name', 'last_name', 'title', 'email', 'phone', 'alternate_phone', 'work_phone',
            'occupation', 'employer', 'work_address', 'preferred_communication',
            'available_for_volunteering', 'volunteer_interests', 'skills',
            'alumni_student', 'years_associated', 'previous_volunteer_roles', 'status'
        ];
        
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateFields.push(`${field} = ${paramIndex}`);
                values.push(req.body[field]);
                paramIndex++;
            }
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(parent_id);
        
        const query = `
            UPDATE parents 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE parent_id = ${paramIndex}
            RETURNING *
        `;
        
        const result = await req.db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Parent not found' });
        }
        
        res.json({
            message: 'Parent updated successfully',
            parent: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating parent:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(409).json({ error: 'Email address already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Get parent's children
router.get('/parents/:parent_id/children', requireSchoolContext, async (req, res) => {
    try {
        const { parent_id } = req.params;
        
        const query = `
            SELECT 
                fm.relationship_type,
                fm.relationship_to_primary,
                m.student_id,
                m.name,
                m.grade,
                m.status,
                m.email,
                m.contact,
                m.photo_url,
                f.family_id,
                f.family_name
            FROM family_members fm
            JOIN families f ON fm.family_id = f.family_id
            JOIN family_members pfm ON f.family_id = pfm.family_id
            JOIN members m ON fm.member_id = m.student_id
            WHERE pfm.member_id = $1 
              AND pfm.member_type IN ('parent', 'guardian')
              AND fm.member_type = 'student'
            ORDER BY m.name
        `;
        
        const result = await req.db.query(query, [parent_id]);
        
        res.json({ children: result.rows });
        
    } catch (error) {
        console.error('Error fetching parent children:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENHANCED MEMBER ROUTES (Add to existing members.js)
// ============================================================================

// Get student's family information
router.get('/members/:student_id/family', requireSchoolContext, async (req, res) => {
    try {
        const { student_id } = req.params;
        
        // Get student details
        const studentQuery = `
            SELECT m.student_id, m.name, m.family_id
            FROM members m
            WHERE m.student_id = $1
        `;
        const studentResult = await req.db.query(studentQuery, [student_id]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const student = studentResult.rows[0];
        
        if (!student.family_id) {
            return res.json({ 
                student,
                family: null, 
                message: 'Student is not assigned to any family' 
            });
        }
        
        // Get family details with all members
        const familyQuery = `
            SELECT f.*, s.name as school_name
            FROM families f
            LEFT JOIN schools s ON f.school_id = s.id
            WHERE f.family_id = $1
        `;
        const familyResult = await req.db.query(familyQuery, [student.family_id]);
        
        // Get all family members
        const membersQuery = `
            SELECT 
                fm.*,
                CASE 
                    WHEN fm.member_type = 'student' THEN 
                        json_build_object(
                            'student_id', m.student_id,
                            'name', m.name,
                            'grade', m.grade,
                            'status', m.status,
                            'email', m.email
                        )
                    ELSE 
                        json_build_object(
                            'parent_id', p.parent_id,
                            'first_name', p.first_name,
                            'last_name', p.last_name,
                            'full_name', p.full_name,
                            'email', p.email,
                            'phone', p.phone
                        )
                END as member_details
            FROM family_members fm
            LEFT JOIN members m ON fm.member_id = m.student_id AND fm.member_type = 'student'
            LEFT JOIN parents p ON fm.member_id = p.parent_id AND fm.member_type IN ('parent', 'guardian')
            WHERE fm.family_id = $1
            ORDER BY 
                CASE fm.member_type 
                    WHEN 'parent' THEN 1 
                    WHEN 'guardian' THEN 2 
                    WHEN 'student' THEN 3 
                END
        `;
        const membersResult = await req.db.query(membersQuery, [student.family_id]);
        
        const response = {
            student,
            family: {
                ...familyResult.rows[0],
                members: membersResult.rows
            }
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error fetching student family:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's parents
router.get('/members/:student_id/parents', requireSchoolContext, async (req, res) => {
    try {
        const { student_id } = req.params;
        
        // Get student's family_id
        const studentQuery = `SELECT family_id FROM members WHERE student_id = $1`;
        const studentResult = await req.db.query(studentQuery, [student_id]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const family_id = studentResult.rows[0].family_id;
        
        if (!family_id) {
            return res.json({ parents: [] });
        }
        
        const query = `
            SELECT 
                fm.relationship_type,
                fm.relationship_to_primary,
                fm.is_primary_contact,
                fm.is_emergency_contact,
                p.*
            FROM family_members fm
            JOIN parents p ON fm.member_id = p.parent_id
            WHERE fm.family_id = $1 
              AND fm.member_type IN ('parent', 'guardian')
            ORDER BY fm.is_primary_contact DESC, p.full_name
        `;
        
        const result = await req.db.query(query, [family_id]);
        
        res.json({ parents: result.rows });
        
    } catch (error) {
        console.error('Error fetching student parents:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get student's siblings
router.get('/members/:student_id/siblings', requireSchoolContext, async (req, res) => {
    try {
        const { student_id } = req.params;
        
        // Get student's family_id
        const studentQuery = `SELECT family_id FROM members WHERE student_id = $1`;
        const studentResult = await req.db.query(studentQuery, [student_id]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        const family_id = studentResult.rows[0].family_id;
        
        if (!family_id) {
            return res.json({ siblings: [] });
        }
        
        const query = `
            SELECT 
                fm.relationship_type,
                m.*
            FROM family_members fm
            JOIN members m ON fm.member_id = m.student_id
            WHERE fm.family_id = $1 
              AND fm.member_type = 'student'
              AND fm.member_id != $2
            ORDER BY m.name
        `;
        
        const result = await req.db.query(query, [family_id, student_id]);
        
        res.json({ siblings: result.rows });
        
    } catch (error) {
        console.error('Error fetching student siblings:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;