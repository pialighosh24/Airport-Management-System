/**
 * AeroNexus — Admin Audit Controller
 *
 * Exposes the administrative audit trail for the Admin Panel.
 */

const { listAuditLogs } = require('../services/auditService');

/**
 * @route   GET /api/admin/audit-logs
 * @desc    List administrative audit log entries (most recent first)
 */
const getAdminAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const logs = listAuditLogs(limit);

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error('❌ [Admin Audit Logs Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve administrative audit logs.',
    });
  }
};

module.exports = {
  getAdminAuditLogs,
};
