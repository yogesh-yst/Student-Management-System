// routes/admin.js - Admin-only routes for user management
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Get all users with their school assignments
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, u.email, u.role, u.is_active, 
                   u.school_id, s.name as school_name, u.created_at
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            ORDER BY u.username
        `;
        
        const result = await req.db.query(query);
        
        res.json({
            users: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update user's school assignment
router.put('/users/:userId/school', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { school_id } = req.body;
        
        if (!school_id) {
            return res.status(400).json({ error: 'school_id is required' });
        }
        
        // Verify school exists
        const schoolQuery = 'SELECT id, name FROM schools WHERE id = $1';
        const schoolResult = await req.db.query(schoolQuery, [school_id]);
        
        if (schoolResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid school selected' });
        }
        
        // Update user's school assignment
        const updateQuery = `
            UPDATE users 
            SET school_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, username, school_id
        `;
        
        const result = await req.db.query(updateQuery, [school_id, userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            message: 'School assignment updated successfully',
            user: result.rows[0],
            school: schoolResult.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating school assignment:', error);
        res.status(500).json({ error: 'Failed to update school assignment' });
    }
});

// Get all schools
router.get('/schools', requireAuth, requireAdmin, async (req, res) => {
    try {
        const query = 'SELECT * FROM schools ORDER BY name';
        const result = await req.db.query(query);
        
        res.json({
            schools: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});

// Create new school
router.post('/schools', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, address, city, state, country, contact_phone, contact_email } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'School name is required' });
        }
        
        const query = `
            INSERT INTO schools (name, address, city, state, country, contact_phone, contact_email, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        
        const result = await req.db.query(query, [name, address, city, state, country, contact_phone, contact_email]);
        
        res.status(201).json({
            message: 'School created successfully',
            school: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Failed to create school' });
    }
});

module.exports = router;
