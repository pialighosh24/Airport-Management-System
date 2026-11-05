const express = require('express');
const { getWeather } = require('../controllers/weatherController');

const router = express.Router();

/**
 * @route   GET /api/weather
 * @desc    Get real-time meteorological data near coordinates or airport from Open-Meteo
 */
router.get('/', getWeather);

module.exports = router;
