const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

describe('AeroNexus Backend API - Phase 2 Health Check Tests', () => {
  it('GET /api/health should return 200 OK with AeroNexus service information', async () => {
    const res = await request(app).get('/api/health');

    assert.strictEqual(res.statusCode, 200, 'Status code should be 200');
    assert.strictEqual(res.headers['content-type'].includes('application/json'), true, 'Content-Type should be JSON');
    assert.strictEqual(res.body.success, true, 'success field should be true');
    assert.strictEqual(
      res.body.service,
      'AeroNexus — Smart Flight Tracking Backend',
      'service name should identify as AeroNexus'
    );
    assert.strictEqual(res.body.status, 'online', 'status should be online');
    assert.ok(res.body.timestamp, 'timestamp field should exist');
    assert.ok(typeof res.body.uptimeSeconds === 'number', 'uptimeSeconds should be a number');

    // Phase 4: Database Health Status Verification
    assert.ok(res.body.database, 'database field should exist in health response');
    assert.strictEqual(typeof res.body.database.connected, 'boolean', 'database.connected must be boolean');
    assert.strictEqual(typeof res.body.database.configured, 'boolean', 'database.configured must be boolean');
    assert.ok(
      ['mysql', 'demo_fallback'].includes(res.body.database.mode),
      'database.mode must be mysql or demo_fallback'
    );
    assert.ok(typeof res.body.database.message === 'string', 'database.message must be string');
  });

  it('GET / should return 200 with root service info and health-check link', async () => {
    const res = await request(app).get('/');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'online');
    assert.strictEqual(res.body.healthCheck, '/api/health');
  });

  it('GET /api/unknown-endpoint should return 404 with structured JSON error', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'NotFoundError');
  });
});
