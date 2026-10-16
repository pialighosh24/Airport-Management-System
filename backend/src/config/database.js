const mysql = require('mysql2/promise');
const config = require('./index');

/**
 * MySQL 8.0 Connection & Pooling Module
 * 
 * Implements:
 * - Connection pooling via mysql2/promise (connection reuse, limits, queuing)
 * - Safe error handling: never crashes if database is unreachable or credentials are missing
 * - Seamless Demo Fallback Mode when MySQL is unavailable
 * - Credential privacy: database passwords are NEVER printed or exposed in logs or errors
 */

let pool = null;

let connectionState = {
  isConnected: false,
  mode: 'demo_fallback',
  state: 'disconnected',
  message: 'Database not initialized',
  databaseName: null,
  host: null,
};

/**
 * Sanitizes error messages to guarantee passwords/secrets are never printed
 */
function sanitizeErrorMessage(msg) {
  if (!msg) return 'Unknown database error';
  return String(msg)
    .replace(/(password|pwd)=['"]?[^'"\s]+['"]?/gi, '$1=***')
    .replace(/using password: (YES|NO)/gi, 'using password: [configured]');
}

/**
 * Initialize connection pool and verify connection
 */
async function connectDB() {
  const isConfigured = Boolean(config.db && config.db.host && config.db.user);

  if (!isConfigured) {
    connectionState = {
      isConnected: false,
      mode: 'demo_fallback',
      state: 'disconnected',
      message: 'MySQL configuration missing. Running in Standalone Demo Mode.',
      databaseName: null,
      host: null,
    };
    console.log('ℹ️  [Database] MySQL not configured. Running in Standalone Demo Fallback Mode.');
    return connectionState;
  }

  try {
    // Create connection pool with connection pooling and timeouts
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      connectTimeout: 4000, // 4-second timeout prevents hanging on connection issues
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });

    // Test the connection pool with a ping
    const connection = await pool.getConnection();
    try {
      await connection.ping();
    } finally {
      connection.release();
    }

    connectionState = {
      isConnected: true,
      mode: 'mysql',
      state: 'connected',
      host: `${config.db.host}:${config.db.port}`,
      databaseName: config.db.database,
      message: `Live MySQL 8.0 database connected (${config.db.host}:${config.db.port}/${config.db.database})`,
    };

    console.log(`🐬 [Database] MySQL connected successfully! (${config.db.host}:${config.db.port}/${config.db.database})`);
    return connectionState;
  } catch (err) {
    const safeError = sanitizeErrorMessage(err.message);

    connectionState = {
      isConnected: false,
      mode: 'demo_fallback',
      state: 'error',
      host: `${config.db.host}:${config.db.port}`,
      databaseName: config.db.database,
      error: safeError,
      message: `MySQL connection unavailable (${safeError}). Running in Demo Fallback Mode.`,
    };

    console.warn(`⚠️  [Database] MySQL connection unavailable (${safeError}).`);
    console.warn('ℹ️  [Database] Gracefully falling back to in-memory Demo Data Mode.');
    return connectionState;
  }
}

/**
 * Returns current database health status for the /api/health endpoint
 */
function getDatabaseHealth() {
  const isConfigured = Boolean(config.db && config.db.host && config.db.user);
  const isConnected = Boolean(connectionState.isConnected && pool);

  return {
    configured: isConfigured,
    connected: isConnected,
    state: isConnected ? 'connected' : connectionState.state || 'disconnected',
    mode: isConnected ? 'mysql' : 'demo_fallback',
    message: isConnected
      ? `Live MySQL 8.0 connected (${connectionState.host}/${connectionState.databaseName})`
      : `Demo data fallback active (${connectionState.message || 'MySQL not connected'})`,
  };
}

/**
 * Helper to check if MySQL connection is currently live
 */
function isDatabaseConnected() {
  return Boolean(connectionState.isConnected && pool);
}

/**
 * Access the active MySQL connection pool
 */
function getPool() {
  return pool;
}

/**
 * Gracefully close the connection pool
 */
async function closeDB() {
  if (pool) {
    try {
      await pool.end();
      connectionState.isConnected = false;
      connectionState.state = 'disconnected';
      console.log('🐬 [Database] MySQL connection pool closed.');
    } catch (err) {
      console.warn('⚠️  [Database] Error closing MySQL pool:', sanitizeErrorMessage(err.message));
    }
  }
}

module.exports = {
  connectDB,
  getDatabaseHealth,
  isDatabaseConnected,
  getPool,
  closeDB,
};
