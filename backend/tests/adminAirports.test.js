const { describe, it } = require('node:test');
const assert = require('node:assert');

const databasePath = require.resolve('../src/config/database');
require(databasePath);
let dbConnected = true;
require.cache[databasePath].exports.isDatabaseConnected = () => dbConnected;
require.cache[databasePath].exports.getPool = () => null;
require.cache[databasePath].exports.getDatabaseHealth = () => ({ connected: true });

const adminController = require('../src/controllers/adminController');
const Airport = require('../src/models/Airport');

function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('AeroNexus Admin Airport Controller (Final Release Readiness)', () => {
  describe('GET /api/admin/airports', () => {
    it('returns 200 with success, count and data for a connected database', async () => {
      Airport.find = async () => [{ code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA', kind: 'airport' }];

      const res = createRes();
      await adminController.getAdminAirports({ query: {} }, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.count, 1);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].code, 'DEN');
    });

    it('returns 503 when the database is unavailable', async () => {
      dbConnected = false;

      const res = createRes();
      await adminController.getAdminAirports({ query: {} }, res);

      assert.strictEqual(res.statusCode, 503);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'DatabaseUnavailable');

      dbConnected = true;
    });
  });

  describe('POST /api/admin/airports', () => {
    it('creates a valid airport and returns 201', async () => {
      Airport.create = async () => ({ code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA', kind: 'airport' });

      const res = createRes();
      await adminController.createAdminAirport(
        { body: { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA' }, user: { username: 'admin' } },
        res
      );

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.code, 'DEN');
    });

    it('returns 400 when the code or name is missing', async () => {
      const res = createRes();
      await adminController.createAdminAirport({ body: { name: 'X' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.strictEqual(res.body.message, 'Airport code and name are required.');
    });

    it('returns 400 for an invalid airport code', async () => {
      const res = createRes();
      await adminController.createAdminAirport({ body: { code: 'DENV', name: 'X' } }, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('Invalid airport code'));
    });
  });

  describe('PUT /api/admin/airports/:id', () => {
    it('updates an existing airport and returns 200', async () => {
      Airport.update = async () => ({ code: 'DEN', name: 'Denver International', city: 'Denver', country: 'USA', kind: 'airport' });

      const res = createRes();
      await adminController.updateAdminAirport({ params: { id: 'DEN' }, body: { name: 'Denver Intl' } }, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.code, 'DEN');
    });

    it('returns 404 when the airport is not found', async () => {
      Airport.update = async () => null;

      const res = createRes();
      await adminController.updateAdminAirport({ params: { id: 'ZZZ' }, body: { name: 'Nope' } }, res);

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
      assert.strictEqual(res.body.message, 'Airport \'ZZZ\' was not found.');
    });
  });

  describe('DELETE /api/admin/airports/:id', () => {
    it('deletes an existing airport and returns 200', async () => {
      Airport.delete = async () => ({ deletedCount: 1 });

      const res = createRes();
      await adminController.deleteAdminAirport({ params: { id: 'DEN' } }, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.deletedCount, 1);
    });

    it('returns 404 when the airport is not found', async () => {
      Airport.delete = async () => ({ deletedCount: 0 });

      const res = createRes();
      await adminController.deleteAdminAirport({ params: { id: 'ZZZ' } }, res);

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
    });
  });
});
