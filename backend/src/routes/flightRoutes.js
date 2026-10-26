const express = require('express');
const {
  getFlights,
  getFlightByIdentifier,
  getLiveOpenSkyFlights,
} = require('../controllers/flightController');
const { getFlightOffers } = require('../controllers/amadeusController');
const { getFlightStatus: getFlightStatusHandler } = require('../controllers/flightAwareController');

const router = express.Router();

router.get('/live', getLiveOpenSkyFlights);
router.get('/search', getFlightOffers);
router.get('/status/:identifier', getFlightStatusHandler);
router.get('/', getFlights);
router.get('/:identifier', getFlightByIdentifier);

module.exports = router;
