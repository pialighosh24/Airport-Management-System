const crypto = require('crypto');
const { getPool, isDatabaseConnected } = require('../config/database');
const config = require('../config');

// In-memory demo users for offline / zero-database environments
const DEMO_USERS = [
  {
    id: 1,
    username: 'staff_ops',
    email: 'staff@aeronexus.com',
    fullName: 'Capt. Elena Vance (Duty Manager)',
    role: 'staff',
    staffPin: '7700',
    passwordHash: hashPassword('staff123', 'aeronexus_salt_staff'),
    salt: 'aeronexus_salt_staff',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'demo_passenger',
    email: 'demo@aeronexus.com',
    fullName: 'Alex Rivera',
    role: 'passenger',
    staffPin: null,
    passwordHash: hashPassword('demo123', 'aeronexus_salt_pax'),
    salt: 'aeronexus_salt_pax',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'admin_lead',
    email: 'admin@aeronexus.com',
    fullName: 'AeroNexus System Admin',
    role: 'admin',
    staffPin: '1234',
    passwordHash: hashPassword('admin123', 'aeronexus_salt_admin'),
    salt: 'aeronexus_salt_admin',
    createdAt: new Date().toISOString(),
  },
];

let inMemoryUsers = [...DEMO_USERS];

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', config.jwt.secret)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (expectedSig !== signature) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null; // expired
    return payload;
  } catch (err) {
    return null;
  }
}

class User {
  static async findByEmail(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('⚠️ [User.findByEmail] DB query failed, falling back to in-memory:', err.message);
      }
    }
    return inMemoryUsers.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }

  static async findByUsername(username) {
    const cleanUsername = username.trim().toLowerCase();
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users WHERE LOWER(username) = ?', [cleanUsername]);
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('⚠️ [User.findByUsername] DB query failed:', err.message);
      }
    }
    return inMemoryUsers.find((u) => u.username.toLowerCase() === cleanUsername) || null;
  }

  static async findById(id) {
    const numId = parseInt(id, 10);
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT id, username, email, full_name, role, staff_pin, created_at FROM users WHERE id = ?', [numId]);
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('⚠️ [User.findById] DB query failed:', err.message);
      }
    }
    const found = inMemoryUsers.find((u) => u.id === numId);
    if (!found) return null;
    return {
      id: found.id,
      username: found.username,
      email: found.email,
      full_name: found.fullName,
      role: found.role,
      staff_pin: found.staffPin,
      created_at: found.createdAt,
    };
  }

  static async findByStaffPin(pin) {
    const cleanPin = pin.trim();
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.execute('SELECT * FROM users WHERE staff_pin = ? AND role IN ("staff", "admin")', [cleanPin]);
        if (rows.length > 0) return rows[0];
      } catch (err) {
        console.warn('⚠️ [User.findByStaffPin] DB query failed:', err.message);
      }
    }
    return inMemoryUsers.find((u) => u.staffPin === cleanPin) || null;
  }

  static async create({ username, email, password, fullName, role = 'passenger', staffPin = null }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [result] = await pool.execute(
          `INSERT INTO users (username, email, password_hash, full_name, role, staff_pin)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cleanUsername, cleanEmail, `${salt}:${passwordHash}`, fullName.trim(), role, staffPin]
        );
        return {
          id: result.insertId,
          username: cleanUsername,
          email: cleanEmail,
          fullName: fullName.trim(),
          role,
          staffPin,
        };
      } catch (err) {
        console.warn('⚠️ [User.create] DB insert failed, writing to in-memory store:', err.message);
      }
    }

    const newUser = {
      id: inMemoryUsers.length + 1,
      username: cleanUsername,
      email: cleanEmail,
      fullName: fullName.trim(),
      role,
      staffPin,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };
    inMemoryUsers.push(newUser);
    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      staffPin: newUser.staffPin,
    };
  }

  static verifyPassword(plainPassword, userRecord) {
    if (!userRecord) return false;
    // Check if password_hash in DB has format "salt:hash"
    if (userRecord.password_hash && userRecord.password_hash.includes(':')) {
      const [salt, expectedHash] = userRecord.password_hash.split(':');
      const actualHash = hashPassword(plainPassword, salt);
      return actualHash === expectedHash;
    }
    // Check in-memory format
    if (userRecord.salt && userRecord.passwordHash) {
      const actualHash = hashPassword(plainPassword, userRecord.salt);
      return actualHash === userRecord.passwordHash;
    }
    return false;
  }

  static generateToken(user) {
    return generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      fullName: user.full_name || user.fullName,
    });
  }

  static verifyToken(token) {
    return verifyToken(token);
  }
}

module.exports = User;
