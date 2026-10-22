/**
 * FreeAirportDB Service
 * 
 * Fetches airport information (IATA, ICAO, name, municipality, country,
 * coordinates, elevation, timezone, airport type) from the free, public
 * FreeAirportDB API (https://api.freeairportdb.com).
 */

const FREE_AIRPORT_DB_URL = 'https://api.freeairportdb.com/v1/airports';
const DEFAULT_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const searchCache = new Map();

function clearSearchCache() {
  searchCache.clear();
}

function parseCoordinate(val) {
  if (typeof val === 'number') {
    return isFinite(val) ? val : null;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    const parsed = Number(val.trim());
    return isFinite(parsed) ? parsed : null;
  }
  return null;
}

function transformAirport(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  return {
    code: typeof raw.code === 'string' && raw.code.trim().length > 0 ? raw.code.trim() : null,
    iata: typeof raw.iata === 'string' && raw.iata.trim().length > 0 ? raw.iata.trim().toUpperCase() : null,
    icao: typeof raw.icao === 'string' && raw.icao.trim().length > 0 ? raw.icao.trim().toUpperCase() : null,
    name: typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : null,
    city: typeof raw.municipality === 'string' && raw.municipality.trim().length > 0 ? raw.municipality.trim() : null,
    country: typeof raw.country_name === 'string' && raw.country_name.trim().length > 0 ? raw.country_name.trim() : null,
    countryCode: typeof raw.country_code === 'string' && raw.country_code.trim().length > 0 ? raw.country_code.trim().toUpperCase() : null,
    region: typeof raw.region_name === 'string' && raw.region_name.trim().length > 0 ? raw.region_name.trim() : null,
    regionCode: typeof raw.region_code === 'string' && raw.region_code.trim().length > 0 ? raw.region_code.trim() : null,
    continent: typeof raw.continent_name === 'string' && raw.continent_name.trim().length > 0 ? raw.continent_name.trim() : null,
    continentCode: typeof raw.continent_code === 'string' && raw.continent_code.trim().length > 0 ? raw.continent_code.trim().toUpperCase() : null,
    latitude: parseCoordinate(raw.latitude),
    longitude: parseCoordinate(raw.longitude),
    elevation: parseCoordinate(raw.elevation),
    elevationFt: parseCoordinate(raw.elevation_ft),
    timezone: typeof raw.time_zone === 'string' && raw.time_zone.trim().length > 0 ? raw.time_zone.trim() : null,
    type: typeof raw.type === 'string' && raw.type.trim().length > 0 ? raw.type.trim() : null,
  };
}

async function searchAirports(query, options = {}) {
  const {
    limit = 20,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    forceRefresh = false,
    fetchFn = globalThis.fetch,
  } = options;

  if (query == null || typeof query !== 'string') {
    const err = new Error('Search query is required.');
    err.name = 'ValidationError';
    throw err;
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    const err = new Error('Search query cannot be empty or contain only whitespace.');
    err.name = 'ValidationError';
    throw err;
  }

  if (trimmedQuery.length > 100) {
    const err = new Error('Search query exceeds maximum allowed length of 100 characters.');
    err.name = 'ValidationError';
    throw err;
  }

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const cacheKey = `${trimmedQuery.toLowerCase()}::${parsedLimit}`;
  const now = Date.now();

  if (!forceRefresh && searchCache.has(cacheKey)) {
    const cachedEntry = searchCache.get(cacheKey);
    if (now - cachedEntry.cachedAt < CACHE_TTL_MS) {
      return {
        ...cachedEntry.payload,
        fromCache: true,
      };
    }
    searchCache.delete(cacheKey);
  }

  const targetUrl = new URL(FREE_AIRPORT_DB_URL);
  targetUrl.searchParams.set('q', trimmedQuery);
  if (parsedLimit) {
    targetUrl.searchParams.set('limit', String(parsedLimit));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AeroNexus-AirportService/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = new Error(`FreeAirportDB returned HTTP ${response.status} (${response.statusText || 'Error'})`);
      err.name = 'ExternalApiError';
      err.statusCode = response.status;
      throw err;
    }

    const json = await response.json();

    if (!json || typeof json !== 'object') {
      const err = new Error('Invalid JSON payload received from FreeAirportDB.');
      err.name = 'ExternalApiError';
      throw err;
    }

    const rawData = Array.isArray(json.data) ? json.data : [];
    const transformedData = rawData
      .map(transformAirport)
      .filter((airport) => airport !== null);

    const result = {
      success: true,
      source: 'FREE_AIRPORT_DB',
      providerName: 'FreeAirportDB',
      query: trimmedQuery,
      count: transformedData.length,
      total: typeof json.total === 'number' ? json.total : transformedData.length,
      data: transformedData,
      timestamp: new Date().toISOString(),
    };

    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }

    searchCache.set(cacheKey, {
      payload: result,
      cachedAt: now,
    });

    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`FreeAirportDB request timed out (${Math.round(timeoutMs / 1000)}s). Check internet connectivity.`);
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }

    throw err;
  }
}

module.exports = {
  FREE_AIRPORT_DB_URL,
  searchAirports,
  transformAirport,
  clearSearchCache,
};
