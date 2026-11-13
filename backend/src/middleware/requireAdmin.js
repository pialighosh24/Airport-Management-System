/**
 * requireAdmin middleware
 *
 * Protects every /api/admin/* route (except login) on the SERVER side.
 * The mobile/web client never decides who is an admin.
 *
 * - 503 when admin access has not been configured in server/.env
 * - 401 when the Bearer token is missing, invalid, or expired
 */

const { isAdminConfigured, verifyToken } = require('../services/adminAuthService');

function requireAdmin(req, res, next) {
  if (!isAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'AdminNotConfigured',
      message: 'Admin access is not configured on this server. Run "npm run admin:create" inside server/.',
    });
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: 'UnauthorizedError',
      message: 'Admin authentication required.',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'UnauthorizedError',
      message: 'Admin session is invalid or has expired. Please sign in again.',
    });
  }

  req.admin = { username: payload.sub, role: payload.role, expiresAt: new Date(payload.exp * 1000).toISOString() };
  return next();
}

module.exports = requireAdmin;
