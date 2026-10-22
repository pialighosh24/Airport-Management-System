/**
 * AeroNexus Server Bridge
 * Forwards requests to the unified /backend application.
 */

const app = require('../backend/server');
const config = require('../backend/src/config');
const { connectDB, closeDB } = require('../backend/src/config/database');

if (require.main === module) {
  connectDB();

  const server = app.listen(config.port, () => {
    console.log('====================================================');
    console.log(`✈️  AeroNexus Backend Server running on port ${config.port}`);
    console.log(`📡  Base URL: http://localhost:${config.port}`);
    console.log('====================================================');
  });

  const shutdown = async () => {
    await closeDB();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
