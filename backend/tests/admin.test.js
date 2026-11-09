const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

describe('AeroNexus Admin API Tests', () => {
  let adminToken = '';

  it('POST /api/admin/login should return 400 when missing credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({});

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'ValidationError');
  });

  it('POST /api/admin/login should return 401 for incorrect password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'WrongPassword123!' });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error, 'InvalidCredentials');
  });

  it('POST /api/admin/login should return 200 and signed token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'AeroNexusAdmin2026!' });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.token === 'string', 'Token must be a string');
    assert.ok(res.body.token.includes('.'), 'Token must be signed JWT-like structure');
    assert.strictEqual(res.body.role, 'admin');

    adminToken = res.body.token;
  });

  it('GET /api/admin/me should return 401 without Bearer token', async () => {
    const res = await request(app).get('/api/admin/me');

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  it('GET /api/admin/me should return 200 with admin identity when token provided', async () => {
    const res = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.admin.username, 'admin');
    assert.strictEqual(res.body.admin.role, 'admin');
  });

  it('GET /api/admin/dashboard should return system metrics and honest user status', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.system, 'Must include system section');
    assert.ok(res.body.metrics, 'Must include metrics section');
    assert.strictEqual(typeof res.body.metrics.flights.total, 'number');
    assert.strictEqual(typeof res.body.metrics.airports.total, 'number');
    // Verifying honest reporting of non-existent user management
    assert.strictEqual(res.body.metrics.users.available, false);
    assert.strictEqual(res.body.metrics.users.total, 0);
  });

  it('GET /api/admin/integrations should return 5 providers with verified status', async () => {
    const res = await request(app)
      .get('/api/admin/integrations')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.results));
    assert.strictEqual(res.body.results.length, 5);

    const ids = res.body.results.map((r) => r.id);
    assert.ok(ids.includes('amadeus'));
    assert.ok(ids.includes('open-meteo'));
    assert.ok(ids.includes('flightaware'));
    assert.ok(ids.includes('opensky'));
    assert.ok(ids.includes('freeairportdb'));

    for (const p of res.body.results) {
      assert.ok(['connected', 'unavailable', 'not_configured', 'unknown'].includes(p.status));
    }
  });

  it('GET /api/notices (Public) should return active notices without auth', async () => {
    const res = await request(app).get('/api/notices');

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('CRUD on /api/admin/notices should add, update, and delete notice', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'AIRSPACE ADVISORY',
        title: 'Runway Maintenance Notice',
        message: 'Scheduled surface maintenance at DEL runway 28.',
        priority: 'high',
        active: true,
      });

    assert.strictEqual(createRes.statusCode, 201);
    assert.strictEqual(createRes.body.success, true);
    const newId = createRes.body.data.id;
    assert.ok(newId);

    // 2. Update
    const updateRes = await request(app)
      .put(`/api/admin/notices/${newId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Runway Maintenance Completed',
      });

    assert.strictEqual(updateRes.statusCode, 200);
    assert.strictEqual(updateRes.body.data.title, 'Runway Maintenance Completed');

    // 3. Delete
    const deleteRes = await request(app)
      .delete(`/api/admin/notices/${newId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(deleteRes.statusCode, 200);
    assert.strictEqual(deleteRes.body.success, true);
  });

  it('GET /api/admin/audit should return persistent admin activity logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data[0].action);
  });

  it('GET /api/admin/logs should return system operational logs', async () => {
    const res = await request(app)
      .get('/api/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET and PUT /api/admin/config should inspect and safely update system settings', async () => {
    const getRes = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.success, true);
    assert.strictEqual(typeof getRes.body.data.pollingIntervalSeconds, 'number');

    const putRes = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pollingIntervalSeconds: 45,
      });

    assert.strictEqual(putRes.statusCode, 200);
    assert.strictEqual(putRes.body.data.pollingIntervalSeconds, 45);
  });

  it('GET /api/admin/database should return database diagnostics and latency telemetry', async () => {
    const res = await request(app)
      .get('/api/admin/database')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.diagnostics);
  });

  it('GET /api/admin/airlines should return derived airline carriers from flight schedules', async () => {
    const res = await request(app)
      .get('/api/admin/airlines')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some(a => a.code === 'AI' || a.code === '6E'));
  });

  it('GET /api/admin/users should return admin identity and honest end-user availability', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.users));
    assert.strictEqual(typeof res.body.endUsers.available, 'boolean');
    assert.ok(Array.isArray(res.body.endUsers.records));
    if (!res.body.endUsers.available) {
      assert.strictEqual(res.body.endUsers.total, null);
      assert.ok(res.body.endUsers.reason);
    }
    res.body.endUsers.records.forEach((u) => {
      assert.strictEqual(u.password_hash, undefined);
      assert.strictEqual(u.staff_pin, undefined);
    });
  });

  it('Ground operations endpoints require admin auth', async () => {
    const res = await request(app).get('/api/admin/ground-operations');
    assert.strictEqual(res.statusCode, 401);
    const patch = await request(app).patch('/api/admin/ground-operations/ground_demo_1').send({ status: 'completed' });
    assert.strictEqual(patch.statusCode, 401);
  });

  it('GET/POST/PATCH /api/admin/ground-operations should list, create, update and validate tasks', async () => {
    const auth = { Authorization: `Bearer ${adminToken}` };

    const list = await request(app).get('/api/admin/ground-operations').set(auth);
    assert.strictEqual(list.statusCode, 200);
    assert.ok(Array.isArray(list.body.data));
    assert.ok(list.body.data.some((t) => t.isDemo === true), 'seeded tasks must be flagged as demo');

    const created = await request(app)
      .post('/api/admin/ground-operations')
      .set(auth)
      .send({ flightNumber: 'ai202', type: 'gate_assistance', notes: 'Admin test task' });
    assert.strictEqual(created.statusCode, 201);
    assert.strictEqual(created.body.data.flightNumber, 'AI202');
    assert.strictEqual(created.body.data.status, 'pending');

    const updated = await request(app)
      .patch(`/api/admin/ground-operations/${created.body.data.id}`)
      .set(auth)
      .send({ status: 'completed' });
    assert.strictEqual(updated.statusCode, 200);
    assert.strictEqual(updated.body.data.status, 'completed');

    const invalid = await request(app)
      .patch(`/api/admin/ground-operations/${created.body.data.id}`)
      .set(auth)
      .send({ status: 'bogus' });
    assert.strictEqual(invalid.statusCode, 400);

    const missing = await request(app).patch('/api/admin/ground-operations/nope').set(auth).send({ status: 'pending' });
    assert.strictEqual(missing.statusCode, 404);
  });
});

