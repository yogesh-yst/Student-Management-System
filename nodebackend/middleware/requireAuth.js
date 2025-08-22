const jwt = require("jsonwebtoken");

// Middleware to check for JWT in cookies
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Expect "Bearer <token>"
  console.log("Token from header:", token);
  

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification failed:", err);
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    // Attach user info to request so routes can use it
    req.user = user;
    next();
  });
}

module.exports = requireAuth;
// This middleware can be used in your routes to protect them