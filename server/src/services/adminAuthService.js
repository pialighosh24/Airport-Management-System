/**
 * Admin Authentication Service
 *
 * Server-side credential verification and signed session tokens for the
 * AeroNexus Admin Panel. Uses only Node's built-in `crypto` module.
 *
 * Security model:
 * - Credentials are NEVER hardcoded. They are read from environment variables:
 *     ADMIN_USERNAME        Admin login name
 *     ADMIN_PASSWORD_HASH   scrypt hash in the format  scrypt$<saltHex>$<hashHex>
 *     ADMIN_TOKEN_SECRET    Random secret (>= 32 chars) used to sign session tokens
 *   Generate them with:  npm run admin:create   (inside server/)
 * - If any variable is missing, admin login is disabled (HTTP 503).
 * - Tokens are HMAC-SHA256 signed, expire (default 120 minutes), and are
 *   verified on every protected request by the requireAdmin middleware.
 * - All comparisons use crypto.timingSafeEqual.
 */

const crypto = require('crypto');

const SCRYPT_KEY_LENGTH = 64;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_TOKEN_TTL_MINUTES = 120;

function getAdminConfig() {
  const ttl = parseInt(process.env.ADMIN_TOKEN_TTL_MINUTES, 10);
  return {
    username: (process.env.ADMIN_USERNAME || '').trim(),
    passwordHash: (process.env.ADMIN_PASSWORD_HASH || '').trim(),
    tokenSecret: process.env.ADMIN_TOKEN_SECRET || '',
    tokenTtlMinutes: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TOKEN_TTL_MINUTES,
  };
}

/**
 * Returns true only when all admin environment variables are present and valid.
 */
function isAdminConfigured() {
  const { username, passwordHash, tokenSecret } = getAdminConfig();
  return Boolean(
    username &&
      passwordHash.startsWith('scrypt$') &&
      passwordHash.split('$').length === 3 &&
      tokenSecret.length >= MIN_SECRET_LENGTH
  );
}

/**
 * Creates a scrypt password hash string: scrypt$<saltHex>$<hashHex>
 */
function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function safeStringEqual(a, b) {
  // Hash both sides first so lengths always match for timingSafeEqual
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Verifies admin credentials against environment configuration.
 */
function verifyCredentials(username, password) {
  if (!isAdminConfigured()) return false;
  const config = getAdminConfig();
  const userOk = safeStringEqual((username || '').trim(), config.username);
  // Always run password verification to keep timing consistent
  const passOk = verifyPassword(password || '', config.passwordHash);
  return userOk && passOk;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/**
 * Issues a signed, expiring admin session token.
 */
function issueToken(username) {
  const { tokenSecret, tokenTtlMinutes } = getAdminConfig();
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: username,
    role: 'admin',
    iat: issuedAt,
    exp: issuedAt + tokenTtlMinutes * 60,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return {
    token: `${payloadB64}.${sign(payloadB64, tokenSecret)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    username,
    role: 'admin',
  };
}

/**
 * Verifies a token. Returns the decoded payload, or null when invalid/expired.
 */
function verifyToken(token) {
  if (!isAdminConfigured() || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const { tokenSecret, username } = getAdminConfig();
  const expected = sign(payloadB64, tokenSecret);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.role !== 'admin') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
    // Token becomes invalid if the configured admin username changes
    if (payload.sub !== username) return null;
    return payload;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// Simple in-memory login throttling (per client IP)
// ----------------------------------------------------
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map();

function getLockoutRemainingSeconds(clientKey) {
  const entry = failedAttempts.get(clientKey);
  if (!entry) return 0;
  const elapsed = Date.now() - entry.firstFailureAt;
  if (elapsed > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(clientKey);
    return 0;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS ? Math.ceil((LOCKOUT_WINDOW_MS - elapsed) / 1000) : 0;
}

function recordFailedAttempt(clientKey) {
  const entry = failedAttempts.get(clientKey);
  if (!entry || Date.now() - entry.firstFailureAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(clientKey, { count: 1, firstFailureAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(clientKey) {
  failedAttempts.delete(clientKey);
}

function resetLoginThrottle() {
  failedAttempts.clear();
}

module.exports = {
  isAdminConfigured,
  hashPassword,
  verifyPassword,
  verifyCredentials,
  issueToken,
  verifyToken,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  clearFailedAttempts,
  resetLoginThrottle,
  MIN_SECRET_LENGTH,
};
