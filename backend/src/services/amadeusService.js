/**
 * AeroNexus — Amadeus Flight Offers Service
 *
 * Integrates the Amadeus Flight Offers Search API (official test environment:
 * https://test.api.amadeus.com) for flight-offer intelligence.
 *
 * Integration details:
 * - Authentication: OAuth2 client_credentials → POST /v1/auth/token
 * - Search:         GET  /v1/shopping/flight-offers
 * - Credentials:    AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET (server-side only)
 *
 * Behaviour:
 * - When credentials are not configured, a typed "not configured" error is thrown
 *   so the backend/client can label the source accurately instead of inventing data.
 * - Provider/HTTP/timeout failures surface as typed errors (ExternalApiError / TimeoutError).
 * - Offers are mapped from verified provider payloads only; no values are fabricated.
 */

const DEFAULT_AMADEUS_BASE_URL = 'https://test.api.amadeus.com';
const DEFAULT_TIMEOUT_MS = 12000;
const TOKEN_TTL_MS = 60 * 1000; // seconds*1000 minus clock skew buffer

const amadeusConfig = {
  clientId: process.env.AMADEUS_CLIENT_ID || null,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET || null,
  baseUrl: process.env.AMADEUS_BASE_URL || DEFAULT_AMADEUS_BASE_URL,
};

let tokenCache = { token: null, expiresAt: 0 };

function isConfigured() {
  return Boolean(amadeusConfig.clientId && amadeusConfig.clientSecret);
}

function clearAmadeusTokenCache() {
  tokenCache = { token: null, expiresAt: 0 };
}

function buildError(message, name) {
  const err = new Error(message);
  err.name = name;
  return err;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  if (!isConfigured()) {
    throw buildError('Amadeus Flight Offers API credentials are not configured.', 'AmadeusNotConfiguredError');
  }

  const response = await fetch(`${amadeusConfig.baseUrl}/v1/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${amadeusConfig.clientId}:${amadeusConfig.clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: amadeusConfig.clientId,
      client_secret: amadeusConfig.clientSecret,
    }),
    signal: AbortSignal.timeout ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined,
  });

  if (!response.ok) {
    const err = new Error(`Amadeus authentication token request failed (HTTP ${response.status}).`);
    err.name = 'ExternalApiError';
    throw err;
  }

  const payload = await response.json();
  const accessToken = payload?.access_token;
  const expiresInSeconds = Number(payload?.expires_in) || 60;

  if (!accessToken) {
    const err = new Error('Amadeus authentication response did not include an access token.');
    err.name = 'ExternalApiError';
    throw err;
  }

  tokenCache = { token: accessToken, expiresAt: now + Math.max(10, expiresInSeconds - 10) * 1000 };
  return accessToken;
}

function parseIsoDurationToMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  const totalMinutes = days * 1440 + hours * 60 + minutes + Math.round(seconds / 60);
  return Number.isFinite(totalMinutes) ? totalMinutes : null;
}

function mapAmadeusOffers(payload) {
  const itineraries = Array.isArray(payload?.data?.itineraries) ? payload.data.itineraries : [];

  const offers = itineraries.map((itinerary, index) => {
    const segment = itinerary?.segments?.[0] || {};
    const departureTimeUtc = segment?.departure?.time || null;
    const arrivalTimeUtc = segment?.arrival?.time || null;
    const durationMinutes = parseIsoDurationToMinutes(itinerary?.duration) ??
      (departureTimeUtc && arrivalTimeUtc ? Math.max(0, Math.round((new Date(arrivalTimeUtc) - new Date(departureTimeUtc)) / 60000)) : null);

    const flightNumber = [segment?.carrierCode, segment?.number].filter(Boolean).join('');

    return {
      offerId: itinerary?.id || `amadeus_offer_${index}`,
      flightNumber: flightNumber || null,
      airlineName: segment?.carrierName || null,
      originIata: segment?.departure?.airport || null,
      destinationIata: segment?.arrival?.airport || null,
      departureTimeUtc: departureTimeUtc || null,
      arrivalTimeUtc: arrivalTimeUtc || null,
      durationMinutes,
      totalPrice: itinerary?.price?.totalPrice ?? null,
      currency: itinerary?.price?.currency || 'USD',
      available: itinerary?.availability?.isAvailable !== false,
    };
  });

  return offers;
}

/**
 * @param {Object} params
 * @param {string} params.origin IATA origin (3-letter)
 * @param {string} params.destination IATA destination (3-letter)
 * @param {string} params.departureDate YYYY-MM-DD
 * @param {string} [params.returnDate] YYYY-MM-DD
 * @param {number} [params.adults] 1-9 (default 1)
 * @param {string} [params.cabinClass] Travel class (e.g. Economy)
 */
async function getFlightOffers(params = {}) {
  if (!isConfigured()) {
    throw buildError('Amadeus Flight Offers API is not configured. Set AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET to enable.', 'AmadeusNotConfiguredError');
  }

  const origin = String(params.origin || '').trim().toUpperCase();
  const destination = String(params.destination || '').trim().toUpperCase();
  const departureDate = String(params.departureDate || '').trim();
  const returnDate = params.returnDate ? String(params.returnDate).trim() : null;
  const adults = Number.isFinite(Number(params.adults)) ? Math.min(9, Math.max(1, Math.floor(Number(params.adults)))) : 1;
  const cabinClass = params.cabinClass ? String(params.cabinClass).trim() : null;

  if (!/^[A-Z]{3}$/.test(origin)) {
    throw buildError('Invalid origin airport code. Must be a 3-letter IATA code.', 'ValidationError');
  }
  if (!/^[A-Z]{3}$/.test(destination)) {
    throw buildError('Invalid destination airport code. Must be a 3-letter IATA code.', 'ValidationError');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
    throw buildError('Invalid departure date. Expected format YYYY-MM-DD.', 'ValidationError');
  }
  if (returnDate && !/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
    throw buildError('Invalid return date. Expected format YYYY-MM-DD.', 'ValidationError');
  }

  const accessToken = await getAccessToken();

  const queryParams = new URLSearchParams();
  queryParams.set('originLocationCode', origin);
  queryParams.set('destinationLocationCode', destination);
  queryParams.set('departureDate', departureDate);
  if (returnDate) queryParams.set('returnDate', returnDate);
  queryParams.set('adults', String(adults));
  if (cabinClass) queryParams.set('travelClass', cabinClass);
  queryParams.set('currencyCode', 'USD');

  const response = await fetch(`${amadeusConfig.baseUrl}/v1/shopping/flight-offers?${queryParams.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined,
  });

  if (!response.ok) {
    const err = new Error(`Amadeus flight offers request failed (HTTP ${response.status}).`);
    err.name = 'ExternalApiError';
    throw err;
  }

  const payload = await response.json();
  const offers = mapAmadeusOffers(payload);

  return {
    success: true,
    source: 'AMADEUS',
    providerName: 'Amadeus Flight Offers API',
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    cabinClass,
    offers,
    offerCount: offers.length,
    retrievedAtUtc: new Date().toISOString(),
    disclaimer:
      'Flight offers via Amadeus (test environment). Prices are indicative and may vary; AeroNexus does not sell or book flights.',
  };
}

module.exports = {
  isConfigured,
  clearAmadeusTokenCache,
  getFlightOffers,
};
