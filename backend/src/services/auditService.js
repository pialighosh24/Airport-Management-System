/**
 * AeroNexus — Admin Audit Log Service
 *
 * In-memory administrative action ledger powering the Admin Panel audit trail.
 * Records important administrative actions (flight status changes, disruption
 * updates, notices, user management) without touching existing behaviour.
 */

const MAX_ENTRIES = 200;

const auditLogStore = [];

function recordAdminAudit(entry) {
  const log = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: entry.action || 'ADMIN_ACTION',
    actor: entry.actor || null,
    target: entry.target || null,
    severity: entry.severity || 'info',
    status: entry.status || 'success',
    metadata: entry.metadata || {},
    createdAtUtc: new Date().toISOString(),
  };

  auditLogStore.unshift(log);
  if (auditLogStore.length > MAX_ENTRIES) {
    auditLogStore.pop();
  }

  return log;
}

function listAuditLogs(limit = 100) {
  const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, MAX_ENTRIES));
  return auditLogStore.slice(0, safeLimit);
}

module.exports = {
  recordAdminAudit,
  listAuditLogs,
  auditLogStore,
};
