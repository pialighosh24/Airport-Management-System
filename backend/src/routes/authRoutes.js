const express = require('express');
const { register, login, staffLogin, getCurrentUser } = require('../controllers/authController');
const { setupFirstOwner } = require('../controllers/authSetupController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/staff-login', staffLogin);
router.post('/setup-first-owner', setupFirstOwner);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
