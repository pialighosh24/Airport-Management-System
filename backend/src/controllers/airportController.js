/**
 * Airport Controller
 * 
 * Provides airport search via FreeAirportDB, hub directory, timetable schedules,
 * and live Open-Meteo meteorological data.
 */

const { DEMO_AIRPORTS, DEMO_DISCLAIMER } = require('../data/demoData');
const { searchAirports } = require('../services/airportService');
const { getWeatherForCoordinates } = require('../services/weatherService');
const flightAwareService = require('../services/flightAwareService');
const airportMasterService = require('../services/airportMasterService');


const VALID_TYPES = ['all', 'departure', 'arrival'];

const DEFAULT_HUBS = [
  {
    iata: 'CCU',
    icao: 'VECC',
    name: 'Netaji Subhash Chandra Bose International Airport',
    city: 'Kolkata',
    country: 'India',
    countryCode: 'IN',
    region: 'West Bengal',
    latitude: 22.6547,
    longitude: 88.4467,
    elevation: 5,
    elevationFt: 16,
    timezone: 'Asia/Kolkata',
    type: 'large_airport',
  },
  {
    iata: 'DEL',
    icao: 'VIDP',
    name: 'Indira Gandhi International Airport',
    city: 'Delhi',
    country: 'India',
    countryCode: 'IN',
    region: 'National Capital Territory of Delhi',
    latitude: 28.5562,
    longitude: 77.1000,
    elevation: 237,
    elevationFt: 777,
    timezone: 'Asia/Kolkata',
    type: 'large_airport',
  },
  {
    iata: 'BOM',
    icao: 'VABB',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    region: 'Maharashtra',
    latitude: 19.0896,
    longitude: 72.8656,
    elevation: 11,
    elevationFt: 37,
    timezone: 'Asia/Kolkata',
    type: 'large_airport',
  },
  {
    iata: 'BLR',
    icao: 'VOBL',
    name: 'Kempegowda International Airport',
    city: 'Bengaluru',
    country: 'India',
    countryCode: 'IN',
    region: 'Karnataka',
    latitude: 13.1986,
    longitude: 77.7066,
    elevation: 915,
    elevationFt: 3000,
    timezone: 'Asia/Kolkata',
    type: 'large_airport',
  },
  {
    iata: 'JFK',
    icao: 'KJFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    region: 'New York',
    latitude: 40.6413,
    longitude: -73.7781,
    elevation: 4,
    elevationFt: 13,
    timezone: 'America/New_York',
    type: 'large_airport',
  },
  {
    iata: 'LHR',
    icao: 'EGLL',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    region: 'England',
    latitude: 51.4700,
    longitude: -0.4543,
    elevation: 25,
    elevationFt: 83,
    timezone: 'Europe/London',
    type: 'large_airport',
  },
  {
    iata: 'DXB',
    icao: 'OMDB',
    name: 'Dubai International Airport',
    city: 'Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    region: 'Dubai',
    latitude: 25.2532,
    longitude: 55.3657,
    elevation: 19,
    elevationFt: 62,
    timezone: 'Asia/Dubai',
    type: 'large_airport',
  },
  {
    iata: 'SIN',
    icao: 'WSSS',
    name: 'Singapore Changi Airport',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    region: 'South East',
    latitude: 1.3644,
    longitude: 103.9915,
    elevation: 7,
    elevationFt: 22,
    timezone: 'Asia/Singapore',
    type: 'large_airport',
  },
  {
    iata: 'HND',
    icao: 'RJTT',
    name: 'Tokyo Haneda Airport',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    region: 'Kanto',
    latitude: 35.5494,
    longitude: 139.7798,
    elevation: 11,
    elevationFt: 35,
    timezone: 'Asia/Tokyo',
    type: 'large_airport',
  },
  {
    iata: 'FRA',
    icao: 'EDDF',
    name: 'Frankfurt Airport',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    region: 'Hesse',
    latitude: 50.0379,
    longitude: 8.5622,
    elevation: 111,
    elevationFt: 364,
    timezone: 'Europe/Berlin',
    type: 'large_airport',
  },
];

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
 * @route   GET /api/airports/hubs
 * @desc    Get curated list of major domestic and international airport hubs
 */
const getAirportHubsHandler = (req, res) => {
  return res.status(200).json({
    success: true,
    isDemo: false,
    source: 'AeroNexus Airport Hub Registry',
    count: DEFAULT_HUBS.length,
    data: DEFAULT_HUBS,
  });
};

/**
 * @route   GET /api/airports/:code
 * @desc    Get single airport details by 3-letter IATA or 4-letter ICAO code
 * @param   code: 3-letter IATA (e.g. CCU, JFK) or 4-letter ICAO (e.g. VECC, KJFK)
 */
const getAirportByCodeHandler = async (req, res) => {
  const { code } = req.params;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Airport code parameter is required.',
    });
  }

  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(cleanCode)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: `Invalid airport code '${code}'. Must be a 3-letter IATA or 4-letter ICAO code.`,
    });
  }

  // 1. Check master airport dataset first (covers major hubs and key domestic/international airports)
  const masterMatch = airportMasterService.getAirportByCode(cleanCode);
  if (masterMatch) {
    return res.status(200).json({
      success: true,
      source: 'AeroNexus Airport Master Dataset',
      data: masterMatch,
    });
  }

  // 2. Query FreeAirportDB
  try {
    const searchResult = await searchAirports(cleanCode, { limit: 5 });
    if (searchResult && searchResult.data && searchResult.data.length > 0) {
      const match =
        searchResult.data.find(
          (a) => a.iata === cleanCode || a.icao === cleanCode
        ) || searchResult.data[0];

      return res.status(200).json({
        success: true,
        source: 'FREE_AIRPORT_DB',
        data: match,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Airport with code '${cleanCode}' was not found.`,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'BadGateway',
      message: `Failed to retrieve airport data: ${err.message}`,
    });
  }
};

/**
 * @route   GET /api/airports/master
 * @desc    Get master airports registry with coordinates, timezones, and elevation
 * @query   country: optional 2-letter country code filter (e.g. 'IN', 'US')
 */
const getMasterAirportsHandler = (req, res) => {
  const { country } = req.query;
  const list = airportMasterService.getAllMasterAirports({ countryCode: country });
  return res.status(200).json({
    success: true,
    isDemo: false,
    source: 'AeroNexus Airport Master Dataset',
    count: list.length,
    data: list,
  });
};

/**
 * @route   GET /api/airports/:code/weather
 * @desc    Get real-time Open-Meteo weather for a specific airport code
 * @param   code: 3-letter IATA or 4-letter ICAO code
 */
const getAirportWeatherHandler = async (req, res) => {
  const { code } = req.params;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Airport code parameter is required.',
    });
  }

  const cleanCode = code.trim().toUpperCase();
  let lat = null;
  let lon = null;
  let airportName = cleanCode;

  const hubMatch = DEFAULT_HUBS.find(
    (h) => h.iata === cleanCode || h.icao === cleanCode
  );
  if (hubMatch) {
    lat = hubMatch.latitude;
    lon = hubMatch.longitude;
    airportName = hubMatch.name;
  } else {
    try {
      const searchResult = await searchAirports(cleanCode, { limit: 1 });
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const item = searchResult.data[0];
        lat = item.latitude;
        lon = item.longitude;
        airportName = item.name;
      }
    } catch (err) {
      console.warn(`[Airport Weather] Could not query FreeAirportDB for ${cleanCode}: ${err.message}`);
    }
  }

  if (lat == null || lon == null) {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Geographic coordinates for airport '${cleanCode}' are unavailable.`,
    });
  }

  try {
    const weatherResult = await getWeatherForCoordinates(lat, lon);
    return res.status(200).json({
      ...weatherResult,
      airport: {
        code: cleanCode,
        name: airportName,
      },
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'BadGateway',
      message: `Failed to fetch Open-Meteo weather: ${err.message}`,
    });
  }
};

/**
 * @route   GET /api/airports/:code/schedule
 * @desc    Get arrivals and departures for a specific airport hub
 * @param   code: 3-letter IATA code (e.g. JFK, LHR, DXB)
 * @query   type (optional): 'all' | 'departure' | 'arrival'
 */
const getAirportSchedule = async (req, res) => {
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

  const iataUpper = code.trim().toUpperCase();

  // 3. If FlightAware AeroAPI is configured, fetch live timetable
  if (flightAwareService.isConfigured()) {
    try {
      const liveData = await flightAwareService.getAirportSchedule(iataUpper);
      if (liveData && liveData.isLive) {
        const departures = normalizedType === 'arrival' ? [] : liveData.departures;
        const arrivals = normalizedType === 'departure' ? [] : liveData.arrivals;

        return res.status(200).json({
          success: true,
          isDemo: false,
          isLive: true,
          source: 'FLIGHTAWARE_AEROAPI',
          disclaimer: liveData.disclaimer,
          airport: {
            iata: iataUpper,
            icao: null,
            name: `${iataUpper} Airport`,
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
      }
    } catch (err) {
      console.warn(`[FlightAware Warning] Falling back to demo schedule for ${iataUpper}: ${err.message}`);
    }
  }

  // 4. Find airport in demo registry
  const airport = DEMO_AIRPORTS[iataUpper];

  if (!airport) {
    return res.status(404).json({
      success: false,
      error: 'NotFoundError',
      message: `Demo timetable for airport '${iataUpper}' was not found.`,
      availableDemoAirports: Object.keys(DEMO_AIRPORTS),
    });
  }

  // 5. Filter arrivals/departures according to requested type
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
  getAirportHubsHandler,
  getAirportByCodeHandler,
  getMasterAirportsHandler,
  getAirportWeatherHandler,
  DEFAULT_HUBS,
};
