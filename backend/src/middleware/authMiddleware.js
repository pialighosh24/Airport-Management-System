const User = require('../models/User');

/**
 * Middleware: Authenticate Bearer JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Access token required. Provide Authorization: Bearer <token>',
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization format. Format must be "Bearer <token>"',
    });
  }

  const token = parts[1];
  const payload = User.verifyToken(token);
  if (!payload) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid or expired access token.',
    });
  }

  req.user = payload;
  next();
}

/**
 * Middleware: Require Staff or Admin role
 */
function requireStaff(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required before verifying staff access.',
    });
  }

  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Restricted to operational staff and administrators.',
    });
  }

  next();
}

/**
 * Optional authentication middleware:
 * If a token is provided, verify and attach user; if not, proceed without failing.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = User.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

module.exports = {
  authenticateToken,
  requireStaff,
  optionalAuth,
};
