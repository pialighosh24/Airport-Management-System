/**
 * Airport Controller
 * 
 * Provides airport timetable schedules (arrivals & departures) and METAR weather.
 */

const { DEMO_AIRPORTS, DEMO_DISCLAIMER } = require('../data/demoData');
const { searchAirports } = require('../services/airportService');

const VALID_TYPES = ['all', 'departure', 'arrival'];

const searchAirportsHandler = async (req, res) => {
  const rawSearch = req.query.search !== undefined ? req.query.search : req.query.q;

  if (rawSearch === undefined || rawSearch === null) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Query parameter "search" is required. Example: /api/airports?search=CCU',
    });
  }

  if (typeof rawSearch !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Search query must be a string.',
    });
  }

  const query = rawSearch.trim();
  if (query.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Search query cannot be empty or contain only whitespace.',
    });
  }

  if (query.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Search query exceeds maximum allowed length of 100 characters.',
    });
  }

  let limit = 20;
  if (req.query.limit !== undefined) {
    const parsedLimit = parseInt(req.query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Query parameter "limit" must be an integer between 1 and 100.',
      });
    }
    limit = parsedLimit;
  }

  try {
    const result = await searchAirports(query, { limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error(`❌ [Airport Search API Error]: ${err.message}`);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      });
    }

    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'GatewayTimeout',
        message: 'Airport search request timed out while contacting FreeAirportDB. Please try again.',
      });
    }

    return res.status(502).json({
      success: false,
      error: 'BadGateway',
      message: `Failed to fetch airport data from FreeAirportDB: ${err.message}`,
    });
  }
};

const getAirportSchedule = (req, res) => {
  const { code } = req.params;
  const { type = 'all' } = req.query;

  if (!code || code.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Airport code is required.',
    });
  }

  const normalizedType = type.toLowerCase().trim();
  if (!VALID_TYPES.includes(normalizedType)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid type filter '${type}'. Allowed values: ${VALID_TYPES.join(', ')}.`,
      allowedValues: VALID_TYPES,
    });
  }

  const airportKey = code.trim().toUpperCase();
  const airportData = DEMO_AIRPORTS[airportKey];

  if (!airportData) {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Demo timetable for airport '${code}' is not currently available in Phase 2 demo data.`,
      availableAirports: Object.keys(DEMO_AIRPORTS),
    });
  }

  let departures = [];
  let arrivals = [];

  if (normalizedType === 'all' || normalizedType === 'departure') {
    departures = airportData.departures || [];
  }

  if (normalizedType === 'all' || normalizedType === 'arrival') {
    arrivals = airportData.arrivals || [];
  }

  res.status(200).json({
    success: true,
    isDemo: true,
    disclaimer: DEMO_DISCLAIMER,
    airport: {
      iata: airportData.iata,
      icao: airportData.icao,
      name: airportData.name,
      city: airportData.city,
      country: airportData.country,
      metar: airportData.metar,
    },
    filterType: normalizedType,
    summary: {
      departuresCount: (airportData.departures || []).length,
      arrivalsCount: (airportData.arrivals || []).length,
      totalFlights: (airportData.departures || []).length + (airportData.arrivals || []).length,
    },
    departures,
    arrivals,
  });
};

module.exports = {
  searchAirportsHandler,
  getAirportSchedule,
};
