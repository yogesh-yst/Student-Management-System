const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
//const db = require('../scripts/db').default;
//const { app } = require('../server');

// // Validation middleware
// const validateLogin = [
//     body('username').trim().isLength({ min: 1 }).withMessage('Username is required'),
//     body('password').isLength({ min: 1 }).withMessage('Password is required')
// ];

const validateRegister = [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// Authentication Endpoints
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                error: 'Username and password are required'
            });
        }

        // Find user by username or email with school information
        const query = `
            SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_active, 
                   u.school_id, s.name as school_name
            FROM users u
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE (u.username = $1 OR u.email = $1) AND u.is_active = true
        `;
        
        const result = await req.db.query(query, [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        
        // Check if user has school assignment
        if (!user.school_id) {
            return res.status(400).json({ 
                error: 'User is not assigned to any school. Please contact administrator.' 
            });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Store user and school context in session (for session-based routes if any)
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            school_id: user.school_id,
            school_name: user.school_name
        };

        //  Create JWT token with school context
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                school_id: user.school_id,
                school_name: user.school_name
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ 
            token, 
            user: { 
                username: user.username, 
                role: user.role,
                school_id: user.school_id,
                school_name: user.school_name
            }
        });
        
        // Update last login
        const updateQuery = `
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP, login_count = COALESCE(login_count, 0) + 1
            WHERE id = $1
        `;
        await req.db.query(updateQuery, [user.id]);

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error during login'
        });
    }
});
router.post('/logout', (req, res) => {
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

router.get('/status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user // This now includes school_id and school_name
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// Register endpoint
router.post('/register', validateRegister, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password, role = 'user', school_id } = req.body;

        // Validate school_id is provided
        if (!school_id) {
            return res.status(400).json({ error: 'School assignment is required' });
        }

        // Validate school exists
        const schoolQuery = 'SELECT id, name FROM schools WHERE id = $1';
        const schoolResult = await req.db.query(schoolQuery, [school_id]);
        
        if (schoolResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid school selected' });
        }

        // Check if user already exists
        const existingQuery = `
            SELECT id FROM users 
            WHERE username = $1 OR email = $2
        `;
        
        const existingResult = await req.db.query(existingQuery, [username, email]);
        
        if (existingResult.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Insert new user with school assignment
        const insertQuery = `
            INSERT INTO users (username, email, password_hash, role, school_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, role, school_id, created_at
        `;
        
        const result = await req.db.query(insertQuery, [username, email, passwordHash, role, school_id]);
        const newUser = result.rows[0];
        
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                school_id: newUser.school_id,
                created_at: newUser.created_at
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// Get current user
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
        user: req.session.user
    });
});
// Change password
router.put('/change-password', async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        // Get current user
        const userQuery = `SELECT password_hash FROM users WHERE id = $1`;
        const userResult = await req.db.query(userQuery, [req.session.user.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const newPasswordHash = await bcrypt.hash(new_password, saltRounds);
        
        // Update password
        const updateQuery = `
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `;
        
        await req.db.query(updateQuery, [newPasswordHash, req.session.user.id]);
        
        res.json({ message: 'Password changed successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
