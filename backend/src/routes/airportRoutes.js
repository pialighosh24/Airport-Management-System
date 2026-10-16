const express = require('express');
const {
  getAirportSchedule,
  searchAirportsHandler,
  getAirportHubsHandler,
  getAirportByCodeHandler,
  getAirportWeatherHandler,
} = require('../controllers/airportController');

const router = express.Router();

/**
 * @route   GET /api/airports
 * @desc    Search airports by IATA/ICAO code or airport name via FreeAirportDB
 * @query   search (or q): airport code or name (e.g. CCU, Heathrow, JFK)
 * @query   limit (optional): maximum results to return (1-100)
 */
router.get('/', searchAirportsHandler);

/**
 * @route   GET /api/airports/hubs
 * @desc    Get curated list of major domestic and international airport hubs
 */
router.get('/hubs', getAirportHubsHandler);

/**
 * @route   GET /api/airports/:code/schedule
 * @desc    Get arrivals and departures timetable for an airport hub
 */
router.get('/:code/schedule', getAirportSchedule);

/**
 * @route   GET /api/airports/:code/weather
 * @desc    Get real-time Open-Meteo weather for an airport
 */
router.get('/:code/weather', getAirportWeatherHandler);

/**
 * @route   GET /api/airports/:code
 * @desc    Get single airport details by 3-letter IATA or 4-letter ICAO code
 */
router.get('/:code', getAirportByCodeHandler);

module.exports = router;
