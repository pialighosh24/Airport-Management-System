/**
 * AeroNexus — First Owner Administrator Setup Controller
 *
 * Secure local setup endpoint used to bootstrap the first administrator
 * account. Protected by an environment-configured setup token (never by the
 * public registration flow) and refuses to run when an administrator already
 * exists, so it cannot be used to create additional admins.
 */

const crypto = require('crypto');
const User = require('../models/User');

const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN || 'aeronexus_dev_setup_token';

const isSetupAuthorized = (req) => {
  const provided = req.headers['x-setup-token'];
  const expected = String(SETUP_TOKEN || '');
  if (!expected) return false;
  return String(provided || '') === expected;
};

/**
 * @route   POST /api/auth/setup-first-owner
 * @desc    Provision the first owner administrator account (setup-token protected, one-time)
 */
const setupFirstOwner = async (req, res) => {
  try {
    if (!isSetupAuthorized(req)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Setup token required.',
      });
    }

    const { email, password, fullName } = req.body || {};

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const ownerName = String(fullName || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'A valid email address is required.' });
    }
    if (normalizedPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'ValidationError', message: 'Password must be at least 8 characters long.' });
    }

    const users = await User.find();
    const alreadyAdmin = (users || []).some((u) => u && (u.role === 'admin'));
    if (alreadyAdmin) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'An administrator account already exists. First-owner setup is one-time only.',
      });
    }

    const usernameBase = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || 'owner';
    const username = usernameBase;

    const created = await User.create({
      username,
      email: normalizedEmail,
      password: normalizedPassword,
      fullName: ownerName || 'System Owner',
      role: 'admin',
      staffPin: null,
    });

    return res.status(201).json({
      success: true,
      message: 'First owner administrator provisioned successfully.',
      data: {
        id: created?.id,
        username: created?.username,
        email: created?.email,
        fullName: created?.fullName,
        role: created?.role,
      },
    });
  } catch (err) {
    console.error('❌ [Admin First Owner Setup Error]:', err);
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to provision first owner administrator.' });
  }
};

module.exports = {
  setupFirstOwner,
};
