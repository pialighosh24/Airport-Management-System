const express = require('express');
const { searchAirportsHandler, getAirportSchedule } = require('../controllers/airportController');

const router = express.Router();

router.get('/', searchAirportsHandler);
router.get('/:code/schedule', getAirportSchedule);

module.exports = router;
