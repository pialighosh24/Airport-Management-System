const { describe, it } = require('node:test');
const assert = require('node:assert');
const User = require('../src/models/User');

describe('User Authentication & Role System', () => {
  it('should find demo staff user by PIN', async () => {
    const staff = await User.findByStaffPin('7700');
    assert.ok(staff, 'Staff user should be found by PIN 7700');
    assert.strictEqual(staff.role, 'staff');
  });

  it('should verify staff password correctly', async () => {
    const staff = await User.findByEmail('staff@aeronexus.com');
    assert.ok(staff);
    const valid = User.verifyPassword('staff123', staff);
    assert.strictEqual(valid, true, 'staff123 should be verified');
    const invalid = User.verifyPassword('wrongpass', staff);
    assert.strictEqual(invalid, false, 'wrongpass should fail');
  });

  it('should generate and verify JWT token', () => {
    const dummyUser = { id: 99, email: 'test@example.com', username: 'testuser', role: 'passenger' };
    const token = User.generateToken(dummyUser);
    assert.ok(typeof token === 'string' && token.split('.').length === 3);

    const payload = User.verifyToken(token);
    assert.ok(payload);
    assert.strictEqual(payload.email, 'test@example.com');
    assert.strictEqual(payload.role, 'passenger');
  });
});
