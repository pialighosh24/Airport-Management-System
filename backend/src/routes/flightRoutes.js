const express = require('express');
const {
  getFlights,
  getFlightByIdentifier,
  getLiveOpenSkyFlights,
} = require('../controllers/flightController');

const router = express.Router();

router.get('/live', getLiveOpenSkyFlights);
router.get('/', getFlights);
router.get('/:identifier', getFlightByIdentifier);

module.exports = router;
