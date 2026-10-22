const express = require('express');
const { register, login, staffLogin, getCurrentUser } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/staff-login', staffLogin);
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
