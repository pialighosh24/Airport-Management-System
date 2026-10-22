/**
 * OpenSky Network Service
 * 
 * Fetches real-time ADS-B aircraft state vectors from OpenSky Network API.
 */

const OPENSKY_API_URL = 'https://opensky-network.org/api/states/all';

let cachedData = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 15000;

const AIRSPACE_PRESETS = {
  europe: {
    lamin: 45.8389,
    lomin: 5.9962,
    lamax: 52.5200,
    lomax: 14.5000,
    name: 'Central Europe Airspace',
  },
  us_east: {
    lamin: 38.0000,
    lomin: -78.0000,
    lamax: 42.5000,
    lomax: -71.0000,
    name: 'US East Coast Airspace',
  },
};

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

function transformOpenSkyState(state, retrievalTimestamp) {
  const [
    icao24,
    rawCallsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    sensors,
    geoAltitude,
    squawk,
    spi,
    positionSource,
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

async function getLiveAircraftStates(options = {}) {
  const {
    preset = 'europe',
    limit = 40,
    forceRefresh = false,
  } = options;

  const now = Date.now();
  const cacheAge = now - lastFetchTimestamp;

  if (!forceRefresh && cachedData && cacheAge < CACHE_TTL_MS) {
    return {
      ...cachedData,
      fromCache: true,
      cacheRemainingSeconds: Math.ceil((CACHE_TTL_MS - cacheAge) / 1000),
    };
  }

  let targetUrl = OPENSKY_API_URL;
  const bbox = AIRSPACE_PRESETS[preset] || AIRSPACE_PRESETS.europe;
  if (bbox) {
    targetUrl += `?lamin=${bbox.lamin}&lomin=${bbox.lomin}&lamax=${bbox.lamax}&lomax=${bbox.lomax}`;
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'AeroNexus-FlightTracker/1.0',
  };

  const username = process.env.OPENSKY_USERNAME;
  const password = process.env.OPENSKY_PASSWORD;
  if (username && password) {
    const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
    headers['Authorization'] = `Basic ${authHeader}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      if (cachedData) {
        return {
          ...cachedData,
          fromCache: true,
          rateLimitHit: true,
          warning: 'OpenSky rate limit reached. Serving cached radar snapshot.',
        };
      }
      throw new Error('OpenSky Network rate limit reached. Please wait 10 seconds before refreshing.');
    }

    if (!response.ok) {
      throw new Error(`OpenSky Network returned HTTP ${response.status}`);
    }

    const payload = await response.json();

    if (!payload || !Array.isArray(payload.states)) {
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

    const validStates = payload.states.filter((st) => st[5] != null && st[6] != null);

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
      disclaimer: 'REAL-TIME ADS-B RADAR TELEMETRY via OpenSky Network.',
      data: transformed,
    };

    cachedData = result;
    lastFetchTimestamp = now;

    return result;
  } catch (err) {
    clearTimeout(timeoutId);

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
