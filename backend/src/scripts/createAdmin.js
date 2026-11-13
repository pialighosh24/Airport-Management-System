/**
 * AeroNexus - Admin Credential Setup Utility
 *
 * Generates secure scrypt password hash and HMAC token secret
 * for server/.env configuration.
 *
 * Usage:
 *   node src/scripts/createAdmin.js [username] [password]
 * Default if omitted:
 *   username: admin
 *   password: AeroNexusAdmin2026!
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword } = require('../services/adminAuthService');

const envPath = path.resolve(__dirname, '../../.env');

const username = process.argv[2] || process.env.ADMIN_USERNAME || 'admin';
const password = process.argv[3] || 'AeroNexusAdmin2026!';

try {
  const passwordHash = hashPassword(password);
  const tokenSecret = crypto.randomBytes(32).toString('hex');

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or append ADMIN_* variables
  const updates = {
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD_HASH: passwordHash,
    ADMIN_TOKEN_SECRET: tokenSecret,
  };

  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${val}`);
    } else {
      envContent += `\n${key}=${val}`;
    }
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

  console.log('✅ Admin credentials configured successfully in server/.env:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Hash:     ${passwordHash.substring(0, 20)}...`);
  console.log(`   Secret:   [Generated ${tokenSecret.length} chars]`);
} catch (err) {
  console.error('❌ Failed to configure admin credentials:', err.message);
  process.exit(1);
}
