const express = require('express');
const {
  getAdminStats,
  getAdminFlights,
  updateAdminFlightStatus,
  getAdminDisruptions,
  updateAdminDisruptionStatus,
  getAdminUsers,
  getAdminMonitoring,
  updateAdminUserRole,
  createAdminFlight,
  updateAdminFlight,
  deleteAdminFlight,
} = require('../controllers/adminController');
const {
  getAdminNotices,
  createAdminNotice,
  updateAdminNotice,
  deleteAdminNotice,
} = require('../controllers/noticeController');
const { getAdminAuditLogs } = require('../controllers/adminAuditController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Every Admin Panel endpoint requires a valid Bearer token AND administrator role.
router.use(authenticateToken, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/flights', getAdminFlights);
router.post('/flights', createAdminFlight);
router.put('/flights/:identifier', updateAdminFlight);
router.delete('/flights/:identifier', deleteAdminFlight);
router.patch('/flights/:identifier/status', updateAdminFlightStatus);
router.get('/disruptions', getAdminDisruptions);
router.patch('/disruptions/:id', updateAdminDisruptionStatus);
router.get('/notices', getAdminNotices);
router.post('/notices', createAdminNotice);
router.put('/notices/:id', updateAdminNotice);
router.delete('/notices/:id', deleteAdminNotice);
router.get('/users', getAdminUsers);
router.patch('/users/:id/role', updateAdminUserRole);
router.get('/monitoring', getAdminMonitoring);
router.get('/audit-logs', getAdminAuditLogs);

module.exports = router;
