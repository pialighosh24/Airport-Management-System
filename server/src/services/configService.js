/**
 * AeroNexus - Configuration Management Service
 *
 * Safely persists administrator settings such as provider polling intervals,
 * cache durations, quiet hours, and alerting thresholds.
 *
 * Prevents overwrite of environment credentials and system secrets.
 */

const fs = require('fs');
const path = require('path');
const { recordAuditEvent } = require('./auditService');

const CONFIG_FILE = path.resolve(__dirname, '../data/system_config.json');

const DEFAULT_CONFIG = {
  pollingIntervalSeconds: 30,
  cacheTtlSeconds: 300,
  quietHours: {
    enabled: true,
    startTime: '22:00',
    endTime: '06:00',
    timezone: 'Asia/Kolkata',
  },
  activeProviders: {
    amadeus: true,
    openSky: true,
    flightAware: true,
    openMeteo: true,
    freeAirportDb: true,
  },
  alertThresholds: {
    latencyWarningMs: 1500,
    consecutiveFailuresBeforeDegraded: 3,
  },
  maintenanceMode: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

let currentConfig = { ...DEFAULT_CONFIG };

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      currentConfig = { ...DEFAULT_CONFIG, ...parsed };
    } else {
      saveConfig('SYSTEM', 'Default system configuration initialized.');
    }
  } catch (err) {
    currentConfig = { ...DEFAULT_CONFIG };
  }
}

function saveConfig(actor = 'admin', details = 'Configuration updated.') {
  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    currentConfig.updatedAt = new Date().toISOString();
    currentConfig.updatedBy = actor;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf8');

    recordAuditEvent({
      actor,
      action: 'UPDATE_CONFIG',
      category: 'CONFIGURATION',
      details,
    });
  } catch (err) {
    // Non-fatal
  }
}

loadConfig();

function getConfig() {
  return { ...currentConfig };
}

function updateConfig(updates = {}, actor = 'admin') {
  const allowedKeys = [
    'pollingIntervalSeconds',
    'cacheTtlSeconds',
    'quietHours',
    'activeProviders',
    'alertThresholds',
    'maintenanceMode',
  ];

  const sanitized = {};

  if (typeof updates.pollingIntervalSeconds === 'number') {
    sanitized.pollingIntervalSeconds = Math.max(5, Math.min(600, updates.pollingIntervalSeconds));
  }

  if (typeof updates.cacheTtlSeconds === 'number') {
    sanitized.cacheTtlSeconds = Math.max(10, Math.min(86400, updates.cacheTtlSeconds));
  }

  if (updates.quietHours && typeof updates.quietHours === 'object') {
    sanitized.quietHours = {
      enabled: Boolean(updates.quietHours.enabled),
      startTime: String(updates.quietHours.startTime || '22:00'),
      endTime: String(updates.quietHours.endTime || '06:00'),
      timezone: String(updates.quietHours.timezone || 'Asia/Kolkata'),
    };
  }

  if (updates.activeProviders && typeof updates.activeProviders === 'object') {
    sanitized.activeProviders = {
      amadeus: updates.activeProviders.amadeus !== false,
      openSky: updates.activeProviders.openSky !== false,
      flightAware: updates.activeProviders.flightAware !== false,
      openMeteo: updates.activeProviders.openMeteo !== false,
      freeAirportDb: updates.activeProviders.freeAirportDb !== false,
    };
  }

  if (updates.alertThresholds && typeof updates.alertThresholds === 'object') {
    sanitized.alertThresholds = {
      latencyWarningMs: Number(updates.alertThresholds.latencyWarningMs) || 1500,
      consecutiveFailuresBeforeDegraded: Number(updates.alertThresholds.consecutiveFailuresBeforeDegraded) || 3,
    };
  }

  if (typeof updates.maintenanceMode === 'boolean') {
    sanitized.maintenanceMode = updates.maintenanceMode;
  }

  currentConfig = {
    ...currentConfig,
    ...sanitized,
  };

  saveConfig(actor, `Config modified: keys [${Object.keys(sanitized).join(', ')}]`);
  return currentConfig;
}

module.exports = {
  getConfig,
  updateConfig,
};

