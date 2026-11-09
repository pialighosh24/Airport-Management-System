const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');
const User = require('../../backend/src/models/User');

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

describe('AeroNexus Backend Security Hardening - Phase 2', () => {
  describe('Unauthenticated write protection', () => {
    it('should reject POST /api/disruptions without authentication', async () => {
      const res = await request(app)
        .post('/api/disruptions')
        .send({ flightNumber: 'AA100', summary: 'Security hardening verification' });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject PATCH /api/disruptions/:id without authentication', async () => {
      const res = await request(app)
        .patch('/api/disruptions/disp-001')
        .send({ status: 'resolved' });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject POST /api/alerts/trigger-simulation without authentication', async () => {
      const res = await request(app)
        .post('/api/alerts/trigger-simulation')
        .send({ flightNumber: 'AA100', type: 'delay' });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject PATCH /api/alerts/notifications/:id/read without authentication', async () => {
      const res = await request(app).patch('/api/alerts/notifications/notif-1/read');

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject POST /api/alerts/watchlist without authentication', async () => {
      const res = await request(app)
        .post('/api/alerts/watchlist')
        .send({ flightNumber: 'AA100' });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject POST /api/ground-operations without authentication', async () => {
      const res = await request(app)
        .post('/api/ground-operations')
        .send({ flightNumber: 'AA100', type: 'turnaround', status: 'pending' });

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Admin-only protection', () => {
    it('should return 401 for admin stats without token', async () => {
      const res = await request(app).get('/api/admin/stats');
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('should return 403 for staff token on admin-only stats', async () => {
      const staffToken = User.generateToken({
        id: 1,
        email: 'staff@aeronexus.com',
        username: 'staff_ops',
        role: 'staff',
        fullName: 'Duty Manager',
      });
      const res = await request(app).get('/api/admin/stats').set(bearer(staffToken));
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should return 200 for admin token on admin stats', async () => {
      const adminToken = User.generateToken({
        id: 3,
        email: 'admin@aeronexus.com',
        username: 'admin_lead',
        role: 'admin',
        fullName: 'AeroNexus System Admin',
      });
      const res = await request(app).get('/api/admin/stats').set(bearer(adminToken));
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('Authentication token validation', () => {
    it('should return 401 for an invalid bearer token', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', 'Bearer invalid.token.value');

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Authorized staff operations still work', () => {
    it('should allow staff to create a disruption', async () => {
      const staffToken = User.generateToken({
        id: 1,
        email: 'staff@aeronexus.com',
        username: 'staff_ops',
        role: 'staff',
        fullName: 'Duty Manager',
      });
      const res = await request(app)
        .post('/api/disruptions')
        .set(bearer(staffToken))
        .send({ flightNumber: 'AA100', summary: 'Security hardening verification disruption' });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
    });
  });

  describe('User-scoped private resource access', () => {
    it('should return 403 when a passenger tries to mark another flight notification read', async () => {
      const passengerToken = User.generateToken({
        id: 2,
        email: 'demo@aeronexus.com',
        username: 'demo_passenger',
        role: 'passenger',
        fullName: 'Alex Rivera',
      });

      const res = await request(app)
        .patch('/api/alerts/notifications/notif-1/read')
        .set(bearer(passengerToken));

      // notif-1 belongs to EK202, which is not in the passenger watchlist -> forbidden
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('Authentication responses must not leak staff credentials', () => {
    it('should not include staffPin or password material in login response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ identifier: 'staff@aeronexus.com', password: 'staff123' });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(!('staffPin' in (res.body.user || {})), 'staffPin must not be present in login response');
      assert.ok(!('passwordHash' in (res.body.user || {})), 'password hash must not be present');
      assert.ok(!('salt' in (res.body.user || {})), 'salt must not be present');
      assert.strictEqual(res.body.user.role, 'staff');
      assert.ok(res.body.user.email);
    });
  });

  describe('First-owner setup security remains intact', () => {
    it('should reject first-owner setup without setup token', async () => {
      const res = await request(app)
        .post('/api/auth/setup-first-owner')
        .send({ email: 'owner-security-test@example.com', password: 'StrongPass123', fullName: 'Security Test Owner' });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('should reject first-owner setup with invalid setup token', async () => {
      const res = await request(app)
        .post('/api/auth/setup-first-owner')
        .set('X-Setup-Token', 'definitely_wrong_setup_token')
        .send({ email: 'owner-security-test@example.com', password: 'StrongPass123', fullName: 'Security Test Owner' });

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
    });
  });
});
