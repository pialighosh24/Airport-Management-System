const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  login,
  getMe,
  getDashboardOverview,
  getIntegrations,
  checkIntegrations,
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  getAirlines,
  getAuditTrail,
  getSystemLogs,
  getConfig,
  updateConfig,
  getDatabaseDiagnostics,
  getUsers,
  getGroundOperations,
  createGroundOperation,
  updateGroundOperation,
} = require('../controllers/adminController');

const router = express.Router();

// Public login route
router.post('/login', login);

// Protected routes (require valid Bearer token)
router.use(requireAdmin);

router.get('/me', getMe);
router.get('/dashboard', getDashboardOverview);
router.get('/integrations', getIntegrations);
router.post('/integrations/check', checkIntegrations);
router.get('/notices', getNotices);
router.post('/notices', createNotice);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);
router.get('/airlines', getAirlines);
router.get('/audit', getAuditTrail);
router.get('/logs', getSystemLogs);
router.get('/config', getConfig);
router.put('/config', updateConfig);
router.get('/database', getDatabaseDiagnostics);
router.get('/users', getUsers);
router.get('/ground-operations', getGroundOperations);
router.post('/ground-operations', createGroundOperation);
router.patch('/ground-operations/:id', updateGroundOperation);

module.exports = router;
