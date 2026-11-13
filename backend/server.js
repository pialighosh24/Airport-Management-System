/**
 * AeroNexus — Smart Flight Tracking Backend Server
 * 
 * Central Node.js + Express.js application entry point.
 */

const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const { connectDB, closeDB } = require('./src/config/database');
const apiRoutes = require('./src/routes');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

// Initialize the Express application
const app = express();

// ----------------------------------------------------
// 1. Cross-Origin Resource Sharing (CORS) Configuration
// ----------------------------------------------------
// Allows local Expo web preview, emulator, and mobile clients
// to communicate with this backend without browser blocking.
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // If client origin matches allowed list or in development mode, allow
    if (config.nodeEnv === 'development' || config.clientOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked request from origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
};

app.use(cors(corsOptions));

// ----------------------------------------------------
// 2. Request Body Parsers
// ----------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// 3. Root & API Routes
// ----------------------------------------------------
// Base greeting route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'AeroNexus — Smart Flight Tracking Backend',
    version: '1.0.0',
    healthCheck: '/api/health',
    status: 'online',
  });
});

// Central API mount point
app.use('/api', apiRoutes);

// ----------------------------------------------------
// 4. Fallback Error Handlers
// ----------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// ----------------------------------------------------
// 5. Server Listener
// ----------------------------------------------------
// Start listening only if executed directly (not when imported by tests)
if (require.main === module) {
  // Initialize database connection (falls back cleanly if MySQL is unreachable or unconfigured)
  connectDB();

  const server = app.listen(config.port, () => {
    console.log('====================================================');
    console.log(`✈️  AeroNexus Backend Server started successfully!`);
    console.log(`📡  Base URL:     http://localhost:${config.port}`);
    console.log(`🩺  Health Check: http://localhost:${config.port}/api/health`);
    console.log(`🛫  Flights API:  http://localhost:${config.port}/api/flights`);
    console.log(`🏢  Airports API: http://localhost:${config.port}/api/airports?search=CCU`);
    console.log(`🏷️  Fares API:    http://localhost:${config.port}/api/fares`);
    console.log(`🌍  Environment:  ${config.nodeEnv}`);
    console.log('====================================================');
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n🛑 Shutting down AeroNexus server gracefully...');
    await closeDB();
    server.close(() => {
      console.log('💤 Server process terminated.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Export app for test suites
module.exports = app;
