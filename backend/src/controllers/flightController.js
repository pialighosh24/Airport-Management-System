/**
 * Flight Controller (MySQL 8.0 & Demo Fallback Mode)
 * 
 * Provides simulated flight telemetry data adhering to:
 * "Unknown stays unknown. Never invent flight information or display stale data as current."
 */

const { isDatabaseConnected } = require('../config/database');
const Flight = require('../models/Flight');
const { DEMO_FLIGHTS, DEMO_DISCLAIMER } = require('../data/demoData');
const { getLiveAircraftStates } = require('../services/openSkyService');

const VALID_STATUSES = ['valid', 'stale', 'missing', 'unavailable'];

/**
 * @route   GET /api/flights
 * @desc    Get list of flights with optional filters (queries MySQL when connected, falls back to demo data)
 */
const getFlights = async (req, res) => {
  const { status, origin, destination } = req.query;

  if (status && !VALID_STATUSES.includes(status.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid status filter '${status}'. Allowed values: ${VALID_STATUSES.join(', ')}.`,
      allowedValues: VALID_STATUSES,
    });
  }

  const isDbConnected = isDatabaseConnected();

  if (isDbConnected) {
    try {
      const totalDocs = await Flight.countDocuments({});
      if (totalDocs > 0) {
        const query = {};
        if (status) {
          query['freshness.status'] = status.toLowerCase();
        }
        if (origin) {
          query['origin.iata'] = origin.trim().toUpperCase();
        }
        if (destination) {
          query['destination.iata'] = destination.trim().toUpperCase();
        }

        const dbFlights = await Flight.find(query);

        return res.status(200).json({
          success: true,
          isDemo: dbFlights.every((f) => f.isDemo !== false),
          disclaimer: DEMO_DISCLAIMER,
          count: dbFlights.length,
          filtersApplied: {
            status: status ? status.toLowerCase() : null,
            origin: origin ? origin.toUpperCase() : null,
            destination: destination ? destination.toUpperCase() : null,
          },
          data: dbFlights,
        });
      }
    } catch (err) {
      console.warn(`⚠️  [Flights API] MySQL query failed (${err.message}). Falling back to demo data.`);
    }
  }

  // Demo Fallback Mode
  let results = [...DEMO_FLIGHTS];

  if (status) {
    results = results.filter(
      (f) => f.freshness.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (origin) {
    results = results.filter(
      (f) => f.origin.iata.toUpperCase() === origin.trim().toUpperCase()
    );
  }

  if (destination) {
    results = results.filter(
      (f) => f.destination.iata.toUpperCase() === destination.trim().toUpperCase()
    );
  }

  res.status(200).json({
    success: true,
    isDemo: true,
    disclaimer: DEMO_DISCLAIMER,
    count: results.length,
    filtersApplied: {
      status: status ? status.toLowerCase() : null,
      origin: origin ? origin.toUpperCase() : null,
      destination: destination ? destination.toUpperCase() : null,
    },
    data: results,
  });
};

/**
 * @route   GET /api/flights/:identifier
 * @desc    Get single flight by flight number (e.g. AA100) or callsign (e.g. AAL100)
 */
const getFlightByIdentifier = async (req, res) => {
  const { identifier } = req.params;

  if (!identifier || identifier.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Flight identifier is required.',
    });
  }

  const query = identifier.trim().toUpperCase();
  const isDbConnected = isDatabaseConnected();

  if (isDbConnected) {
    try {
      const totalDocs = await Flight.countDocuments({});
      if (totalDocs > 0) {
        const flightDoc = await Flight.findOne({
          $or: [{ flightNumber: query }, { callsign: query }],
        });

        if (flightDoc) {
          return res.status(200).json({
            success: true,
            isDemo: flightDoc.isDemo !== false,
            disclaimer: flightDoc.disclaimer || DEMO_DISCLAIMER,
            data: flightDoc,
          });
        }

        const availableFlightNumbers = await Flight.getAvailableFlightNumbers(10);
        return res.status(404).json({
          success: false,
          error: 'NotFoundError',
          message: `Flight with identifier '${identifier}' was not found.`,
          availableDemoFlights: availableFlightNumbers,
        });
      }
    } catch (err) {
      console.warn(`⚠️  [Flights API] MySQL lookup failed (${err.message}). Falling back to demo data.`);
    }
  }

  // Demo Fallback Mode
  const flight = DEMO_FLIGHTS.find(
    (f) => f.flightNumber.toUpperCase() === query || f.callsign.toUpperCase() === query
  );

  if (!flight) {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Demo flight with identifier '${identifier}' was not found.`,
      availableDemoFlights: DEMO_FLIGHTS.map((f) => f.flightNumber),
    });
  }

  res.status(200).json({
    success: true,
    isDemo: true,
    disclaimer: DEMO_DISCLAIMER,
    data: flight,
  });
};

/**
 * @route   GET /api/flights/live
 * @desc    Get real-time aircraft telemetry from OpenSky Network
 */
const getLiveOpenSkyFlights = async (req, res) => {
  try {
    const { preset, limit } = req.query;
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 40, 5), 100) : 40;

    const result = await getLiveAircraftStates({
      preset: preset || 'europe',
      limit: parsedLimit,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error(`❌ [OpenSky API Error]: ${err.message}`);
    return res.status(503).json({
      success: false,
      isDemo: false,
      isLive: false,
      error: 'OpenSkyServiceUnavailable',
      message: err.message || 'Unable to retrieve live OpenSky telemetry at this time.',
      advice: 'Wait 10 seconds before retrying to respect OpenSky rate limits, or switch to Demo Fleet mode.',
    });
  }
};

module.exports = {
  getFlights,
  getFlightByIdentifier,
  getLiveOpenSkyFlights,
};
