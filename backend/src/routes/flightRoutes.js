const express = require('express');
const { getFlights, getFlightByIdentifier, getLiveOpenSkyFlights } = require('../controllers/flightController');

const router = express.Router();

/**
 * @route   GET /api/flights
 * @desc    Get list of flights (queries MySQL when connected, falls back to demo data)
 */
router.get('/', getFlights);

/**
 * @route   GET /api/flights/live
 * @desc    Get real-time live aircraft telemetry from OpenSky Network
 */
router.get('/live', getLiveOpenSkyFlights);

/**
 * @route   GET /api/flights/:identifier
 * @desc    Get specific flight by flightNumber or callsign
 */
router.get('/:identifier', getFlightByIdentifier);

module.exports = router;
