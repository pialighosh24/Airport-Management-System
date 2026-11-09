/**
 * AeroNexus — Backend Health Controller
 *
 * Aggregated service health: process liveness, backend readiness, MySQL state and external API status.
 */

const config = require('../config');
const { getDatabaseHealth } = require('../config/database');

const SERVICE_NAME = 'AeroNexus — Smart Flight Tracking Backend';

/**
 * Collect external API status information.
 *
 * Status values are derived from configuration only. Reachability is never
 * reported as verified here (no live probe is performed by the health endpoint),
 * so providers are labelled `public`, `not_configured` or `configured` and are
 * never claimed to be reachable merely because credentials exist.
 */
function collectExternalApiStatuses() {
  return {
    openSky: {
      source: 'OPENSKY_NETWORK',
      providerName: 'OpenSky Network',
      status: config.openSky?.username ? 'configured' : 'public',
      authConfigured: Boolean(config.openSky?.username),
    },
    openMeteo: {
      source: 'OPEN_METEO',
      providerName: 'Open-Meteo',
      status: 'public',
      authConfigured: false,
    },
    openErApi: {
      source: 'OPEN_ER_API',
      providerName: 'Open Exchange Rate API',
      status: 'public',
      authConfigured: false,
    },
    amadeus: {
      source: 'AMADEUS',
      providerName: 'Amadeus Flight Offers API',
      status: config.amadeus?.clientId ? 'configured' : 'not_configured',
      authConfigured: Boolean(config.amadeus?.clientId),
      baseUrl: config.amadeus?.baseUrl || null,
    },
    flightAware: {
      source: 'FLIGHTAWARE',
      providerName: 'FlightAware AeroAPI',
      status: config.flightAware?.apiKey ? 'configured' : 'not_configured',
      authConfigured: Boolean(config.flightAware?.apiKey),
      baseUrl: config.flightAware?.baseUrl || null,
    },
  };
}

/**
 * Resolve the overall health status from process liveness and backend readiness.
 *
 * - `healthy`: backend process alive and essential operations ready.
 * - `degraded`: backend process alive but operating with a fallback / limited capability.
 * - `unhealthy`: backend process not alive or readiness could not be determined safely.
 */
function resolveHealthStatus(livenessStatus, readinessStatus) {
  if (livenessStatus !== 'alive') {
    return 'unhealthy';
  }
  if (readinessStatus === 'ready') {
    return 'healthy';
  }
  if (readinessStatus === 'degraded') {
    return 'degraded';
  }
  return 'unhealthy';
}

/**
 * Aggregated service health: process liveness, backend readiness, MySQL state and external API readiness.
 */
function collectHealthData() {
  const dbHealth = getDatabaseHealth();
  const checkedAt = new Date().toISOString();
  const livenessStatus = 'alive';
  const liveness = { status: livenessStatus, checkedAt };

  const databaseReady = Boolean(dbHealth.connected && dbHealth.mode === 'mysql');
  const readinessStatus = databaseReady ? 'ready' : 'degraded';
  const readiness = {
    status: readinessStatus,
    checkedAt,
    database: {
      configured: dbHealth.configured,
      connected: dbHealth.connected,
      state: dbHealth.state,
      mode: dbHealth.mode,
      message: dbHealth.message,
    },
  };

  const status = resolveHealthStatus(livenessStatus, readinessStatus);
  const degraded = status === 'degraded';

  return {
    success: true,
    service: SERVICE_NAME,
    status,
    message: degraded
      ? 'Backend API is operational in Demo Fallback Mode. Full database-backed readiness is not currently available.'
      : 'Backend API is operational and serving flight operations.',
    timestamp: checkedAt,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    version: '1.0.0',
    liveness,
    readiness,
    database: dbHealth,
    externalApis: collectExternalApiStatuses(),
  };
}

/**
 * Lightweight liveness probe — process-level only, no database or provider calls.
 */
function getLiveness(req, res) {
  return res.status(200).json({
    success: true,
    status: 'alive',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
}

/**
 * @route   GET /api/health
 * @desc    Aggregated service health: process liveness, readiness, MySQL state and external API status
 */
const getHealth = (req, res) => {
  try {
    const health = collectHealthData();
    return res.status(200).json(health);
  } catch (err) {
    console.error(`❌ [Health Check Error]: ${err.message}`);
    return res.status(503).json({
      success: false,
      error: 'ServiceUnavailable',
      message: 'Health check could not be completed.',
    });
  }
};

module.exports = {
  getHealth,
  getLiveness,
  collectHealthData,
  resolveHealthStatus,
};
