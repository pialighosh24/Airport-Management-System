/**
 * Weather Controller
 * 
 * Provides real-time public meteorological data via Open-Meteo.
 * Supports direct coordinate queries (?lat=...&lon=...) and airport code queries (?airport=CCU).
 */

const { getWeatherForCoordinates } = require('../services/weatherService');
const { searchAirports } = require('../services/airportService');

// Known coordinates for fast resolution of primary hubs
const KNOWN_AIRPORT_COORDS = {
  CCU: { lat: 22.6547, lon: 88.4467, name: 'Netaji Subhash Chandra Bose Intl' },
  DEL: { lat: 28.5562, lon: 77.1000, name: 'Indira Gandhi Intl' },
  BOM: { lat: 19.0896, lon: 72.8656, name: 'Chhatrapati Shivaji Maharaj Intl' },
  BLR: { lat: 13.1986, lon: 77.7066, name: 'Kempegowda Intl' },
  JFK: { lat: 40.6413, lon: -73.7781, name: 'John F. Kennedy Intl' },
  LHR: { lat: 51.4700, lon: -0.4543, name: 'London Heathrow' },
  DXB: { lat: 25.2532, lon: 55.3657, name: 'Dubai Intl' },
  SIN: { lat: 1.3644, lon: 103.9915, name: 'Singapore Changi' },
  HND: { lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
  FRA: { lat: 50.0379, lon: 8.5622, name: 'Frankfurt Airport' },
};

/**
 * @route   GET /api/weather
 * @desc    Get real-time weather near coordinates or airport from Open-Meteo
 * @query   lat (optional): Latitude in degrees
 * @query   lon (optional): Longitude in degrees
 * @query   airport (optional): 3-letter IATA or 4-letter ICAO code (e.g. 'CCU', 'JFK')
 */
const getWeather = async (req, res) => {
  const { lat, lon, airport } = req.query;

  let targetLat = lat;
  let targetLon = lon;
  let airportName = null;
  let airportCode = null;

  // Case 1: Airport code provided
  if (airport && typeof airport === 'string' && airport.trim().length > 0) {
    const codeUpper = airport.trim().toUpperCase();
    airportCode = codeUpper;

    // Check fast known table first
    if (KNOWN_AIRPORT_COORDS[codeUpper]) {
      targetLat = KNOWN_AIRPORT_COORDS[codeUpper].lat;
      targetLon = KNOWN_AIRPORT_COORDS[codeUpper].lon;
      airportName = KNOWN_AIRPORT_COORDS[codeUpper].name;
    } else {
      // Resolve coordinates via FreeAirportDB
      try {
        const searchResult = await searchAirports(codeUpper, { limit: 1 });
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const match = searchResult.data[0];
          if (match.latitude != null && match.longitude != null) {
            targetLat = match.latitude;
            targetLon = match.longitude;
            airportName = match.name;
          }
        }
      } catch (err) {
        console.warn(`[Weather] Could not resolve coordinates for airport ${codeUpper}: ${err.message}`);
      }
    }

    if (targetLat == null || targetLon == null) {
      return res.status(404).json({
        success: false,
        error: 'NotFoundError',
        message: `Could not determine geographic coordinates for airport code '${codeUpper}'.`,
      });
    }
  }

  // Case 2: Validate coordinate parameters
  if (targetLat === undefined || targetLon === undefined) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Either "lat" & "lon" query parameters or an "airport" code query parameter must be provided. Examples: /api/weather?airport=CCU or /api/weather?lat=22.65&lon=88.45',
    });
  }

  try {
    const weatherResult = await getWeatherForCoordinates(targetLat, targetLon);

    return res.status(200).json({
      ...weatherResult,
      airport: airportCode ? {
        code: airportCode,
        name: airportName,
      } : null,
    });
  } catch (err) {
    console.error(`❌ [Weather API Error]: ${err.message}`);

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: err.message,
      });
    }

    if (err.name === 'TimeoutError') {
      return res.status(504).json({
        success: false,
        error: 'GatewayTimeout',
        message: 'Weather service request timed out contacting Open-Meteo. Please try again.',
      });
    }

    return res.status(502).json({
      success: false,
      error: 'BadGateway',
      message: `Failed to fetch meteorological data from Open-Meteo: ${err.message}`,
    });
  }
};

module.exports = {
  getWeather,
  KNOWN_AIRPORT_COORDS,
};
