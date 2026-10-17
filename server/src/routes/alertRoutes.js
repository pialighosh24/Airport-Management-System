const express = require('express');
const {
  createAlertSubscription,
  getAlerts,
} = require('../controllers/alertController');

const router = express.Router();

/**
 * @route   GET /api/alerts
 * @desc    Get notification feed timeline
 */
router.get('/', getAlerts);

/**
 * @route   POST /api/alerts
 * @desc    Subscribe to flight notifications or trigger alert event
 */
router.post('/', createAlertSubscription);

module.exports = router;
