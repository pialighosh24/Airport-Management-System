const express = require('express');
const { getHealthStatus } = require('../controllers/healthController');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint - returns service name and online status
 * @access  Public
 */
router.get('/health', getHealthStatus);

module.exports = router;
