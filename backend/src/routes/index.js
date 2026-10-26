const express = require('express');
const authRoutes = require('./authRoutes');
const flightRoutes = require('./flightRoutes');
const airportRoutes = require('./airportRoutes');
const fareRoutes = require('./fareRoutes');
const disruptionRoutes = require('./disruptionRoutes');
const alertRoutes = require('./alertRoutes');
const healthRoutes = require('./healthRoutes');
const weatherRoutes = require('./weatherRoutes');
const currencyRoutes = require('./currencyRoutes');
const groundOperationsRoutes = require('./groundOperationsRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/flights', flightRoutes);
router.use('/airports', airportRoutes);
router.use('/fares', fareRoutes);
router.use('/disruptions', disruptionRoutes);
router.use('/alerts', alertRoutes);
router.use('/health', healthRoutes);
router.use('/weather', weatherRoutes);
router.use('/currency', currencyRoutes);
router.use('/ground-operations', groundOperationsRoutes);

module.exports = router;
