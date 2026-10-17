/**
 * Alert & Notification Controller
 * 
 * Manages traveller notification subscriptions, delay alert thresholds,
 * quiet hours filtering, and alert event dispatches.
 */

// In-memory alert subscriptions & notification log
const subscriptions = new Map();

let notificationTimeline = [
  {
    id: 'notif-1',
    flightNumber: 'EK202',
    type: 'delay',
    title: 'Flight EK202 Departure Delayed',
    message: 'Estimated departure moved from 19:30 to 20:10 UTC (+40 mins). Baggage loading turnaround in progress.',
    timestampUtc: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    flightNumber: 'BA178',
    type: 'gate_change',
    title: 'Gate Assigned: Gate 1',
    message: 'Flight BA178 boarding gate confirmed at JFK Terminal 7, Gate 1.',
    timestampUtc: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    read: true,
  },
];

/**
 * Check if current UTC time falls within a user's quiet hours window
 */
function isWithinQuietHours(quietHoursStart, quietHoursEnd) {
  if (!quietHoursStart || !quietHoursEnd) return false;

  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const [startH, startM] = quietHoursStart.split(':').map(Number);
  const [endH, endM] = quietHoursEnd.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (startTotal <= endTotal) {
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  }
  // Crosses midnight (e.g. 22:00 to 07:00)
  return currentMinutes >= startTotal || currentMinutes <= endTotal;
}

/**
 * @route   POST /api/alerts
 * @desc    Subscribe to flight notifications or trigger an alert event
 */
const createAlertSubscription = (req, res) => {
  const {
    flightNumber,
    email = 'traveller@aeronexus.aero',
    delayThresholdMins = 15,
    alertOnGateChange = true,
    alertOnBoarding = true,
    quietHoursStart,
    quietHoursEnd,
    type,
    message,
  } = req.body;

  if (!flightNumber) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'flightNumber is required.',
    });
  }

  const cleanFlight = flightNumber.trim().toUpperCase();

  // If this is an alert notification dispatch (e.g. simulated or webhook)
  if (type && message) {
    const isQuiet = isWithinQuietHours(quietHoursStart, quietHoursEnd);
    const newNotif = {
      id: `notif-${Date.now()}`,
      flightNumber: cleanFlight,
      type,
      title: `${type.toUpperCase().replace('_', ' ')}: ${cleanFlight}`,
      message,
      timestampUtc: new Date().toISOString(),
      read: false,
      suppressedByQuietHours: isQuiet,
    };

    notificationTimeline.unshift(newNotif);

    return res.status(201).json({
      success: true,
      message: isQuiet
        ? 'Alert logged but suppressed from push notification due to active Quiet Hours.'
        : 'Alert notification dispatched successfully.',
      data: newNotif,
    });
  }

  // Otherwise store subscription preference
  const sub = {
    flightNumber: cleanFlight,
    email,
    delayThresholdMins: Number(delayThresholdMins) || 15,
    alertOnGateChange: Boolean(alertOnGateChange),
    alertOnBoarding: Boolean(alertOnBoarding),
    quietHoursStart: quietHoursStart || null,
    quietHoursEnd: quietHoursEnd || null,
    subscribedAtUtc: new Date().toISOString(),
  };

  subscriptions.set(`${cleanFlight}-${email}`, sub);

  res.status(201).json({
    success: true,
    message: `Alert subscription confirmed for flight ${cleanFlight}.`,
    data: sub,
  });
};

/**
 * @route   GET /api/alerts
 * @desc    Get notification history timeline
 */
const getAlerts = (req, res) => {
  const { flightNumber } = req.query;

  let list = [...notificationTimeline];
  if (flightNumber) {
    list = list.filter(
      (n) => n.flightNumber.toUpperCase() === flightNumber.trim().toUpperCase()
    );
  }

  res.status(200).json({
    success: true,
    count: list.length,
    data: list,
  });
};

module.exports = {
  createAlertSubscription,
  getAlerts,
  isWithinQuietHours,
};
