function notFound(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `Resource not found on AeroNexus backend: [${req.method}] ${req.originalUrl}`,
    availableEndpoints: {
      health: 'GET /api/health',
      flights: 'GET /api/flights',
      liveTelemetry: 'GET /api/flights/live',
      airports: 'GET /api/airports?search=...',
      fares: 'GET /api/fares',
      auth: 'POST /api/auth/login, POST /api/auth/staff-login',
      disruptions: 'GET /api/disruptions',
      alerts: 'GET /api/alerts',
    },
  });
}

module.exports = notFound;
