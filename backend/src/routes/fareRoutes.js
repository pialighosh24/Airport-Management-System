const express = require('express');
const { getFares } = require('../controllers/fareController');

const router = express.Router();

/**
 * @route   GET /api/fares
 * @desc    Get demo flight fares with transparent ranking criteria
 */
router.get('/', getFares);

module.exports = router;
