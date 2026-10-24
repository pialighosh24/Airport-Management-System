const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

describe('AeroNexus Backend API - Phase 2 Comprehensive Test Suite', () => {
  // ------------------------------------------------------------------------
  // 1. Health Check Endpoint
  // ------------------------------------------------------------------------
  describe('Health Check: GET /api/health', () => {
    it('should return 200 OK and identify the service as AeroNexus', async () => {
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.service, 'AeroNexus — Smart Flight Tracking Backend');
      assert.strictEqual(res.body.status, 'healthy');
      assert.ok(typeof res.body.uptimeSeconds === 'number');

      // Phase 4: Database health status
      assert.ok(res.body.database, 'database field should exist');
      assert.strictEqual(typeof res.body.database.connected, 'boolean');
      assert.strictEqual(typeof res.body.database.configured, 'boolean');
      assert.ok(['mysql', 'demo_fallback'].includes(res.body.database.mode));
    });
  });

  // ------------------------------------------------------------------------
  // 2. Flight Endpoints: GET /api/flights
  // ------------------------------------------------------------------------
  describe('Flight Routes: GET /api/flights', () => {
    it('should return 200 OK with clearly labelled demo flights', async () => {
      const res = await request(app).get('/api/flights');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.isDemo, true, 'isDemo flag must be true');
      assert.ok(res.body.disclaimer.includes('SIMULATED DEMO DATA'));
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count > 0);

      // Verify that data strictly identifies as demo
      const firstFlight = res.body.data[0];
      assert.strictEqual(firstFlight.isDemo, true);
      assert.strictEqual(firstFlight.dataSource, 'SAMPLE_DATA_PHASE_2');
    });

    it('should filter flights by valid status', async () => {
      const res = await request(app).get('/api/flights?status=valid');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.every((f) => f.freshness.status === 'valid'));
    });

    it('should return 400 Bad Request when an invalid status filter is passed', async () => {
      const res = await request(app).get('/api/flights?status=invalid_status_xyz');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('should return single flight by flight number', async () => {
      const res = await request(app).get('/api/flights/AA100');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.flightNumber, 'AA100');
      assert.strictEqual(res.body.isDemo, true);
    });

    it('should return 404 when flight number does not exist', async () => {
      const res = await request(app).get('/api/flights/UNKNOWN999');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
    });

    it('should query live OpenSky telemetry via GET /api/flights/live with isDemo: false', async () => {
      const res = await request(app).get('/api/flights/live?limit=5');

      // Either 200 OK (OpenSky reachable) or 503 (OpenSky rate-limited/offline)
      assert.ok([200, 503].includes(res.statusCode), `Status code ${res.statusCode} must be 200 or 503`);

      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.isDemo, false, 'isDemo must be strictly false for live OpenSky data');
        assert.strictEqual(res.body.isLive, true, 'isLive must be true for live OpenSky data');
        assert.strictEqual(res.body.source, 'OPENSKY_NETWORK');
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.disclaimer.includes('ADS-B'));

        if (res.body.data.length > 0) {
          const sample = res.body.data[0];
          assert.strictEqual(sample.isDemo, false);
          assert.strictEqual(sample.isLive, true);
          assert.strictEqual(sample.origin.terminal, null, 'Gate/terminal must be null on ADS-B');
          assert.strictEqual(sample.origin.iata, null, 'Origin airport code must be null via ADS-B (never placeholder)');
          assert.strictEqual(sample.origin.name, null, 'Origin airport name must be null via ADS-B');
          assert.strictEqual(sample.destination.iata, null, 'Destination airport code must be null via ADS-B (never placeholder)');
          assert.strictEqual(sample.destination.name, null, 'Destination airport name must be null via ADS-B');
          assert.strictEqual(sample.airline.name, null, 'Must not invent commercial airline name');
          assert.strictEqual(sample.airline.iata, null, 'Airline IATA must be null via ADS-B');
          assert.notStrictEqual(sample.origin.iata, 'ADSB');
          assert.notStrictEqual(sample.destination.iata, 'LIVE');
          assert.ok(sample.freshness.providerName.includes('OpenSky'));
        }
      } else {
        // If OpenSky is rate-limited in test runner environment
        assert.strictEqual(res.body.isDemo, false);
        assert.strictEqual(res.body.isLive, false);
        assert.ok(res.body.error);
      }
    });
  });

  // ------------------------------------------------------------------------
  // 3. Airport Schedule Endpoints: GET /api/airports/:code/schedule
  // ------------------------------------------------------------------------
  describe('Airport Schedule Routes: GET /api/airports/:code/schedule', () => {
    it('should return 200 OK with arrivals and departures for JFK', async () => {
      const res = await request(app).get('/api/airports/JFK/schedule');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.isDemo, true);
      assert.strictEqual(res.body.airport.iata, 'JFK');
      assert.ok(Array.isArray(res.body.departures));
      assert.ok(Array.isArray(res.body.arrivals));
      assert.ok(res.body.summary.totalFlights > 0);
    });

    it('should filter only departures when ?type=departure is passed', async () => {
      const res = await request(app).get('/api/airports/JFK/schedule?type=departure');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.summary.arrivalsCount, 0);
      assert.ok(res.body.summary.departuresCount > 0);
    });

    it('should return 400 Bad Request when airport code is not a 3-letter IATA code', async () => {
      const res = await request(app).get('/api/airports/TOOLONGCODE/schedule');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('should return 400 Bad Request when ?type query parameter is invalid', async () => {
      const res = await request(app).get('/api/airports/JFK/schedule?type=invalid_type');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('should return 404 Not Found when airport code is valid format but not in demo registry', async () => {
      const res = await request(app).get('/api/airports/ZZZ/schedule');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFoundError');
      assert.ok(Array.isArray(res.body.availableAirports));
    });
  });

  // ------------------------------------------------------------------------
  // 3b. FreeAirportDB Search Endpoints: GET /api/airports?search=CCU
  // ------------------------------------------------------------------------
  describe('Airport Search Routes: GET /api/airports?search=CCU', () => {
    it('should return 200 OK with airport details for CCU from FreeAirportDB', async () => {
      const res = await request(app).get('/api/airports?search=CCU');

      // Either 200 OK (FreeAirportDB reachable) or 502/504 (network/upstream rate limit in CI)
      assert.ok([200, 502, 504].includes(res.statusCode), `Status code ${res.statusCode} must be 200, 502, or 504`);

      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.source, 'FREE_AIRPORT_DB');
        assert.strictEqual(res.body.providerName, 'FreeAirportDB');
        assert.strictEqual(res.body.query, 'CCU');
        assert.ok(Array.isArray(res.body.data));
        assert.ok(res.body.count >= 1);

        const ccu = res.body.data.find((a) => a.iata === 'CCU' || a.icao === 'VECC');
        assert.ok(ccu, 'CCU airport record should be present');
        assert.strictEqual(ccu.iata, 'CCU');
        assert.strictEqual(ccu.icao, 'VECC');
        assert.strictEqual(ccu.city, 'Kolkata');
        assert.strictEqual(ccu.country, 'India');
        assert.strictEqual(ccu.timezone, 'Asia/Kolkata');
        assert.strictEqual(ccu.type, 'large_airport');
        assert.ok(typeof ccu.latitude === 'number');
        assert.ok(typeof ccu.longitude === 'number');
      } else {
        assert.strictEqual(res.body.success, false);
        assert.ok(res.body.error);
      }
    });

    it('should search airports by airport name (e.g. ?search=Heathrow)', async () => {
      const res = await request(app).get('/api/airports?search=Heathrow');

      assert.ok([200, 502, 504].includes(res.statusCode));
      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.ok(Array.isArray(res.body.data));
        const lhr = res.body.data.find((a) => a.iata === 'LHR');
        if (lhr) {
          assert.strictEqual(lhr.iata, 'LHR');
          assert.strictEqual(lhr.icao, 'EGLL');
        }
      }
    });

    it('should support ?q=CCU as alias for ?search=CCU', async () => {
      const res = await request(app).get('/api/airports?q=CCU');

      assert.ok([200, 502, 504].includes(res.statusCode));
      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.query, 'CCU');
      }
    });

    it('should return 400 Bad Request when search query parameter is missing', async () => {
      const res = await request(app).get('/api/airports');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('required'));
    });

    it('should return 400 Bad Request when search query is empty string', async () => {
      const res = await request(app).get('/api/airports?search=');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('empty'));
    });

    it('should return 400 Bad Request when search query is whitespace only', async () => {
      const res = await request(app).get('/api/airports?search=%20%20%20');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('whitespace'));
    });

    it('should return 400 Bad Request when search query exceeds 100 characters', async () => {
      const longQuery = 'A'.repeat(101);
      const res = await request(app).get(`/api/airports?search=${longQuery}`);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('100 characters'));
    });

    it('should return 400 Bad Request when limit query parameter is invalid', async () => {
      const res = await request(app).get('/api/airports?search=CCU&limit=invalid_limit');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
      assert.ok(res.body.message.includes('limit'));
    });
  });


  // ------------------------------------------------------------------------
  // 4. Fare Comparison Endpoints: GET /api/fares
  // ------------------------------------------------------------------------
  describe('Fare Comparison Routes: GET /api/fares', () => {
    it('should return 200 OK with demo fares, transparent ranking, and explicit baggage info', async () => {
      const res = await request(app).get('/api/fares');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.isDemo, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count > 0);

      // Verify explicit baggage rules exist on records
      const firstFare = res.body.data[0];
      assert.ok('baggage' in firstFare);
      assert.ok('personalItemIncluded' in firstFare.baggage);
      assert.ok('cabinBagIncluded' in firstFare.baggage);
      assert.ok('checkedBagIncluded' in firstFare.baggage);
    });

    it('should sort fares by cheapest first when ?sortBy=cheapest', async () => {
      const res = await request(app).get('/api/fares?sortBy=cheapest');

      assert.strictEqual(res.statusCode, 200);
      const fares = res.body.data;
      for (let i = 0; i < fares.length - 1; i++) {
        assert.ok(fares[i].totalFareUsd <= fares[i + 1].totalFareUsd, 'Fares must be in ascending price order');
      }
    });

    it('should sort fares by fastest flight when ?sortBy=fastest', async () => {
      const res = await request(app).get('/api/fares?sortBy=fastest');

      assert.strictEqual(res.statusCode, 200);
      const fares = res.body.data;
      for (let i = 0; i < fares.length - 1; i++) {
        assert.ok(fares[i].durationMinutes <= fares[i + 1].durationMinutes, 'Fares must be in ascending duration order');
      }
    });

    it('should return 400 Bad Request when invalid sortBy parameter is passed', async () => {
      const res = await request(app).get('/api/fares?sortBy=invalid_sort');

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'ValidationError');
    });
  });

  // ------------------------------------------------------------------------
  // 5. Unknown Route Handling
  // ------------------------------------------------------------------------
  describe('Unknown Endpoint Error Handling: GET /api/nonexistent', () => {
    it('should return 404 with structured JSON error', async () => {
      const res = await request(app).get('/api/nonexistent-route');

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'NotFound');
    });
  });

  // ------------------------------------------------------------------------
  // 6. Phase 4: MySQL 8.0 Model & Demo Fallback Suite
  // ------------------------------------------------------------------------
  describe('Phase 4: MySQL 8.0 Integration & Graceful Demo Fallback', () => {
    it('Flight model should have all required schema paths and core principles', () => {
      const Flight = require('../src/models/Flight');

      assert.ok(Flight.schema.paths.flightNumber, 'flightNumber path must exist');
      assert.ok(Flight.schema.paths.callsign, 'callsign path must exist');
      assert.ok(Flight.schema.path('origin'), 'origin path must exist');
      assert.ok(Flight.schema.path('origin.iata'), 'origin.iata path must exist');
      assert.ok(Flight.schema.path('destination'), 'destination path must exist');
      assert.ok(Flight.schema.path('destination.iata'), 'destination.iata path must exist');
      assert.ok(Flight.schema.path('freshness.status'), 'freshness.status path must exist');
      assert.ok(Flight.schema.paths.status, 'status path must exist');
      assert.ok(Flight.schema.paths.isDemo, 'isDemo path must exist');
      assert.ok(Flight.schema.paths.dataSource, 'dataSource path must exist');
      assert.ok(Flight.schema.paths.disclaimer, 'disclaimer path must exist');
    });

    it('Flight model mapRowToFlight should correctly transform MySQL row to client flight telemetry structure', () => {
      const Flight = require('../src/models/Flight');
      const sampleRow = {
        callsign: 'AAL100',
        flight_number: 'AA100',
        airline_name: 'American Airlines',
        airline_iata: 'AA',
        airline_icao: 'AAL',
        aircraft_model: 'Boeing 777-300ER',
        registration: 'N718AN',
        origin_iata: 'JFK',
        origin_icao: 'KJFK',
        origin_name: 'John F. Kennedy Intl',
        origin_city: 'New York',
        origin_country: 'United States',
        origin_terminal: '8',
        origin_gate: 'B12',
        destination_iata: 'LHR',
        destination_icao: 'EGLL',
        destination_name: 'Heathrow Airport',
        destination_city: 'London',
        destination_country: 'United Kingdom',
        destination_terminal: '3',
        destination_gate: null,
        latitude: '52.341200',
        longitude: '-15.421800',
        altitude_feet: 36000,
        ground_speed_knots: 512,
        heading_degrees: 84,
        vertical_rate_fpm: 0,
        squawk_code: '4312',
        status: 'en_route',
        freshness_status: 'valid',
        observation_time_utc: '2026-10-12T12:00:00.000Z',
        retrieval_time_utc: '2026-10-12T12:00:10.000Z',
        age_seconds: 10,
        provider_name: 'North Atlantic ADS-B Satellite Feeder',
        freshness_notes: null,
        is_demo: 1,
        data_source: 'SAMPLE_DATA_PHASE_2',
        disclaimer: 'SIMULATED DEMO DATA',
      };

      const flight = Flight.mapRowToFlight(sampleRow);
      assert.strictEqual(flight.flightNumber, 'AA100');
      assert.strictEqual(flight.callsign, 'AAL100');
      assert.strictEqual(flight.airline.name, 'American Airlines');
      assert.strictEqual(flight.origin.iata, 'JFK');
      assert.strictEqual(flight.destination.iata, 'LHR');
      assert.strictEqual(flight.latitude, 52.3412);
      assert.strictEqual(flight.longitude, -15.4218);
      assert.strictEqual(flight.freshness.status, 'valid');
      assert.strictEqual(flight.isDemo, true);
    });

    it('Flight model flightToRowParams should extract all 38 parameterized query parameters', () => {
      const Flight = require('../src/models/Flight');
      const { DEMO_FLIGHTS } = require('../src/data/demoData');

      const params = Flight.flightToRowParams(DEMO_FLIGHTS[0]);
      assert.strictEqual(params.length, 38, 'Should extract 38 columns for parameterized insertion');
      assert.strictEqual(params[0], DEMO_FLIGHTS[0].callsign);
      assert.strictEqual(params[1], DEMO_FLIGHTS[0].flightNumber);
    });

    it('should report database as not connected and demo mode active when no live DB exists', async () => {
      const res = await request(app).get('/api/health');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.database.connected, false);
      assert.strictEqual(res.body.database.mode, 'demo_fallback');
      assert.ok(res.body.database.message.includes('Demo data fallback active'));
    });

    it('GET /api/flights should maintain complete backward compatibility in demo mode', async () => {
      const res = await request(app).get('/api/flights');

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.isDemo, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
      const flight = res.body.data[0];
      assert.ok(flight.flightNumber);
      assert.ok(flight.callsign);
      assert.ok(flight.origin);
      assert.ok(flight.destination);
      assert.ok(flight.freshness);
    });
  });
});
