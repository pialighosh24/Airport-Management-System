const config = require('../config');
const { getDatabaseHealth } = require('../config/database');

const getHealth = (req, res) => {
  const dbHealth = getDatabaseHealth();

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
  });
};

module.exports = {
  getHealth,
};
