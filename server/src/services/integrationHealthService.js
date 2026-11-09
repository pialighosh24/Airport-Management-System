/**
 * Integration Health Service
 *
 * Performs REAL, on-demand connectivity checks against each external provider
 * already used by AeroNexus. A provider is reported as "connected" ONLY when
 * the provider itself returned a successful response during the check.
 *
 * Status values:
 *   connected       Provider returned a successful response during this check
 *   unavailable     Request failed (network error, timeout, HTTP error, rate limit, rejected key)
 *   not_configured  Provider needs credentials and none are set in server/.env
 *   unknown         No check has been run yet since the server started
 *
 * Notes:
 * - OpenSky is probed directly because getLiveAircraftStates() serves cached
 *   snapshots on failure, which would hide an outage.
 * - FlightAware is probed directly because getAirportSchedule() treats HTTP
 *   errors as empty lists, which would hide a rejected key.
 * - Results are cached for 60 seconds to protect provider rate limits.
 * - Error details are truncated and scrubbed of configured secret values.
 */

const weatherService = require('./weatherService');
const airportService = require('./airportService');
const amadeusService = require('./amadeusService');
const flightAwareService = require('./flightAwareService');

const CACHE_TTL_MS = 60 * 1000;
const PROBE_TIMEOUT_MS = 10000;

const OPENSKY_PROBE_URL =
  'https://opensky-network.org/api/states/all?lamin=49.9&lomin=8.4&lamax=50.2&lomax=8.8';

const PROVIDERS = [
  {
    id: 'amadeus',
    name: 'Amadeus',
    purpose: 'Flight fare offers',
    requiresKey: true,
    envKeys: ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET'],
    checkMethod: 'OAuth2 client-credentials token request',
  },
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    purpose: 'Airport surface weather',
    requiresKey: false,
    envKeys: [],
    checkMethod: 'Current forecast request (Kolkata CCU coordinates)',
  },
  {
    id: 'flightaware',
    name: 'FlightAware AeroAPI',
    purpose: 'Airport arrivals and departures',
    requiresKey: true,
    envKeys: ['FLIGHTAWARE_API_KEY'],
    checkMethod: 'Airport info request (KJFK)',
  },
  {
    id: 'opensky',
    name: 'OpenSky Network',
    purpose: 'Live ADS-B aircraft positions',
    requiresKey: false,
    envKeys: [],
    checkMethod: 'Aircraft states request (small Frankfurt bounding box)',
  },
  {
    id: 'freeairportdb',
    name: 'FreeAirportDB',
    purpose: 'Airport search',
    requiresKey: false,
    envKeys: [],
    checkMethod: 'Airport search request (query "CCU")',
  },
];

let lastResults = null;
let lastCheckedAt = 0;
let inFlight = null;

function scrubSecrets(message) {
  let text = String(message || 'Unknown error');
  const secrets = [
    process.env.AMADEUS_CLIENT_ID,
    process.env.AMADEUS_CLIENT_SECRET,
    process.env.FLIGHTAWARE_API_KEY,
    process.env.OPENSKY_USERNAME,
    process.env.OPENSKY_PASSWORD,
  ].filter((s) => typeof s === 'string' && s.trim().length >= 4);

  for (const secret of secrets) {
    text = text.split(secret).join('[redacted]');
  }
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

async function timedFetch(fetchFn, url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${PROBE_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ----------------------------------------------------
// Individual provider checks. Each returns { status, detail, httpStatus? }
// ----------------------------------------------------

async function checkOpenSky(fetchFn) {
  const headers = { Accept: 'application/json', 'User-Agent': 'AeroNexus-AdminHealthCheck/1.0' };
  const { OPENSKY_USERNAME: user, OPENSKY_PASSWORD: pass } = process.env;
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
  }

  const res = await timedFetch(fetchFn, OPENSKY_PROBE_URL, { headers });
  if (res.status === 429) {
    return { status: 'unavailable', httpStatus: 429, detail: 'Rate limited by OpenSky (HTTP 429). Try again later.' };
  }
  if (!res.ok) {
    return { status: 'unavailable', httpStatus: res.status, detail: `OpenSky returned HTTP ${res.status}.` };
  }
  const body = await res.json();
  const count = Array.isArray(body && body.states) ? body.states.length : 0;
  return {
    status: 'connected',
    httpStatus: res.status,
    detail: `HTTP ${res.status}. ${count} aircraft state(s) in probe area${user && pass ? ' (authenticated)' : ' (anonymous)'}.`,
  };
}

async function checkOpenMeteo(fetchFn) {
  const result = await weatherService.getWeatherForCoordinates(22.6547, 88.4467, {
    forceRefresh: true,
    timeoutMs: PROBE_TIMEOUT_MS,
    fetchFn,
  });
  const temp = result && result.weather ? result.weather.temperatureC : null;
  return {
    status: 'connected',
    httpStatus: 200,
    detail: `Forecast returned${temp != null ? ` (${temp}°C at CCU)` : ''}.`,
  };
}

async function checkFreeAirportDb(fetchFn) {
  const result = await airportService.searchAirports('CCU', {
    limit: 1,
    forceRefresh: true,
    timeoutMs: PROBE_TIMEOUT_MS,
    fetchFn,
  });
  return {
    status: 'connected',
    httpStatus: 200,
    detail: `Search responded with ${result.count} result(s).`,
  };
}

async function checkAmadeus(fetchFn) {
  if (!amadeusService.isConfigured()) {
    return { status: 'not_configured', detail: 'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET are not set in server/.env.' };
  }
  await amadeusService.getAccessToken(fetchFn);
  return { status: 'connected', httpStatus: 200, detail: 'OAuth2 access token issued by Amadeus.' };
}

async function checkFlightAware(fetchFn) {
  if (!flightAwareService.isConfigured()) {
    return { status: 'not_configured', detail: 'FLIGHTAWARE_API_KEY is not set in server/.env.' };
  }
  const baseUrl = process.env.FLIGHTAWARE_BASE_URL || 'https://aeroapi.flightaware.com/aeroapi';
  const res = await timedFetch(fetchFn, `${baseUrl}/airports/KJFK`, {
    headers: { 'x-apikey': process.env.FLIGHTAWARE_API_KEY, Accept: 'application/json' },
  });
  if (res.status === 401 || res.status === 403) {
    return { status: 'unavailable', httpStatus: res.status, detail: `API key rejected by FlightAware (HTTP ${res.status}).` };
  }
  if (!res.ok) {
    return { status: 'unavailable', httpStatus: res.status, detail: `FlightAware returned HTTP ${res.status}.` };
  }
  return { status: 'connected', httpStatus: res.status, detail: `HTTP ${res.status}. Airport info returned.` };
}

const CHECKS = {
  amadeus: checkAmadeus,
  'open-meteo': checkOpenMeteo,
  flightaware: checkFlightAware,
  opensky: checkOpenSky,
  freeairportdb: checkFreeAirportDb,
};

function isProviderConfigured(provider) {
  return provider.envKeys.every((key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

async function runSingleCheck(provider, fetchFn) {
  const startedAt = Date.now();
  let outcome;
  try {
    outcome = await CHECKS[provider.id](fetchFn);
  } catch (err) {
    outcome = { status: 'unavailable', detail: scrubSecrets(err && err.message) };
  }
  return {
    id: provider.id,
    name: provider.name,
    purpose: provider.purpose,
    requiresKey: provider.requiresKey,
    configured: provider.requiresKey ? isProviderConfigured(provider) : null,
    checkMethod: provider.checkMethod,
    status: outcome.status,
    detail: scrubSecrets(outcome.detail),
    httpStatus: outcome.httpStatus || null,
    latencyMs: outcome.status === 'not_configured' ? null : Date.now() - startedAt,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Returns provider statuses without running any network checks.
 * Every provider is "unknown" until a real check has been performed.
 */
function getUncheckedStatuses() {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    purpose: provider.purpose,
    requiresKey: provider.requiresKey,
    configured: provider.requiresKey ? isProviderConfigured(provider) : null,
    checkMethod: provider.checkMethod,
    status: 'unknown',
    detail: 'No check has been run yet.',
    httpStatus: null,
    latencyMs: null,
    checkedAt: null,
  }));
}

/**
 * Runs all provider checks in parallel (or returns the cached result if it is
 * younger than 60 seconds and `force` is false).
 */
async function runIntegrationChecks(options = {}) {
  const { force = false, fetchFn = globalThis.fetch } = options;
  const age = Date.now() - lastCheckedAt;

  if (!force && lastResults && age < CACHE_TTL_MS) {
    return { results: lastResults, fromCache: true, cacheAgeSeconds: Math.floor(age / 1000) };
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const results = await Promise.all(PROVIDERS.map((p) => runSingleCheck(p, fetchFn)));
      lastResults = results;
      lastCheckedAt = Date.now();
      return { results, fromCache: false, cacheAgeSeconds: 0 };
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

function getLastResults() {
  if (!lastResults) return null;
  return { results: lastResults, fromCache: true, cacheAgeSeconds: Math.floor((Date.now() - lastCheckedAt) / 1000) };
}

function clearIntegrationCache() {
  lastResults = null;
  lastCheckedAt = 0;
}

module.exports = {
  PROVIDERS,
  runIntegrationChecks,
  getUncheckedStatuses,
  getLastResults,
  clearIntegrationCache,
  scrubSecrets,
};
