const Alert = require('../models/Alert');

/**
 * @route   GET /api/alerts
 * @desc    Get user's watchlist and live notification feed
 */
async function getAlerts(req, res) {
  try {
    const email = req.query.email || (req.user ? req.user.email : null);
    const watchlist = await Alert.getWatchlist(email);
    const notifications = await Alert.getNotifications();

    return res.status(200).json({
      success: true,
      watchlist,
      notifications,
    });
  } catch (err) {
    console.error('❌ [Alerts GET Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to retrieve flight alerts.',
    });
  }
}

/**
 * @route   POST /api/alerts/watchlist
 * @desc    Save flight to watchlist
 */
async function saveToWatchlist(req, res) {
  try {
    const { flightNumber, email, alertOnGateChange, alertOnBoarding, delayThresholdMins } = req.body;
    const userEmail = email || (req.user ? req.user.email : 'guest@aeronexus.com');

    if (!flightNumber) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight number is required.',
      });
    }

    const updatedWatchlist = await Alert.saveToWatchlist({
      email: userEmail,
      flightNumber,
      alertOnGateChange,
      alertOnBoarding,
      delayThresholdMins,
    });

    return res.status(200).json({
      success: true,
      message: `Flight ${flightNumber.toUpperCase()} added to watchlist.`,
      watchlist: updatedWatchlist,
    });
  } catch (err) {
    console.error('❌ [Watchlist POST Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to save flight to watchlist.',
    });
  }
}

/**
 * @route   DELETE /api/alerts/watchlist/:flightNumber
 * @desc    Remove flight from watchlist
 */
async function removeFromWatchlist(req, res) {
  try {
    const { flightNumber } = req.params;
    const userEmail = req.query.email || (req.user ? req.user.email : 'guest@aeronexus.com');

    const updatedWatchlist = await Alert.removeFromWatchlist({
      email: userEmail,
      flightNumber,
    });

    return res.status(200).json({
      success: true,
      message: `Flight ${flightNumber.toUpperCase()} removed from watchlist.`,
      watchlist: updatedWatchlist,
    });
  } catch (err) {
    console.error('❌ [Watchlist DELETE Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to remove flight from watchlist.',
    });
  }
}

/**
 * @route   POST /api/alerts/trigger-simulation
 * @desc    Simulate triggering a real-time flight alert event (delay, gate change, or boarding)
 */
async function triggerSimulation(req, res) {
  try {
    const { flightNumber, type } = req.body;

    if (!flightNumber || !type) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Flight number and notification type are required.',
      });
    }

    const alertTitles = {
      delay: `Flight ${flightNumber} Delayed (+35 mins)`,
      gate_change: `Gate Assigned: Gate B${Math.floor(10 + Math.random() * 20)}`,
      boarding: `Flight ${flightNumber} Boarding Now`,
    };

    const alertMessages = {
      delay: `Flight ${flightNumber} is currently delayed due to air traffic spacing. Revised departure in 35 minutes.`,
      gate_change: `Gate confirmed for ${flightNumber}. Please proceed to terminal departure concourse.`,
      boarding: `Final call for boarding flight ${flightNumber}. Have boarding pass ready at gate.`,
    };

    const title = alertTitles[type] || `Alert for ${flightNumber}`;
    const message = alertMessages[type] || `Status update received for flight ${flightNumber}.`;

    const newNotification = await Alert.createNotification({
      flightNumber,
      type,
      title,
      message,
    });

    return res.status(201).json({
      success: true,
      message: 'Simulated alert triggered successfully.',
      notification: newNotification,
    });
  } catch (err) {
    console.error('❌ [Alert Simulation Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to trigger simulated alert.',
    });
  }
}

/**
 * @route   PATCH /api/alerts/notifications/:id/read
 * @desc    Mark a notification as read
 */
async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    await Alert.markNotificationRead(id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    console.error('❌ [Alert Mark Read Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Failed to update notification state.',
    });
  }
}

module.exports = {
  getAlerts,
  saveToWatchlist,
  removeFromWatchlist,
  triggerSimulation,
  markNotificationRead,
};
