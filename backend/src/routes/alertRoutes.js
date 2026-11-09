const express = require('express');
const {
  getAlerts,
  saveToWatchlist,
  removeFromWatchlist,
  triggerSimulation,
  markNotificationRead,
} = require('../controllers/alertController');
const { authenticateToken, requireStaff, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getAlerts);
router.post('/watchlist', authenticateToken, saveToWatchlist);
router.delete('/watchlist/:flightNumber', authenticateToken, removeFromWatchlist);
router.post('/trigger-simulation', authenticateToken, requireStaff, triggerSimulation);
router.patch('/notifications/:id/read', authenticateToken, markNotificationRead);

module.exports = router;
