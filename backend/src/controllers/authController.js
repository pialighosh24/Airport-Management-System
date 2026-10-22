const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (passenger or staff)
 */
async function register(req, res) {
  try {
    const { username, email, password, fullName, role = 'passenger', staffPin } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Username, email, password, and full name are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'A user with this email address already exists.',
      });
    }

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'ConflictError',
        message: 'A user with this username already exists.',
      });
    }

    const createdUser = await User.create({
      username,
      email,
      password,
      fullName,
      role: role === 'staff' ? 'staff' : 'passenger',
      staffPin: role === 'staff' ? (staffPin || '7700') : null,
    });

    const token = User.generateToken(createdUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        fullName: createdUser.fullName,
        role: createdUser.role,
        staffPin: createdUser.staffPin,
      },
    });
  } catch (err) {
    console.error('❌ [Auth Register Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to complete registration.',
    });
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Standard login with email/username and password
 */
async function login(req, res) {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = identifier || email || username;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Email/username and password are required.',
      });
    }

    let user = null;
    if (loginId.includes('@')) {
      user = await User.findByEmail(loginId);
    } else {
      user = await User.findByUsername(loginId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid email/username or password.',
      });
    }

    const isMatch = User.verifyPassword(password, user);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid email/username or password.',
      });
    }

    const token = User.generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name || user.fullName,
        role: user.role,
        staffPin: user.staff_pin || user.staffPin,
      },
    });
  } catch (err) {
    console.error('❌ [Auth Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Authentication failed.',
    });
  }
}

/**
 * @route   POST /api/auth/staff-login
 * @desc    Quick PIN login or credentials login for airport/ops staff
 */
async function staffLogin(req, res) {
  try {
    const { pin, email, password } = req.body;

    if (pin) {
      // Find user by staff PIN
      const user = await User.findByStaffPin(String(pin).trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid Staff PIN. Demo PINs: 7700 or 1234.',
        });
      }

      const token = User.generateToken(user);
      return res.status(200).json({
        success: true,
        message: 'Staff operations portal access granted.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name || user.fullName,
          role: user.role,
          staffPin: user.staff_pin || user.staffPin,
        },
      });
    }

    // Otherwise email + password staff login
    if (email && password) {
      const user = await User.findByEmail(email);
      if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Account does not have staff or administrator privileges.',
        });
      }

      const isMatch = User.verifyPassword(password, user);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials.',
        });
      }

      const token = User.generateToken(user);
      return res.status(200).json({
        success: true,
        message: 'Staff authentication successful.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name || user.fullName,
          role: user.role,
          staffPin: user.staff_pin || user.staffPin,
        },
      });
    }

    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Provide either a 4-digit staff PIN or staff email/password.',
    });
  } catch (err) {
    console.error('❌ [Staff Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to authenticate staff user.',
    });
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 */
async function getCurrentUser(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Not authenticated.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'User record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name || user.fullName,
        role: user.role,
        staffPin: user.staff_pin || user.staffPin,
      },
    });
  } catch (err) {
    console.error('❌ [Get Current User Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve user profile.',
    });
  }
}

module.exports = {
  register,
  login,
  staffLogin,
  getCurrentUser,
};
