const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

// Patch the FlightAware service before the Express app loads its controllers,
// so the controller uses in-memory deterministic behaviour instead of live calls.
const servicePath = require.resolve('../../backend/src/services/flightAwareService');
require(servicePath);
let currentResult = null;
let currentThrow = null;
require.cache[servicePath].exports.getFlightStatus = async () => {
  if (currentThrow) throw currentThrow;
  return currentResult;
};

const app = require('../server');

describe('FlightAware Flight Status API - HTTP Error Handling', () => {
  it('returns 200 with success true for a successful provider response', async () => {
    currentResult = {
      success: true,
      source: 'FLIGHTAWARE',
      providerName: 'FlightAware AeroAPI',
      flightIdentifier: 'AI101',
      flight: { status: 'active' },
      retrievedAtUtc: new Date().toISOString(),
      disclaimer: 'Flight status information via FlightAware AeroAPI.',
    };

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.source, 'FLIGHTAWARE');
    assert.strictEqual(res.body.providerName, 'FlightAware AeroAPI');
    assert.strictEqual(res.body.flightIdentifier, 'AI101');
    assert.deepStrictEqual(res.body.flight, { status: 'active' });
    assert.ok(res.body.retrievedAtUtc);
    assert.ok(res.body.disclaimer);
  });

  it('returns 502 Bad Gateway — not HTTP 200 — when provider returns unsuccessful result', async () => {
    currentResult = {
      success: false,
      source: 'FLIGHTAWARE',
      error: 'FlightAwareProviderError',
      message: 'FlightAware provider returned an unsuccessful result.',
    };

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.source, 'FLIGHTAWARE');
    assert.strictEqual(res.body.error, 'FlightAwareProviderError');
    assert.ok(res.body.message);
  });

  it('returns 502 Bad Gateway when the provider request fails', async () => {
    currentThrow = Object.assign(new Error('FlightAware flight status request failed (HTTP 500).'), { name: 'ExternalApiError' });

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'BadGateway');
  });

  it('returns 504 Gateway Timeout when the provider times out', async () => {
    currentThrow = Object.assign(new Error('FlightAware flight status service timed out.'), { name: 'TimeoutError' });

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 504);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'GatewayTimeout');
  });

  it('returns 503 Service Unavailable when the provider is not configured', async () => {
    currentThrow = Object.assign(new Error('FlightAware AeroAPI is not configured. Set FLIGHTAWARE_API_KEY to enable flight status lookups.'), { name: 'FlightAwareNotConfiguredError' });

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'FlightAwareNotConfigured');
  });

  it('retains consistent JSON error structure for unsuccessful provider result', async () => {
    currentResult = {
      success: false,
      source: 'FLIGHTAWARE',
      error: 'FlightAwareProviderError',
      message: 'FlightAware provider returned an unsuccessful result.',
    };
    currentThrow = null;

    const res = await request(app).get('/api/flights/status/AI101');

    assert.strictEqual(res.statusCode, 502);
    assert.ok(res.body.success === false);
    assert.ok(res.body.source);
    assert.ok(res.body.error);
    assert.ok(res.body.message);
  });

  it('does not expose credentials or sensitive provider details in error responses', async () => {
    currentResult = {
      success: false,
      source: 'FLIGHTAWARE',
      error: 'FlightAwareProviderError',
      message: 'FlightAware provider returned an unsuccessful result.',
    };

    const res = await request(app).get('/api/flights/status/AI101');
    const raw = JSON.stringify(res.body);

    assert.ok(!raw.includes('apiKey'));
    assert.ok(!raw.includes('Authorization'));
    assert.ok(!raw.includes('clientSecret'));
  });
});
