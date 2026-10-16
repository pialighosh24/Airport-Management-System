/**
 * OpenSky Network Service
 * 
 * Fetches real-time ADS-B aircraft state vectors from the free, public OpenSky Network API.
 * 
 * Key Principles:
 * - External calls run strictly on the Node.js backend (never client-side).
 * - Distinguish real live ADS-B telemetry from simulated demo data (isDemo: false, isLive: true).
 * - Enforce an in-memory TTL cache (15 seconds) to strictly respect OpenSky's 10-second
 *   anonymous rate limit and protect against HTTP 429 errors.
 * - Unknown stays unknown: Missing transponder metrics remain null.
 * - Gate and terminal assignments are NOT broadcast over ADS-B, so they remain null.
 */

const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';

// In-memory cache to respect OpenSky rate limits (10s anonymous rate limit)
let cachedData = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

/**
 * Standard preset bounding boxes for busy airspace
 */
const AIRSPACE_PRESETS = {
  // Central/Western Europe (Switzerland, Germany, France, Austria, N. Italy)
  europe: {
    lamin: 45.8389,
    lomin: 5.9962,
    lamax: 52.5200,
    lomax: 14.5000,
    name: 'Central Europe Airspace',
  },
  // US East Coast (New York, Boston, Philadelphia, DC)
  us_east: {
    lamin: 38.0000,
    lomin: -78.0000,
    lamax: 42.5000,
    lomax: -71.0000,
    name: 'US East Coast Airspace',
  },
};

/**
 * Determine flight status string from telemetry safely
 * If transponder erroneously reports onGround=true while cruising at high altitude,
 * handle it safely as airborne ('en_route') without modifying raw onGround transponder data.
 */
function deriveFlightStatus(onGround, altitudeFeet, verticalRateFpm, hasOnGroundAltitudeConflict = false) {
  if (hasOnGroundAltitudeConflict) {
    return 'en_route';
  }
  if (onGround) {
    return 'landed';
  }
  if (altitudeFeet == null) {
    return 'en_route';
  }
  if (altitudeFeet < 3000) {
    return 'approaching';
  }
  if (verticalRateFpm != null && verticalRateFpm < -500 && altitudeFeet < 15000) {
    return 'approaching';
  }
  if (verticalRateFpm != null && verticalRateFpm > 500 && altitudeFeet < 15000) {
    return 'departed';
  }
  return 'en_route';
}

/**
 * Transform OpenSky 17-column state array into AeroNexus AircraftTelemetry structure
 * Adheres strictly to:
 * 1. Never invent airport codes (origin/dest iata and icao are null, never 'ADSB' or 'LIVE').
 * 2. Missing transponder metrics remain null (altitude, speed, heading, vertical rate, squawk, callsign).
 * 3. Flag inconsistent telemetry (e.g. onGround=true at high altitude) without inventing replacement values.
 * 4. Correctly preserve observation timestamps and calculate age.
 */
function transformOpenSkyState(state, retrievalTimestamp) {
  const [
    icao24,            // 0: string
    rawCallsign,       // 1: string or null
    originCountry,     // 2: string
    timePosition,      // 3: int or null
    lastContact,       // 4: int
    longitude,         // 5: float or null
    latitude,          // 6: float or null
    baroAltitude,      // 7: float in meters or null
    onGround,          // 8: boolean
    velocity,          // 9: float in m/s or null
    trueTrack,         // 10: float in degrees or null
    verticalRate,      // 11: float in m/s or null
    sensors,           // 12: array or null
    geoAltitude,       // 13: float in meters or null
    squawk,            // 14: string or null
    spi,               // 15: boolean
    positionSource,    // 16: int
  ] = state;

  const cleanCallsign = (typeof rawCallsign === 'string') ? rawCallsign.trim() : '';
  const callsign = cleanCallsign.length > 0 ? cleanCallsign : null;
  const flightNumber = cleanCallsign.length > 0 ? cleanCallsign : icao24.toUpperCase();

  const baroAltFt = baroAltitude != null ? Math.round(baroAltitude * 3.28084) : null;
  const geoAltFt = geoAltitude != null ? Math.round(geoAltitude * 3.28084) : null;
  const altitudeFeet = baroAltFt != null ? baroAltFt : geoAltFt;

  const groundSpeedKnots = velocity != null ? Math.round(velocity * 1.94384) : null;
  const headingDegrees = trueTrack != null ? Math.round(trueTrack) : null;
  const verticalRateFpm = verticalRate != null ? Math.round(verticalRate * 196.85) : null;
  const squawkCode = (typeof squawk === 'string' && squawk.trim().length > 0) ? squawk.trim() : null;
  const isOnGround = Boolean(onGround);

  // 1. Telemetry Inconsistency Detection (conflicting transponder broadcasts)
  let hasConflict = false;
  let conflictType = null;
  let conflictDescription = null;

  if (isOnGround && altitudeFeet != null && altitudeFeet > 3000) {
    hasConflict = true;
    conflictType = 'ON_GROUND_HIGH_ALTITUDE';
    conflictDescription = `Transponder reports on-ground while barometric altitude is ${altitudeFeet.toLocaleString()} ft.`;
  } else if (isOnGround && groundSpeedKnots != null && groundSpeedKnots > 200) {
    hasConflict = true;
    conflictType = 'ON_GROUND_HIGH_SPEED';
    conflictDescription = `Transponder reports on-ground while ground speed is ${groundSpeedKnots} kts.`;
  } else if (altitudeFeet != null && altitudeFeet < -1500) {
    hasConflict = true;
    conflictType = 'NEGATIVE_ALTITUDE';
    conflictDescription = `Barometric altitude (${altitudeFeet} ft) is below standard physical limit.`;
  } else if (verticalRateFpm != null && Math.abs(verticalRateFpm) > 15000) {
    hasConflict = true;
    conflictType = 'EXTREME_VERTICAL_RATE';
    conflictDescription = `Vertical rate (${verticalRateFpm} fpm) exceeds standard operational limits.`;
  }

  // 2. Observation Timestamps & Age
  const positionEpoch = timePosition != null ? timePosition : lastContact;
  const observationEpoch = positionEpoch != null ? positionEpoch : Math.floor(retrievalTimestamp / 1000);
  const observationTimeUtc = new Date(observationEpoch * 1000).toISOString();
  const ageSeconds = Math.max(0, Math.floor((retrievalTimestamp - observationEpoch * 1000) / 1000));

  let freshnessStatus = 'valid';
  if (latitude == null || longitude == null) {
    freshnessStatus = 'missing';
  } else if (ageSeconds > 60) {
    freshnessStatus = 'stale';
  }

  const hasOnGroundAltitudeConflict = conflictType === 'ON_GROUND_HIGH_ALTITUDE';
  const status = deriveFlightStatus(isOnGround, altitudeFeet, verticalRateFpm, hasOnGroundAltitudeConflict);
  const countryOfRegistration = (typeof originCountry === 'string' && originCountry.trim().length > 0)
    ? originCountry.trim()
    : null;

  let notes = 'Live radio transponder telemetry. Origin, destination, airline commercial names, gates, and terminals are not broadcast over ADS-B.';
  if (hasConflict) {
    notes += ` Warning: ${conflictDescription}`;
  }

  return {
    id: `opensky-${icao24}`,
    icao24: icao24.toLowerCase(),
    callsign,
    flightNumber,
    airline: {
      name: null,
      iata: null,
      icao: null,
    },
    aircraftModel: null,
    registration: null,
    countryOfRegistration,
    origin: {
      iata: null,
      icao: null,
      name: null,
      city: null,
      country: null,
      countryCode: null,
      terminal: null,
      gate: null,
    },
    destination: {
      iata: null,
      icao: null,
      name: null,
      city: null,
      country: null,
      countryCode: null,
      terminal: null,
      gate: null,
    },
    latitude: latitude != null ? Number(latitude.toFixed(4)) : null,
    longitude: longitude != null ? Number(longitude.toFixed(4)) : null,
    altitudeFeet,
    groundSpeedKnots,
    headingDegrees,
    verticalRateFpm,
    squawkCode,
    onGround: isOnGround,
    status,
    freshness: {
      status: freshnessStatus,
      observationTimeUtc,
      retrievalTimeUtc: new Date(retrievalTimestamp).toISOString(),
      ageSeconds,
      providerName: 'OpenSky Network (Live ADS-B)',
      timePositionUtc: timePosition ? new Date(timePosition * 1000).toISOString() : null,
      lastContactUtc: lastContact ? new Date(lastContact * 1000).toISOString() : null,
      notes,
    },
    telemetryFlags: {
      hasConflict,
      conflictType,
      description: conflictDescription,
    },
    isDemo: false,
    isLive: true,
    dataSource: 'OPENSKY_NETWORK_LIVE',
  };
}

/**
 * Fetch live aircraft states from OpenSky Network
 * 
 * @param {Object} options
 * @param {string} [options.preset] Airspace preset ('europe' | 'us_east' | 'all')
 * @param {number} [options.limit] Maximum aircraft to return (default 40)
 * @param {boolean} [options.forceRefresh] Force refresh bypassing cache
 * @returns {Promise<Object>} Processed aircraft telemetry list and metadata
 */
async function getLiveAircraftStates(options = {}) {
  const {
    preset = 'europe',
    limit = 40,
    forceRefresh = false,
  } = options;

  const now = Date.now();
  const cacheAge = now - lastFetchTimestamp;

  // 1. Check in-memory cache to strictly avoid OpenSky rate limits (10s anonymous limit)
  if (!forceRefresh && cachedData && cacheAge < CACHE_TTL_MS) {
    return {
      ...cachedData,
      fromCache: true,
      cacheRemainingSeconds: Math.ceil((CACHE_TTL_MS - cacheAge) / 1000),
    };
  }

  // 2. Build OpenSky request URL
  let targetUrl = OPENSKY_API_URL;
  const bbox = AIRSPACE_PRESETS[preset] || AIRSPACE_PRESETS.europe;
  if (bbox) {
    targetUrl += `?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'AeroNexus-FlightTracker/1.0',
  };

  // Optional: If user configured OpenSky credentials in .env, supply Basic Auth
  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  if (username && password) {
    const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
    headers['Authorization'] = `Basic ${authHeader}`;
  }

  // 3. Make HTTP request with timeout protection
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle OpenSky Rate Limiting (HTTP 429)
    if (response.status === 429) {
      if (cachedData) {
        return {
          ...cachedData,
          fromCache: true,
          rateLimitHit: true,
          warning: 'OpenSky rate limit reached (max 1 request per 10s for anonymous). Serving previous live snapshot.',
        };
      }
      throw new Error('OpenSky Network rate limit reached (HTTP 429). Please wait 10 seconds before refreshing.');
    }

    if (!response.ok) {
      throw new Error(`OpenSky Network returned HTTP ${response.status} (${response.statusText})`);
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.states)) {
      // Empty result in the chosen bounding box
      const emptyResult = {
        success: true,
        isDemo: false,
        isLive: true,
        source: 'OPENSKY_NETWORK',
        providerName: 'OpenSky Network (Live ADS-B)',
        airspace: bbox ? bbox.name : 'Global',
        count: 0,
        totalInAirspace: 0,
        data: [],
        timestamp: new Date().toISOString(),
      };
      cachedData = emptyResult;
      lastFetchTimestamp = now;
      return emptyResult;
    }

    // 4. Filter and transform states
    // Must have valid latitude & longitude to be displayed on radar
    const validStates = payload.states.filter((st) => st[5] != null && st[6] != null);

    // Transform and limit
    const transformed = validStates
      .slice(0, limit)
      .map((st) => transformOpenSkyState(st, now));

    const result = {
      success: true,
      isDemo: false,
      isLive: true,
      source: 'OPENSKY_NETWORK',
      providerName: 'OpenSky Network (Live ADS-B)',
      airspace: bbox ? bbox.name : 'Global',
      count: transformed.length,
      totalInAirspace: validStates.length,
      openSkyServerTime: payload.time ? new Date(payload.time * 1000).toISOString() : null,
      timestamp: new Date().toISOString(),
      disclaimer: 'REAL-TIME ADS-B RADAR TELEMETRY via OpenSky Network. Commercial airline gate, terminal, and baggage details are NOT transmitted over ADS-B radio signals.',
      data: transformed,
    };

    // Update in-memory cache
    cachedData = result;
    lastFetchTimestamp = now;

    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    // If abort / timeout occurs and we have cache, fallback gracefully
    if (cachedData) {
      return {
        ...cachedData,
        fromCache: true,
        warning: `Live update failed (${err.message}). Serving last available radar snapshot.`,
      };
    }

    if (err.name === 'AbortError') {
      throw new Error('OpenSky Network request timed out (12s). Check internet connectivity.');
    }

    throw err;
  }
}

module.exports = {
  getLiveAircraftStates,
  transformOpenSkyState,
  deriveFlightStatus,
  AIRSPACE_PRESETS,
};
