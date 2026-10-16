const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  transformOpenSkyState,
  deriveFlightStatus,
} = require('../src/services/openSkyService');

describe('OpenSky ADS-B Telemetry Accuracy & Conflict Resolution', () => {
  const RETRIEVAL_TIME_MS = 1700000000000; // Reference retrieval epoch in ms

  // Sample valid state vector
  // [0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact, 5: lon, 6: lat, 7: baro_alt, 8: on_ground, 9: velocity, 10: true_track, 11: vert_rate, 12: sensors, 13: geo_alt, 14: squawk, 15: spi, 16: pos_source]
  const makeState = (overrides = {}) => {
    const base = [
      '4b1812',             // 0: icao24
      'SWR134  ',           // 1: rawCallsign
      'Switzerland',        // 2: originCountry
      1700000000 - 15,      // 3: timePosition (15 seconds old)
      1700000000 - 14,      // 4: lastContact
      8.5555,               // 5: longitude
      47.4582,              // 6: latitude
      10000,                // 7: baroAltitude (meters) -> ~32808 ft
      false,                // 8: onGround
      230.5,                // 9: velocity (m/s) -> ~448 kts
      270.0,                // 10: trueTrack
      -5.2,                 // 11: verticalRate (m/s) -> -1024 fpm
      null,                 // 12: sensors
      10050,                // 13: geoAltitude
      '7000',               // 14: squawk
      false,                // 15: spi
      0,                    // 16: positionSource
    ];

    if (overrides.icao24 !== undefined) base[0] = overrides.icao24;
    if (overrides.callsign !== undefined) base[1] = overrides.callsign;
    if (overrides.originCountry !== undefined) base[2] = overrides.originCountry;
    if (overrides.timePosition !== undefined) base[3] = overrides.timePosition;
    if (overrides.lastContact !== undefined) base[4] = overrides.lastContact;
    if (overrides.longitude !== undefined) base[5] = overrides.longitude;
    if (overrides.latitude !== undefined) base[6] = overrides.latitude;
    if (overrides.baroAltitude !== undefined) base[7] = overrides.baroAltitude;
    if (overrides.onGround !== undefined) base[8] = overrides.onGround;
    if (overrides.velocity !== undefined) base[9] = overrides.velocity;
    if (overrides.trueTrack !== undefined) base[10] = overrides.trueTrack;
    if (overrides.verticalRate !== undefined) base[11] = overrides.verticalRate;
    if (overrides.geoAltitude !== undefined) base[13] = overrides.geoAltitude;
    if (overrides.squawk !== undefined) base[14] = overrides.squawk;

    return base;
  };

  it('1. Never represents placeholder values (ADSB, LIVE, En Route Tracking, Germany Airspace) as actual airport codes or route names', () => {
    const state = makeState({ originCountry: 'Germany' });
    const result = transformOpenSkyState(state, RETRIEVAL_TIME_MS);

    // Origin airport fields must be strictly null
    assert.strictEqual(result.origin.iata, null, 'origin.iata must be null');
    assert.strictEqual(result.origin.icao, null, 'origin.icao must be null');
    assert.strictEqual(result.origin.name, null, 'origin.name must be null');
    assert.strictEqual(result.origin.city, null, 'origin.city must be null');
    assert.strictEqual(result.origin.country, null, 'origin.country must be null');
    assert.strictEqual(result.origin.countryCode, null, 'origin.countryCode must be null');
    assert.notStrictEqual(result.origin.iata, 'ADSB');
    assert.notStrictEqual(result.origin.iata, 'LIVE');
    assert.notStrictEqual(result.origin.name, 'Germany Airspace');
    assert.notStrictEqual(result.origin.name, 'En Route Tracking');

    // Destination airport fields must be strictly null
    assert.strictEqual(result.destination.iata, null, 'destination.iata must be null');
    assert.strictEqual(result.destination.icao, null, 'destination.icao must be null');
    assert.strictEqual(result.destination.name, null, 'destination.name must be null');
    assert.strictEqual(result.destination.city, null, 'destination.city must be null');
    assert.strictEqual(result.destination.country, null, 'destination.country must be null');
    assert.strictEqual(result.destination.countryCode, null, 'destination.countryCode must be null');
    assert.notStrictEqual(result.destination.iata, 'ADSB');
    assert.notStrictEqual(result.destination.iata, 'LIVE');
    assert.notStrictEqual(result.destination.name, 'En Route Tracking');

    // Terminal and gate must be null
    assert.strictEqual(result.origin.terminal, null);
    assert.strictEqual(result.origin.gate, null);
    assert.strictEqual(result.destination.terminal, null);
    assert.strictEqual(result.destination.gate, null);

    // Commercial airline details must remain null - do not invent from origin country
    assert.strictEqual(result.airline.name, null, 'airline.name must be null');
    assert.strictEqual(result.airline.iata, null, 'airline.iata must be null');
    assert.strictEqual(result.airline.icao, null, 'airline.icao must be null');
    assert.notStrictEqual(result.airline.name, 'Germany Registered Aircraft');

    // Country of registration is preserved as genuine telemetry metadata, not an invented airline or route
    assert.strictEqual(result.countryOfRegistration, 'Germany');
  });

  it('2. Correctly preserves null values when transponder metrics are missing', () => {
    const nullState = makeState({
      callsign: null,
      baroAltitude: null,
      geoAltitude: null,
      velocity: null,
      trueTrack: null,
      verticalRate: null,
      squawk: null,
    });

    const result = transformOpenSkyState(nullState, RETRIEVAL_TIME_MS);

    assert.strictEqual(result.callsign, null, 'Missing callsign must remain null');
    assert.strictEqual(result.flightNumber, '4B1812', 'Missing callsign falls back to uppercase icao24');
    assert.strictEqual(result.altitudeFeet, null, 'Missing altitude must remain null');
    assert.strictEqual(result.groundSpeedKnots, null, 'Missing velocity must remain null');
    assert.strictEqual(result.headingDegrees, null, 'Missing track must remain null');
    assert.strictEqual(result.verticalRateFpm, null, 'Missing vertical rate must remain null');
    assert.strictEqual(result.squawkCode, null, 'Missing squawk must remain null');
    assert.strictEqual(result.aircraftModel, null, 'Aircraft model must remain null');
    assert.strictEqual(result.registration, null, 'Registration must remain null');
  });

  it('3. Trims whitespace from callsigns and returns null for empty or space-only callsigns', () => {
    const whitespaceCallsign = makeState({ callsign: '   ' });
    const result = transformOpenSkyState(whitespaceCallsign, RETRIEVAL_TIME_MS);
    assert.strictEqual(result.callsign, null);
    assert.strictEqual(result.flightNumber, '4B1812');

    const validCallsign = makeState({ callsign: ' DLH456 ' });
    const result2 = transformOpenSkyState(validCallsign, RETRIEVAL_TIME_MS);
    assert.strictEqual(result2.callsign, 'DLH456');
    assert.strictEqual(result2.flightNumber, 'DLH456');
  });

  it('4. Flags conflicting telemetry when onGround=true at high altitude without inventing replacement values', () => {
    // Aircraft broadcasts onGround=true, but altitude is 10,000m (~32,808 ft)
    const conflictState = makeState({
      onGround: true,
      baroAltitude: 10000,
    });

    const result = transformOpenSkyState(conflictState, RETRIEVAL_TIME_MS);

    // Raw transponder values MUST NOT be replaced with invented values
    assert.strictEqual(result.onGround, true, 'Must preserve raw onGround value');
    assert.strictEqual(result.altitudeFeet, 32808, 'Must preserve raw altitude value');

    // Telemetry conflict must be detected and flagged
    assert.strictEqual(result.telemetryFlags.hasConflict, true);
    assert.strictEqual(result.telemetryFlags.conflictType, 'ON_GROUND_HIGH_ALTITUDE');
    assert.ok(result.telemetryFlags.description.includes('on-ground'));
    assert.ok(result.freshness.notes.includes('Warning'));

    // Status must NOT be labeled 'landed' when flying at 32,800 ft
    assert.notStrictEqual(result.status, 'landed');
    assert.strictEqual(result.status, 'en_route');
  });

  it('5. Flags conflicting telemetry when onGround=true with high ground speed (> 200 kts)', () => {
    const conflictSpeedState = makeState({
      onGround: true,
      baroAltitude: 0, // 0 ft
      velocity: 150,   // ~292 kts
    });

    const result = transformOpenSkyState(conflictSpeedState, RETRIEVAL_TIME_MS);

    assert.strictEqual(result.onGround, true);
    assert.strictEqual(result.groundSpeedKnots, 292);
    assert.strictEqual(result.telemetryFlags.hasConflict, true);
    assert.strictEqual(result.telemetryFlags.conflictType, 'ON_GROUND_HIGH_SPEED');
  });

  it('6. Distinguishes fresh observations (<= 60s) from stale (> 60s) and missing coordinates', () => {
    // 15 seconds old -> valid
    const freshState = makeState({ timePosition: 1700000000 - 15 });
    const freshResult = transformOpenSkyState(freshState, RETRIEVAL_TIME_MS);
    assert.strictEqual(freshResult.freshness.status, 'valid');
    assert.strictEqual(freshResult.freshness.ageSeconds, 15);

    // 90 seconds old -> stale
    const staleState = makeState({ timePosition: 1700000000 - 90 });
    const staleResult = transformOpenSkyState(staleState, RETRIEVAL_TIME_MS);
    assert.strictEqual(staleResult.freshness.status, 'stale');
    assert.strictEqual(staleResult.freshness.ageSeconds, 90);

    // Missing coordinates -> missing
    const missingCoordsState = makeState({ latitude: null, longitude: null });
    const missingResult = transformOpenSkyState(missingCoordsState, RETRIEVAL_TIME_MS);
    assert.strictEqual(missingResult.freshness.status, 'missing');
  });

  it('7. Preserves observation timestamps and calculates elapsed age accurately', () => {
    const epoch = 1700000000 - 45;
    const state = makeState({ timePosition: epoch });
    const result = transformOpenSkyState(state, RETRIEVAL_TIME_MS);

    assert.strictEqual(result.freshness.ageSeconds, 45);
    assert.strictEqual(result.freshness.observationTimeUtc, new Date(epoch * 1000).toISOString());
    assert.strictEqual(result.freshness.retrievalTimeUtc, new Date(RETRIEVAL_TIME_MS).toISOString());
    assert.strictEqual(result.freshness.timePositionUtc, new Date(epoch * 1000).toISOString());
  });

  it('8. Ensures live mode is strictly separated from demo fleet', () => {
    const state = makeState();
    const result = transformOpenSkyState(state, RETRIEVAL_TIME_MS);

    assert.strictEqual(result.isDemo, false, 'isDemo must be strictly false');
    assert.strictEqual(result.isLive, true, 'isLive must be true');
    assert.strictEqual(result.dataSource, 'OPENSKY_NETWORK_LIVE');
    assert.strictEqual(result.countryOfRegistration, 'Switzerland');
  });

  it('9. Never invents commercial airline names or airport names from aircraft registration country', () => {
    const countries = ['Germany', 'Turkey', 'United States', 'France', 'Japan'];
    for (const country of countries) {
      const state = makeState({ originCountry: country });
      const result = transformOpenSkyState(state, RETRIEVAL_TIME_MS);

      // Origin and destination airports remain strictly null
      assert.strictEqual(result.origin.name, null);
      assert.strictEqual(result.origin.iata, null);
      assert.strictEqual(result.origin.city, null);
      assert.strictEqual(result.origin.country, null);
      assert.strictEqual(result.destination.name, null);
      assert.strictEqual(result.destination.iata, null);
      assert.strictEqual(result.destination.city, null);
      assert.strictEqual(result.destination.country, null);

      // Commercial airline details remain strictly null
      assert.strictEqual(result.airline.name, null);
      assert.strictEqual(result.airline.iata, null);
      assert.strictEqual(result.airline.icao, null);

      // Explicit check against previous fabricated strings
      assert.notStrictEqual(result.airline.name, `${country} Registered Aircraft`);
      assert.notStrictEqual(result.origin.name, `${country} Airspace`);
      assert.notStrictEqual(result.origin.city, country);
      assert.notStrictEqual(result.destination.name, 'En Route Tracking');

      // Genuine OpenSky transponder country is preserved in countryOfRegistration
      assert.strictEqual(result.countryOfRegistration, country);
    }
  });
});
