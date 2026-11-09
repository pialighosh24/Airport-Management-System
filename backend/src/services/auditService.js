/**
 * AeroNexus - Audit & System Log Service
 *
 * Persistently records administrator actions and operational logs.
 * Supports file persistence and in-memory ring-buffer retrieval.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_FILE = path.resolve(__dirname, '../data/audit_log.json');

// In-memory logs ring buffer (last 500 entries)
const systemLogs = [];
const MAX_LOGS = 500;

let auditEntries = [];

function loadAuditEntries() {
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
      auditEntries = JSON.parse(raw);
      if (!Array.isArray(auditEntries)) auditEntries = [];
    } else {
      // Initialize with system startup event
      auditEntries = [
        {
          id: 'aud_init_' + Date.now(),
          timestamp: new Date().toISOString(),
          actor: 'SYSTEM',
          action: 'SERVICE_INITIALIZATION',
          category: 'SYSTEM',
          details: 'AeroNexus Central Audit Engine initialized.',
          ip: '127.0.0.1',
          status: 'SUCCESS',
        },
      ];
      saveAuditEntries();
    }
  } catch (err) {
    auditEntries = [];
  }
}

function saveAuditEntries() {
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Keep last 1000 persistent audit events
    const trimmed = auditEntries.slice(-1000);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal fallback
  }
}

// Initialize on module load
loadAuditEntries();

function recordAuditEvent({ actor, action, category = 'ADMIN', details, ip = '127.0.0.1', status = 'SUCCESS' }) {
  const entry = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    actor: actor || 'admin',
    action,
    category,
    details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
    ip,
    status,
  };

  auditEntries.unshift(entry);
  saveAuditEntries();

  // Also push to system logs
  addSystemLog({
    level: status === 'FAILURE' ? 'warn' : 'info',
    source: 'AUDIT',
    message: `[${action}] ${entry.details} (by ${entry.actor})`,
  });

  return entry;
}

function getAuditTrail(limit = 100, category = null) {
  let list = auditEntries;
  if (category) {
    list = list.filter((e) => e.category === category);
  }
  return list.slice(0, limit);
}

function addSystemLog({ level = 'info', source = 'SERVER', message, meta = null }) {
  const logItem = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    level: ['info', 'warn', 'error', 'debug'].includes(level) ? level : 'info',
    source: source.toUpperCase(),
    message: String(message || ''),
    meta: meta || undefined,
  };

  systemLogs.unshift(logItem);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.pop();
  }
  return logItem;
}

function getSystemLogs(limit = 100, level = null) {
  let list = systemLogs;
  if (level && level !== 'all') {
    list = list.filter((l) => l.level === level.toLowerCase());
  }
  return list.slice(0, limit);
}

// Seed initial system logs if empty
if (systemLogs.length === 0) {
  addSystemLog({ level: 'info', source: 'KERNEL', message: 'AeroNexus server kernel initialized.' });
  addSystemLog({ level: 'info', source: 'NETWORK', message: 'Express HTTP server mounted with CORS and rate limits.' });
  addSystemLog({ level: 'info', source: 'INTEGRATION', message: 'Loaded 5 API integration adapters: Amadeus, OpenSky, FlightAware, Open-Meteo, FreeAirportDB.' });
}

module.exports = {
  recordAuditEvent,
  getAuditTrail,
  addSystemLog,
  getSystemLogs,
};

