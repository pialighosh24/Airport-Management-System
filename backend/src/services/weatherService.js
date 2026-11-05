/**
 * Open-Meteo Weather Service
 * 
 * Fetches real-time public meteorological data from Open-Meteo (https://open-meteo.com)
 * near airport coordinates.
 * 
 * Key Principles:
 * - 100% Free public API; no private API key required.
 * - Always attach the mandatory aviation disclaimer:
 *   "General public meteorological forecast from Open-Meteo. Not certified aviation METAR."
 * - Missing or invalid coordinates reject with validation errors.
 * - Caches responses for 10 minutes to respect fair use and optimize latency.
 * - Unknown stays unknown: never fabricate wind or temperature values.
 */

const OPEN_METEO_BASE_URL = process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1';
const DEFAULT_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
const MAX_CACHE_ENTRIES = 200;

// In-memory weather cache: key -> { data, expiresAt }
const weatherCache = new Map();

/**
 * Clear cached weather results (useful for tests)
 */
function clearWeatherCache() {
  weatherCache.clear();
}

/**
 * Map WMO weather code to standard descriptive condition
 */
function mapWmoCodeToCondition(code) {
  if (code == null || isNaN(code)) {
    return 'Unknown';
  }

  const numCode = Number(code);
  switch (numCode) {
    case 0:
      return 'Clear Sky';
    case 1:
      return 'Mainly Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Fog / Mist';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 61:
      return 'Light Rain';
    case 63:
      return 'Moderate Rain';
    case 65:
      return 'Heavy Rain';
    case 66:
    case 67:
      return 'Freezing Rain';
    case 71:
      return 'Light Snow';
    case 73:
      return 'Moderate Snow';
    case 75:
      return 'Heavy Snow';
    case 77:
      return 'Snow Grains';
    case 80:
      return 'Light Showers';
    case 81:
      return 'Moderate Showers';
    case 82:
      return 'Violent Showers';
    case 85:
    case 86:
      return 'Snow Showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Thunderstorm with Hail';
    default:
      return 'Fair';
  }
}

/**
 * Validate latitude and longitude coordinates
 */
function validateCoordinates(lat, lon) {
  const parsedLat = Number(lat);
  const parsedLon = Number(lon);

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    const err = new Error('Latitude and Longitude must be valid numbers.');
    err.name = 'ValidationError';
    throw err;
  }

  if (parsedLat < -90 || parsedLat > 90) {
    const err = new Error('Latitude must be between -90 and 90 degrees.');
    err.name = 'ValidationError';
    throw err;
  }

  if (parsedLon < -180 || parsedLon > 180) {
    const err = new Error('Longitude must be between -180 and 180 degrees.');
    err.name = 'ValidationError';
    throw err;
  }

  return { latitude: parsedLat, longitude: parsedLon };
}

/**
 * Fetch current weather near given coordinates from Open-Meteo
 * 
 * @param {number|string} lat Latitude in decimal degrees
 * @param {number|string} lon Longitude in decimal degrees
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @param {number} [options.timeoutMs=8000]
 * @param {Function} [options.fetchFn] Custom fetch function for unit tests
 * @returns {Promise<object>} Weather details envelope
 */
async function getWeatherForCoordinates(lat, lon, options = {}) {
  const {
    forceRefresh = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn = globalThis.fetch,
  } = options;

  const { latitude, longitude } = validateCoordinates(lat, lon);

  // Round coordinates to 2 decimal places (~1.1 km) for efficient cache keying
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

  if (!forceRefresh) {
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        ...cached.data,
        fromCache: true,
      };
    }
  }

  const queryParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'kn', // Knots for aviation familiarity
  });

  const url = `${OPEN_METEO_BASE_URL}/forecast?${queryParams.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (netErr) {
    clearTimeout(timeoutId);
    if (netErr.name === 'AbortError') {
      const timeoutError = new Error(`Open-Meteo request timed out after ${timeoutMs}ms.`);
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    const connError = new Error(`Network failure connecting to Open-Meteo: ${netErr.message}`);
    connError.name = 'ExternalApiError';
    throw connError;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    const apiError = new Error(`Open-Meteo returned HTTP ${response.status}: ${response.statusText}`);
    apiError.name = 'ExternalApiError';
    apiError.status = response.status;
    throw apiError;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    const formatError = new Error('Failed to parse Open-Meteo response JSON.');
    formatError.name = 'ExternalApiError';
    throw formatError;
  }

  const current = data.current || {};
  const weatherCode = current.weather_code != null ? current.weather_code : null;

  const weatherResult = {
    success: true,
    isLive: true,
    source: 'Open-Meteo',
    disclaimer: 'General public meteorological forecast from Open-Meteo. Not certified aviation METAR.',
    coordinates: {
      latitude: data.latitude != null ? data.latitude : latitude,
      longitude: data.longitude != null ? data.longitude : longitude,
      elevation: data.elevation != null ? data.elevation : null,
    },
    weather: {
      temperatureC: current.temperature_2m != null ? current.temperature_2m : null,
      relativeHumidityPct: current.relative_humidity_2m != null ? current.relative_humidity_2m : null,
      windSpeedKnots: current.wind_speed_10m != null ? current.wind_speed_10m : null,
      windDirectionDeg: current.wind_direction_10m != null ? current.wind_direction_10m : null,
      weatherCode,
      condition: mapWmoCodeToCondition(weatherCode),
    },
    forecastTimeUtc: current.time || null,
    retrievedAtUtc: new Date().toISOString(),
    fromCache: false,
  };

  // Cache result
  if (weatherCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = weatherCache.keys().next().value;
    weatherCache.delete(oldestKey);
  }
  weatherCache.set(cacheKey, {
    data: weatherResult,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return weatherResult;
}

module.exports = {
  getWeatherForCoordinates,
  mapWmoCodeToCondition,
  validateCoordinates,
  clearWeatherCache,
};
