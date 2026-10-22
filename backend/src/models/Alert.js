const { getPool, isDatabaseConnected } = require('../config/database');

const INITIAL_NOTIFICATIONS = [
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

let inMemoryNotifications = [...INITIAL_NOTIFICATIONS];
let inMemoryWatchlist = ['AA100', 'BA178', 'DL405'];

class Alert {
  static async getWatchlist(email) {
    if (isDatabaseConnected() && email) {
      try {
        const pool = getPool();
        const [rows] = await pool.execute(
          'SELECT flight_number FROM flight_alerts WHERE user_email = ? AND is_active = TRUE',
          [email.toLowerCase().trim()]
        );
        if (rows.length > 0) return rows.map((r) => r.flight_number);
      } catch (err) {
        console.warn('⚠️ [Alert.getWatchlist] DB query failed:', err.message);
      }
    }
    return inMemoryWatchlist;
  }

  static async saveToWatchlist({ email, flightNumber, alertOnGateChange = true, alertOnBoarding = true, delayThresholdMins = 15 }) {
    const cleanFlight = flightNumber.trim().toUpperCase();
    if (isDatabaseConnected() && email) {
      try {
        const pool = getPool();
        await pool.execute(
          `INSERT INTO flight_alerts (user_email, flight_number, alert_on_gate_change, alert_on_boarding, delay_threshold_mins, is_active)
           VALUES (?, ?, ?, ?, ?, TRUE)
           ON DUPLICATE KEY UPDATE is_active = TRUE, alert_on_gate_change = VALUES(alert_on_gate_change)`,
          [email.toLowerCase().trim(), cleanFlight, alertOnGateChange ? 1 : 0, alertOnBoarding ? 1 : 0, delayThresholdMins]
        );
      } catch (err) {
        console.warn('⚠️ [Alert.saveToWatchlist] DB insert failed:', err.message);
      }
    }

    if (!inMemoryWatchlist.includes(cleanFlight)) {
      inMemoryWatchlist.push(cleanFlight);
    }
    return inMemoryWatchlist;
  }

  static async removeFromWatchlist({ email, flightNumber }) {
    const cleanFlight = flightNumber.trim().toUpperCase();
    if (isDatabaseConnected() && email) {
      try {
        const pool = getPool();
        await pool.execute(
          'UPDATE flight_alerts SET is_active = FALSE WHERE user_email = ? AND flight_number = ?',
          [email.toLowerCase().trim(), cleanFlight]
        );
      } catch (err) {
        console.warn('⚠️ [Alert.removeFromWatchlist] DB update failed:', err.message);
      }
    }

    inMemoryWatchlist = inMemoryWatchlist.filter((f) => f !== cleanFlight);
    return inMemoryWatchlist;
  }

  static async getNotifications() {
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [rows] = await pool.query('SELECT * FROM notifications ORDER BY id DESC LIMIT 50');
        if (rows.length > 0) {
          return rows.map((r) => ({
            id: String(r.id),
            flightNumber: r.flight_number,
            type: r.notification_type,
            title: r.title,
            message: r.message,
            timestampUtc: r.timestamp_utc,
            read: Boolean(r.is_read),
          }));
        }
      } catch (err) {
        console.warn('⚠️ [Alert.getNotifications] DB query failed:', err.message);
      }
    }
    return inMemoryNotifications;
  }

  static async markNotificationRead(id) {
    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        await pool.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
      } catch (err) {
        console.warn('⚠️ [Alert.markNotificationRead] DB update failed:', err.message);
      }
    }

    const item = inMemoryNotifications.find((n) => String(n.id) === String(id));
    if (item) item.read = true;
    return true;
  }

  static async createNotification({ flightNumber, type, title, message }) {
    const now = new Date().toISOString();
    const id = `notif-${Date.now().toString().slice(-4)}`;

    if (isDatabaseConnected()) {
      try {
        const pool = getPool();
        const [result] = await pool.execute(
          'INSERT INTO notifications (flight_number, notification_type, title, message, is_read, timestamp_utc) VALUES (?, ?, ?, ?, FALSE, ?)',
          [flightNumber.toUpperCase(), type, title, message, now]
        );
        return {
          id: String(result.insertId),
          flightNumber: flightNumber.toUpperCase(),
          type,
          title,
          message,
          timestampUtc: now,
          read: false,
        };
      } catch (err) {
        console.warn('⚠️ [Alert.createNotification] DB insert failed:', err.message);
      }
    }

    const newNotif = {
      id,
      flightNumber: flightNumber.toUpperCase(),
      type,
      title,
      message,
      timestampUtc: now,
      read: false,
    };
    inMemoryNotifications.unshift(newNotif);
    return newNotif;
  }
}

module.exports = Alert;
