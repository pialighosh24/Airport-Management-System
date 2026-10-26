require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigins: process.env.CLIENT_ORIGINS
    ? process.env.CLIENT_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:8082'],
  jwt: {
    secret: process.env.JWT_SECRET || 'aeronexus_default_dev_secret_key_change_in_prod_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aeronexus',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  },
  openSky: {
    username: process.env.OPENSKY_USERNAME || null,
    password: process.env.OPENSKY_PASSWORD || null,
  },
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID || null,
    clientSecret: process.env.AMADEUS_CLIENT_SECRET || null,
    baseUrl: process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com',
  },
  flightAware: {
    apiKey: process.env.FLIGHTAWARE_API_KEY || null,
    baseUrl: process.env.FLIGHTAWARE_BASE_URL || 'https://aeroapi.flightaware.com/aeroapi',
  },
};
