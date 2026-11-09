const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

// Deterministic external provider configuration for health endpoint tests.
process.env.FLIGHTAWARE_API_KEY = 'health_test_flightaware_key';
process.env.OPENSKY_USERNAME = 'health_test_opensky_user';
// AMADEUS_CLIENT_ID intentionally left unset so Amadeus is reported as not configured.

// Deterministic database health for health endpoint tests (no real MySQL access).
const databasePath = require.resolve('../../backend/src/config/database');
require(databasePath);
let dbHealthOverride = null;
let dbHealthOverrideError = null;
const DEFAULT_DB_HEALTH = {
  configured: false,
  connected: false,
  state: 'disconnected',
  mode: 'demo_fallback',
  message: 'Demo data fallback active (MySQL not connected). Running in Demo Fallback Mode.',
};
require.cache[databasePath].exports.getDatabaseHealth = () => {
  if (dbHealthOverrideError) throw dbHealthOverrideError;
  return dbHealthOverride || DEFAULT_DB_HEALTH;
};

const app = require('../server');

const MYSQL_DB_HEALTH = {
  configured: true,
  connected: true,
  state: 'connected',
  mode: 'mysql',
  message: 'Live MySQL 8.0 database connected (127.0.0.1:3306/aeronexus)',
};

const DISCONNECTED_DB_HEALTH = {
  configured: true,
  connected: false,
  state: 'error',
  mode: 'demo_fallback',
  message: 'MySQL connection unavailable (Access denied). Running in Demo Fallback Mode.',
};

describe('AeroNexus Backend API - Health Check', () => {
  describe('GET /api/health', () => {
    it('returns 200 OK with the required backward-compatible top-level fields', async () => {
      dbHealthOverride = { ...DEFAULT_DB_HEALTH };
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'].includes('application/json'), true, 'Content-Type should be JSON');
      assert.strictEqual(res.body.success, true, 'success field should be true');
      assert.strictEqual(res.body.service, 'AeroNexus — Smart Flight Tracking Backend');
      assert.ok(['healthy', 'degraded', 'unhealthy'].includes(res.body.status), 'status should be a valid health state');
      assert.ok(res.body.message, 'message field should exist');
      assert.ok(res.body.timestamp, 'timestamp field should exist');
      assert.ok(typeof res.body.uptimeSeconds === 'number', 'uptimeSeconds should be a number');
      assert.ok(res.body.environment, 'environment field should exist');
      assert.strictEqual(res.body.version, '1.0.0');
      assert.ok(res.body.liveness, 'liveness field should exist');
      assert.ok(res.body.readiness, 'readiness field should exist');
      assert.ok(res.body.database, 'database field should exist');
      assert.ok(res.body.externalApis, 'externalApis field should exist');
    });

    it('reports healthy when MySQL is connected', async () => {
      dbHealthOverride = { ...MYSQL_DB_HEALTH };
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'healthy');
      assert.strictEqual(res.body.liveness.status, 'alive');
      assert.strictEqual(res.body.readiness.status, 'ready');
      assert.strictEqual(res.body.database.connected, true);
      assert.strictEqual(res.body.database.mode, 'mysql');
    });

    it('reports degraded when the backend operates with demo fallback', async () => {
      dbHealthOverride = { ...DEFAULT_DB_HEALTH };
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.readiness.status, 'degraded');
      assert.strictEqual(res.body.database.mode, 'demo_fallback');
      assert.strictEqual(res.body.database.connected, false);
      assert.ok(res.body.database.message.includes('Demo data fallback active'));
    });

    it('reports degraded - not falsely healthy - when MySQL is configured but disconnected', async () => {
      dbHealthOverride = { ...DISCONNECTED_DB_HEALTH };
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'degraded');
      assert.strictEqual(res.body.readiness.status, 'degraded');
      assert.strictEqual(res.body.database.configured, true);
      assert.strictEqual(res.body.database.connected, false);
      assert.strictEqual(res.body.database.mode, 'demo_fallback');
    });

    it('returns a 200 liveness payload without database or external API dependency', async () => {
      const res = await request(app).get('/api/health/liveness');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'].includes('application/json'), true, 'Content-Type should be JSON');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'alive');
      assert.ok(res.body.timestamp);
      assert.ok(typeof res.body.uptimeSeconds === 'number');
    });

    it('does not call external APIs while computing health', async () => {
      const originalFetch = globalThis.fetch;
      let fetchCalls = 0;
      globalThis.fetch = async () => {
        fetchCalls += 1;
        throw new Error('Health endpoint must not call external providers.');
      };

      try {
        const res = await request(app).get('/api/health');
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(fetchCalls, 0, 'Health endpoint must not perform external API calls');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('reports external provider configuration states without claiming reachability', async () => {
      dbHealthOverride = { ...DEFAULT_DB_HEALTH };
      const res = await request(app).get('/api/health');
      const apis = res.body.externalApis;
      assert.ok(apis.openSky);
      assert.ok(apis.openMeteo);
      assert.ok(apis.openErApi);
      assert.ok(apis.amadeus);
      assert.ok(apis.flightAware);

      // Providers with credentials configured are marked configured (reachability intentionally unknown).
      assert.strictEqual(apis.openSky.status, 'configured');
      assert.strictEqual(apis.openSky.authConfigured, true);
      assert.strictEqual(apis.amadeus.status, 'not_configured');
      assert.strictEqual(apis.amadeus.authConfigured, false);
      assert.strictEqual(apis.flightAware.status, 'configured');
      assert.strictEqual(apis.flightAware.authConfigured, true);

      // Public providers need no credentials.
      assert.strictEqual(apis.openMeteo.status, 'public');
      assert.strictEqual(apis.openMeteo.authConfigured, false);
      assert.strictEqual(apis.openErApi.status, 'public');
      assert.strictEqual(apis.openErApi.authConfigured, false);

      // No provider may be reported as reachable/unavailable without a live check.
      for (const key of Object.keys(apis)) {
        assert.ok(
          !['reachable', 'unavailable', 'down'].includes(String(apis[key].status)),
          `Provider ${key} must not be labelled reachable/unavailable without live checks`
        );
      }
    });
  });

  describe('GET /api/health error handling', () => {
    it('returns a safe error response when health calculation fails', async () => {
      dbHealthOverrideError = new Error('Database health check exploded.');
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ServiceUnavailable');
      assert.ok(res.body.message);
      assert.ok(!JSON.stringify(res.body).includes('Database health check exploded'), 'Raw error details must not be exposed');
      dbHealthOverrideError = null;
    });

    it('does not expose secrets or raw error details in error responses', async () => {
      dbHealthOverrideError = new Error('MySQL connection failed with password=supersecretvalue');
      const res = await request(app).get('/api/health');
      const raw = JSON.stringify(res.body);

      assert.ok(!raw.includes('supersecretvalue'), 'Secret values must not appear in health error responses');
      assert.ok(!raw.includes('password='), 'Raw credential material must not appear in health error responses');
      assert.ok(!raw.includes('apiKey'), 'API key material must not appear in health error responses');
      assert.ok(!raw.includes('clientSecret'), 'Client secret material must not appear in health error responses');
      dbHealthOverrideError = null;
    });
  });

  describe('GET /', () => {
    it('should return 200 with root service info and health-check link', async () => {
      const res = await request(app).get('/');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.status, 'online');
      assert.strictEqual(res.body.healthCheck, '/api/health');
    });
  });

  describe('GET /api/unknown-endpoint', () => {
    it('should return 404 with structured JSON error', async () => {
      const res = await request(app).get('/api/unknown-endpoint');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFound');
    });
  });
});
