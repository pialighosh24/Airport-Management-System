const express = require('express');
const { getWeather } = require('../controllers/weatherController');

const router = express.Router();

/**
 * @route   GET /api/weather
 * @desc    Get current weather conditions and short-range forecast from Open-Meteo
 * @query   latitude  (required) Latitude
 * @query   longitude (required) Longitude
 * @query   forecastDays (optional) 1-7, default 2
 * @query   refresh (optional) true/false, default false (uses server cache)
 */
router.get('/', getWeather);

module.exports = router;
