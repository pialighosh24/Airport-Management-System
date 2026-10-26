const config = require('../config');
const { getDatabaseHealth } = require('../config/database');

/**
 * @route   GET /api/health
 * @desc    Aggregated service health: process state, MySQL state and external API readiness
 */
const getHealth = (req, res) => {
  const dbHealth = getDatabaseHealth();

  const externalApis = {
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

  res.status(200).json({
    success: true,
    service: 'AeroNexus — Smart Flight Tracking Backend',
    status: 'healthy',
    message: 'Backend API is operational and serving flight operations.',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    version: '1.0.0',
    database: dbHealth,
    externalApis,
  });
};

module.exports = {
  getHealth,
};
