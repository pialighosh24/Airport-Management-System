const express = require('express');
const healthRoutes = require('./healthRoutes');
const flightRoutes = require('./flightRoutes');
const airportRoutes = require('./airportRoutes');
const fareRoutes = require('./fareRoutes');

const router = express.Router();

// Mount all feature routes under /api
router.use('/', healthRoutes);           // /api/health
router.use('/flights', flightRoutes);    // /api/flights
router.use('/airports', airportRoutes);  // /api/airports/:code/schedule
router.use('/fares', fareRoutes);        // /api/fares

module.exports = router;
