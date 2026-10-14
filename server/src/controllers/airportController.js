/**
 * Airport Controller (Demo Mode)
 * 
 * Provides airport timetable schedules (arrivals & departures) and METAR weather.
 */

const { DEMO_AIRPORTS, DEMO_DISCLAIMER } = require('../data/demoData');
const { searchAirports } = require('../services/airportService');

const VALID_TYPES = ['all', 'departure', 'arrival'];

/**
 * @route   GET /api/airports
 * @desc    Search airports by IATA/ICAO code or name via FreeAirportDB
 * @query   search: Search query (e.g. 'CCU', 'JFK', 'Heathrow')
 * @query   q (optional): Search query alias
 * @query   limit (optional): Maximum results to return (default 20, max 100)
 */
const searchAirportsHandler = async (req, res) => {
  const rawSearch = req.query.search !== undefined ? req.query.search : req.query.q;

  // 1. Validate query existence
  if (rawSearch === undefined || rawSearch === null) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Query parameter "search" is required. Example: /api/airports?search=CCU',
    });
  }

  // 2. Validate string and non-empty after trimming
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

  // 3. Length validation
  if (query.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Search query exceeds maximum allowed length of 100 characters.',
    });
  }

  // 4. Optional limit parameter validation
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

/**
 * @route   GET /api/airports/:code/schedule
 * @desc    Get arrivals and departures for a specific airport hub
 * @param   code: 3-letter IATA code (e.g. JFK, LHR, DXB)
 * @query   type (optional): 'all' | 'departure' | 'arrival'
 */
const getAirportSchedule = (req, res) => {
  const { code } = req.params;
  const { type = 'all' } = req.query;

  // 1. Validate IATA code format (must be exactly 3 alphabetical letters)
  if (!code || !/^[a-zA-Z]{3}$/.test(code.trim())) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid airport code '${code}'. Airport code must be a 3-letter IATA format (e.g., JFK, LHR).`,
    });
  }

  // 2. Validate type filter if provided
  const normalizedType = type.toLowerCase().trim();
  if (!VALID_TYPES.includes(normalizedType)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid schedule type '${type}'. Allowed values: ${VALID_TYPES.join(', ')}.`,
      allowedValues: VALID_TYPES,
    });
  }

  // 3. Find airport in demo registry
  const iataUpper = code.trim().toUpperCase();
  const airport = DEMO_AIRPORTS[iataUpper];

  if (!airport) {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Demo timetable for airport '${iataUpper}' was not found.`,
      availableDemoAirports: Object.keys(DEMO_AIRPORTS),
    });
  }

  // 4. Filter arrivals/departures according to requested type
  const departures = normalizedType === 'arrival' ? [] : airport.departures;
  const arrivals = normalizedType === 'departure' ? [] : airport.arrivals;

  res.status(200).json({
    success: true,
    isDemo: true,
    disclaimer: DEMO_DISCLAIMER,
    airport: {
      iata: airport.iata,
      icao: airport.icao,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      metar: airport.metar,
    },
    filterType: normalizedType,
    summary: {
      departuresCount: departures.length,
      arrivalsCount: arrivals.length,
      totalFlights: departures.length + arrivals.length,
    },
    departures,
    arrivals,
  });
};

module.exports = {
  getAirportSchedule,
  searchAirportsHandler,
};

