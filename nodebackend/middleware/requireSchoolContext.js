// middleware/requireSchoolContext.js
// JWT-based middleware to ensure user has school context
const jwt = require("jsonwebtoken");

const requireSchoolContext = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification failed:", err);
            return res.status(403).json({ error: "Invalid or expired token." });
        }

        // Check if user has school context in JWT
        if (!user.school_id) {
            return res.status(400).json({ 
                error: 'No school context found in token. Please login again.' 
            });
        }

        // Attach user info with school context to request
        req.user = user;
        req.schoolId = user.school_id;
        req.schoolName = user.school_name;

        console.log('User authenticated with school context:', {
            userId: user.id,
            username: user.username,
            role: user.role,
            schoolId: user.school_id,
            schoolName: user.school_name
        });

        next();
    });
};

module.exports = requireSchoolContext;
