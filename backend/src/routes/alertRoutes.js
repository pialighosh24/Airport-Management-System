const express = require('express');
const {
  getAlerts,
  saveToWatchlist,
  removeFromWatchlist,
  triggerSimulation,
  markNotificationRead,
} = require('../controllers/alertController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getAlerts);
router.post('/watchlist', optionalAuth, saveToWatchlist);
router.delete('/watchlist/:flightNumber', optionalAuth, removeFromWatchlist);
router.post('/trigger-simulation', triggerSimulation);
router.patch('/notifications/:id/read', markNotificationRead);

module.exports = router;
