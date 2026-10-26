/**
 * AeroNexus — FlightAware AeroAPI Service
 *
 * Integrates the FlightAware AeroAPI (https://aeroapi.flightaware.com) for
 * flight status and tracking information.
 *
 * Integration details:
 * - Base URL: https://aeroapi.flightaware.com/aeroapi (configurable via FLIGHTAWARE_BASE_URL)
 * - Auth:     FLIGHTAWARE_API_KEY (server-side only; sent via x-api-key header)
 * - Endpoint: GET /flight/status?id=<flightIdentifier>
 *
 * Behaviour:
 * - Requires FLIGHTAWARE_API_KEY to be configured.
 * - Returns typed errors when unconfigured / provider failures / timeouts occur.
 * - Exposes only provider-verified fields; nothing is fabricated.
 */

const DEFAULT_FLIGHTAWARE_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';
const DEFAULT_TIMEOUT_MS = 12000;

function isConfigured() {
  return Boolean(process.env.FLIGHTAWARE_API_KEY);
}

function buildError(message, name) {
  const err = new Error(message);
  err.name = name;
  return err;
}

function extractFlightDetails(payload) {
  const container = payload && typeof payload === 'object' ? payload : {};
  const flight = container.flight && typeof container.flight === 'object' ? container.flight : container;

  const details = {
    status: flight?.status ?? flight?.flight_status ?? null,
    description: flight?.description ?? flight?.status_description ?? null,
    requestedFlight: flight?.requested_flight ?? null,
    departureTimeUtc: flight?.times?.departure_utc ?? flight?.times?.departureTimeUtc ?? null,
    arrivalTimeUtc: flight?.times?.arrival_utc ?? flight?.times?.arrivalTimeUtc ?? null,
    origin: flight?.origin ?? flight?.origin_icao ?? null,
    destination: flight?.destination ?? flight?.destination_icao ?? null,
    airline: flight?.airline ?? flight?.airline_name ?? null,
    aircraft: flight?.aircraft ?? flight?.aircraft_icao ?? null,
  };

  return { details, raw: flight };
}

async function getFlightStatus(flightIdentifier) {
  const identifier = String(flightIdentifier || '').trim();
  if (!identifier) {
    throw buildError('Flight identifier is required.', 'ValidationError');
  }
  if (!isConfigured()) {
    throw buildError('FlightAware AeroAPI is not configured. Set FLIGHTAWARE_API_KEY to enable flight status lookups.', 'FlightAwareNotConfiguredError');
  }

  const url = `${process.env.FLIGHTAWARE_BASE_URL || DEFAULT_FLIGHTAWARE_BASE_URL}/flight/status?id=${encodeURIComponent(identifier)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': process.env.FLIGHTAWARE_API_KEY,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout ? AbortSignal.timeout(DEFAULT_TIMEOUT_MS) : undefined,
  });

  if (!response.ok) {
    const err = new Error(`FlightAware AeroAPI flight status request failed (HTTP ${response.status}).`);
    err.name = 'ExternalApiError';
    throw err;
  }

  const payload = await response.json();
  const { details, raw } = extractFlightDetails(payload);

  return {
    success: true,
    source: 'FLIGHTAWARE',
    providerName: 'FlightAware AeroAPI',
    flightIdentifier: identifier,
    flight: details,
    raw,
    retrievedAtUtc: new Date().toISOString(),
    disclaimer:
      'Flight status information via FlightAware AeroAPI. AeroNexus is not affiliated with FlightAware and this is not an official aviation authority feed.',
  };
}

module.exports = {
  isConfigured,
  getFlightStatus,
};
