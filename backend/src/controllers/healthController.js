/**
 * Health Controller
 * 
 * Handles service status verification.
 * Confirms that the AeroNexus backend is running and operational.
 */

const { getDatabaseHealth } = require('../config/database');

const getHealthStatus = (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const databaseHealth = getDatabaseHealth();

  res.status(200).json({
    success: true,
    service: 'AeroNexus — Smart Flight Tracking Backend',
    status: 'online',
    message: 'AeroNexus API server is running and healthy.',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    database: databaseHealth,
  });
};

module.exports = {
  getHealthStatus,
};
