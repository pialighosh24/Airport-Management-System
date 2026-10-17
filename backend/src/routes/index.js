const express = require('express');
const healthRoutes = require('./healthRoutes');
const flightRoutes = require('./flightRoutes');
const airportRoutes = require('./airportRoutes');
const fareRoutes = require('./fareRoutes');
const weatherRoutes = require('./weatherRoutes');
const opsRoutes = require('./opsRoutes');
const alertRoutes = require('./alertRoutes');

const router = express.Router();

// Mount all feature routes under /api
router.use('/', healthRoutes);           // /api/health
router.use('/flights', flightRoutes);    // /api/flights & /api/flights/live
router.use('/airports', airportRoutes);  // /api/airports & /api/airports/master
router.use('/fares', fareRoutes);        // /api/fares & /api/fares/exchange-rates
router.use('/weather', weatherRoutes);    // /api/weather
router.use('/ops', opsRoutes);            // /api/ops
router.use('/alerts', alertRoutes);      // /api/alerts

module.exports = router;
