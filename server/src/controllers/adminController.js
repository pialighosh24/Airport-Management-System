/**
 * Admin Controller
 *
 * Handles admin authentication, central system health overview, provider checks,
 * notice management, audit trail, live system logs, configuration, and telemetry.
 */

const {
  isAdminConfigured,
  verifyCredentials,
  issueToken,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  clearFailedAttempts,
} = require('../services/adminAuthService');
const { runIntegrationChecks } = require('../services/integrationHealthService');
const noticeService = require('../services/noticeService');
const { getDatabaseHealth, isDatabaseConnected, getPool } = require('../config/database');
const groundOperationsService = require('../services/groundOperationsService');
const airportMasterService = require('../services/airportMasterService');
const airlineService = require('../services/airlineService');
const auditService = require('../services/auditService');
const configService = require('../services/configService');
const { DEMO_FLIGHTS } = require('../data/demoData');
const Flight = require('../models/Flight');

/**
 * POST /api/admin/login
 */
async function login(req, res) {
  if (!isAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'AdminNotConfigured',
      message: 'Admin access is not configured on this server. Run "node src/scripts/createAdmin.js" in the server directory.',
    });
  }

  const clientKey = req.ip || req.connection.remoteAddress || 'client';
  const remainingLockout = getLockoutRemainingSeconds(clientKey);
  if (remainingLockout > 0) {
    auditService.recordAuditEvent({
      actor: req.body?.username || 'unknown',
      action: 'LOGIN_BLOCKED',
      category: 'AUTH',
      details: `Rate-limit lockout active (${remainingLockout}s remaining)`,
      ip: clientKey,
      status: 'FAILURE',
    });
    return res.status(429).json({
      success: false,
      error: 'TooManyRequests',
      message: `Too many failed login attempts. Please wait ${remainingLockout} seconds before trying again.`,
    });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Username and password are required.',
    });
  }

  const isValid = verifyCredentials(username, password);
  if (!isValid) {
    recordFailedAttempt(clientKey);
    auditService.recordAuditEvent({
      actor: username,
      action: 'LOGIN_FAILED',
      category: 'AUTH',
      details: 'Invalid password or username provided',
      ip: clientKey,
      status: 'FAILURE',
    });
    return res.status(401).json({
      success: false,
      error: 'InvalidCredentials',
      message: 'Invalid admin username or password.',
    });
  }

  clearFailedAttempts(clientKey);
  const session = issueToken(username);

  auditService.recordAuditEvent({
    actor: username,
    action: 'ADMIN_LOGIN',
    category: 'AUTH',
    details: 'Administrator successfully authenticated into Central Operations Control.',
    ip: clientKey,
    status: 'SUCCESS',
  });

  return res.status(200).json({
    success: true,
    message: 'Admin authentication successful.',
    ...session,
  });
}

/**
 * GET /api/admin/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    admin: req.admin,
  });
}

/**
 * GET /api/admin/dashboard
 */
async function getDashboardOverview(req, res) {
  const dbHealth = getDatabaseHealth();

  let flightCount = DEMO_FLIGHTS.length;
  let flightMode = 'demo_fallback';

  if (dbHealth.connected) {
    try {
      const dbFlights = await Flight.findAll();
      flightCount = dbFlights.length;
      flightMode = 'mysql';
    } catch {
      flightCount = DEMO_FLIGHTS.length;
      flightMode = 'demo_fallback';
    }
  }

  const masterAirports = airportMasterService.getAllMasterAirports();
  const airlines = airlineService.getAllAirlines();
  const recentEvents = auditService.getAuditTrail(6);
  const endUsers = await fetchEndUsers();

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      database: dbHealth,
    },
    metrics: {
      flights: {
        total: flightCount,
        mode: flightMode,
        isDemo: flightMode === 'demo_fallback',
        label: flightMode === 'mysql' ? 'MySQL 8.0 Live Table' : 'Demo Memory Dataset',
      },
      airports: {
        total: masterAirports.length,
        source: 'AeroNexus Airport Master Registry',
      },
      airlines: {
        total: airlines.length,
        source: 'AeroNexus Active Carrier Registry',
      },
      users: {
        total: endUsers.available ? endUsers.total : 0,
        activeAdmin: req.admin ? req.admin.username : 'admin',
        status: endUsers.available ? 'mysql' : 'unavailable',
        message: endUsers.available
          ? 'Registered users read from the MySQL users table.'
          : endUsers.reason,
        available: endUsers.available,
      },
      notices: {
        total: noticeService.getAllNotices().length,
        active: noticeService.getAllNotices(true).length,
      },
    },
    recentEvents,
  });
}

/**
 * GET /api/admin/integrations
 */
async function getIntegrations(req, res) {
  const force = req.query.force === 'true';
  try {
    const data = await runIntegrationChecks({ force });
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'IntegrationCheckError',
      message: err.message,
    });
  }
}

/**
 * POST /api/admin/integrations/check
 */
async function checkIntegrations(req, res) {
  try {
    const data = await runIntegrationChecks({ force: true });
    auditService.recordAuditEvent({
      actor: req.admin?.username || 'admin',
      action: 'PROBE_INTEGRATIONS',
      category: 'INTEGRATION',
      details: 'Manual full health probe dispatched across all 5 aviation API providers.',
    });
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'IntegrationCheckError',
      message: err.message,
    });
  }
}

/**
 * GET /api/admin/notices
 */
async function getNotices(req, res) {
  const notices = noticeService.getAllNotices(false);
  return res.status(200).json({
    success: true,
    count: notices.length,
    data: notices,
  });
}

/**
 * POST /api/admin/notices
 */
async function createNotice(req, res) {
  try {
    const notice = noticeService.createNotice(req.body);
    auditService.recordAuditEvent({
      actor: req.admin?.username || 'admin',
      action: 'CREATE_NOTICE',
      category: 'NOTICE',
      details: `Created notice "${notice.title}" [${notice.category}] with priority ${notice.priority}.`,
    });
    return res.status(201).json({
      success: true,
      message: 'Notice created successfully.',
      data: notice,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: err.message,
    });
  }
}

/**
 * PUT /api/admin/notices/:id
 */
async function updateNotice(req, res) {
  const { id } = req.params;
  const updated = noticeService.updateNotice(id, req.body);
  if (!updated) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Notice ${id} not found.`,
    });
  }

  auditService.recordAuditEvent({
    actor: req.admin?.username || 'admin',
    action: 'UPDATE_NOTICE',
    category: 'NOTICE',
    details: `Updated notice "${updated.title}" (ID: ${id})`,
  });

  return res.status(200).json({
    success: true,
    message: 'Notice updated successfully.',
    data: updated,
  });
}

/**
 * DELETE /api/admin/notices/:id
 */
async function deleteNotice(req, res) {
  const { id } = req.params;
  const deleted = noticeService.deleteNotice(id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'NotFound',
      message: `Notice ${id} not found.`,
    });
  }

  auditService.recordAuditEvent({
    actor: req.admin?.username || 'admin',
    action: 'DELETE_NOTICE',
    category: 'NOTICE',
    details: `Deleted notice ID: ${id}`,
  });

  return res.status(200).json({
    success: true,
    message: 'Notice deleted successfully.',
  });
}

/**
 * GET /api/admin/airlines
 */
async function getAirlines(req, res) {
  const airlines = airlineService.getAllAirlines();
  return res.status(200).json({
    success: true,
    count: airlines.length,
    data: airlines,
  });
}

/**
 * GET /api/admin/audit
 */
async function getAuditTrail(req, res) {
  const limit = parseInt(req.query.limit, 10) || 50;
  const category = req.query.category || null;
  const events = auditService.getAuditTrail(limit, category);
  return res.status(200).json({
    success: true,
    count: events.length,
    data: events,
  });
}

/**
 * GET /api/admin/logs
 */
async function getSystemLogs(req, res) {
  const limit = parseInt(req.query.limit, 10) || 100;
  const level = req.query.level || null;
  const logs = auditService.getSystemLogs(limit, level);
  return res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
}

/**
 * GET /api/admin/config
 */
async function getConfig(req, res) {
  const config = configService.getConfig();
  return res.status(200).json({
    success: true,
    data: config,
  });
}

/**
 * PUT /api/admin/config
 */
async function updateConfig(req, res) {
  const actor = req.admin?.username || 'admin';
  const updated = configService.updateConfig(req.body, actor);
  return res.status(200).json({
    success: true,
    message: 'Configuration updated successfully.',
    data: updated,
  });
}

/**
 * GET /api/admin/database
 */
async function getDatabaseDiagnostics(req, res) {
  const dbHealth = getDatabaseHealth();
  const startTime = Date.now();
  let queryLatencyMs = null;

  if (dbHealth.connected) {
    try {
      await Flight.findAll();
      queryLatencyMs = Date.now() - startTime;
    } catch {
      queryLatencyMs = null;
    }
  }

  return res.status(200).json({
    success: true,
    diagnostics: {
      ...dbHealth,
      queryLatencyMs,
      timestamp: new Date().toISOString(),
      pool: {
        engine: 'mysql2/promise',
        ssl: false,
        timeoutMs: 5000,
      },
    },
  });
}

/**
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  const endUsers = await fetchEndUsers();
  return res.status(200).json({
    success: true,
    users: [
      {
        id: 'usr_admin_01',
        username: req.admin?.username || 'admin',
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        created: 'System Bootstrap',
        lastLogin: new Date().toISOString(),
      },
    ],
    endUsers,
  });
}

/**
 * Reads registered end-users from the MySQL `users` table defined by the
 * feature/dashboard schema (backend/src/config/schema.sql). Password hashes and
 * staff PINs are never selected. When MySQL is not connected or the table does
 * not exist, the result is explicitly marked unavailable (no invented counts).
 */
async function fetchEndUsers() {
  const source = 'MySQL users table (feature/dashboard schema)';
  if (!isDatabaseConnected()) {
    return {
      available: false,
      source,
      total: null,
      roleBreakdown: null,
      records: [],
      reason: 'MySQL is not connected, so registered users cannot be read.',
    };
  }
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, username, email, full_name AS fullName, role, created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 200'
    );
    const [counts] = await pool.query('SELECT role, COUNT(*) AS total FROM users GROUP BY role');
    const roleBreakdown = {};
    let total = 0;
    counts.forEach((c) => {
      roleBreakdown[c.role] = Number(c.total);
      total += Number(c.total);
    });
    return { available: true, source, total, roleBreakdown, records: rows, reason: null };
  } catch (err) {
    return {
      available: false,
      source,
      total: null,
      roleBreakdown: null,
      records: [],
      reason: `Users table could not be read (${err.code || 'query failed'}). Apply backend/src/config/schema.sql from feature/dashboard.`,
    };
  }
}

/**
 * GET /api/admin/ground-operations
 * Ground handling task engine authored on feature/dashboard (in-memory store).
 * Tasks seeded by that service (id prefix "ground_demo_") are flagged isDemo.
 */
async function getGroundOperations(req, res) {
  const { status, type, flightNumber } = req.query;
  const result = groundOperationsService.listTasks({ status, type, flightNumber });
  const data = result.data.map((t) => ({ ...t, isDemo: String(t.id).startsWith('ground_demo_') }));
  return res.status(200).json({
    success: true,
    count: data.length,
    demoCount: data.filter((t) => t.isDemo).length,
    storage: 'in-memory (resets on server restart)',
    allowedStatuses: groundOperationsService.GROUND_TASK_STATUSES,
    data,
  });
}

/**
 * POST /api/admin/ground-operations
 */
async function createGroundOperation(req, res) {
  try {
    const result = groundOperationsService.createTask(req.body || {});
    auditService.recordAuditEvent({
      actor: req.admin?.username || 'admin',
      action: 'GROUND_TASK_CREATED',
      category: 'OPERATIONS',
      details: `Created ground task ${result.data.taskNumber} (${result.data.type})`,
      ip: req.ip,
      status: 'SUCCESS',
    });
    return res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to create ground operations task.' });
  }
}

/**
 * PATCH /api/admin/ground-operations/:id
 */
async function updateGroundOperation(req, res) {
  try {
    const result = groundOperationsService.updateTask(req.params.id, req.body || {});
    auditService.recordAuditEvent({
      actor: req.admin?.username || 'admin',
      action: 'GROUND_TASK_UPDATED',
      category: 'OPERATIONS',
      details: `Updated ground task ${result.data.taskNumber} (status: ${result.data.status})`,
      ip: req.ip,
      status: 'SUCCESS',
    });
    return res.status(200).json({ success: true, data: result.data });
  } catch (err) {
    if (err.name === 'NotFoundError') {
      return res.status(404).json({ success: false, error: 'NotFoundError', message: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to update ground operations task.' });
  }
}

/**
 * Public endpoint for mobile app: GET /api/notices
 */
async function getPublicNotices(req, res) {
  const notices = noticeService.getAllNotices(true);
  return res.status(200).json({
    success: true,
    count: notices.length,
    data: notices,
  });
}

module.exports = {
  login,
  getMe,
  getDashboardOverview,
  getIntegrations,
  checkIntegrations,
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  getAirlines,
  getAuditTrail,
  getSystemLogs,
  getConfig,
  updateConfig,
  getDatabaseDiagnostics,
  getUsers,
  getGroundOperations,
  createGroundOperation,
  updateGroundOperation,
  getPublicNotices,
};
