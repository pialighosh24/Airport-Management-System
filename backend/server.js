/**
 * AeroNexus — Smart Flight Tracking & Airport Operations Backend Server
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

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root Greeting Route
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'AeroNexus — Smart Flight Tracking & Operations Backend',
    version: '1.0.0',
    healthCheck: '/api/health',
    status: 'online',
    endpoints: {
      auth: '/api/auth (login, register, staff-login, me)',
      flights: '/api/flights',
      liveTelemetry: '/api/flights/live',
      airports: '/api/airports?search=...',
      fares: '/api/fares',
      disruptions: '/api/disruptions',
      alerts: '/api/alerts',
    },
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Fallback Handlers
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  connectDB();

  const server = app.listen(config.port, () => {
    console.log('====================================================');
    console.log(`✈️  AeroNexus Backend Server running on port ${config.port}`);
    console.log(`📡  Base URL:        http://localhost:${config.port}`);
    console.log(`🩺  Health Check:    http://localhost:${config.port}/api/health`);
    console.log(`🔐  Auth APIs:       http://localhost:${config.port}/api/auth`);
    console.log(`🛫  Flights API:     http://localhost:${config.port}/api/flights`);
    console.log(`🚨  Disruptions API: http://localhost:${config.port}/api/disruptions`);
    console.log(`🔔  Alerts API:      http://localhost:${config.port}/api/alerts`);
    console.log(`🏷️  Fares API:       http://localhost:${config.port}/api/fares`);
    console.log(`🏢  Airports API:    http://localhost:${config.port}/api/airports?search=CCU`);
    console.log('====================================================');
  });

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

module.exports = app;
