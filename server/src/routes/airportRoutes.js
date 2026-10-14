const express = require('express');
const { getAirportSchedule, searchAirportsHandler } = require('../controllers/airportController');

const router = express.Router();

/**
 * @route   GET /api/airports
 * @desc    Search airports by IATA/ICAO code or airport name via FreeAirportDB
 * @query   search (or q): airport code or name (e.g. CCU, Heathrow, JFK)
 * @query   limit (optional): maximum results to return (1-100)
 */
router.get('/', searchAirportsHandler);

/**
 * @route   GET /api/airports/:code/schedule
 * @desc    Get arrivals and departures timetable for an airport
 */
router.get('/:code/schedule', getAirportSchedule);

module.exports = router;

