const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  transformAirport,
  searchAirports,
  clearSearchCache,
  FREE_AIRPORT_DB_URL,
} = require('../src/services/airportService');

describe('FreeAirportDB Service - Unit & Integration Tests', () => {
  beforeEach(() => {
    clearSearchCache();
  });

  // ------------------------------------------------------------------------
  // 1. Airport Transformation & Data Integrity
  // ------------------------------------------------------------------------
  describe('transformAirport data normalization', () => {
    it('should correctly normalize a full FreeAirportDB raw airport record', () => {
      const raw = {
        code: 'VECC',
        iata: 'CCU',
        icao: 'VECC',
        name: 'Netaji Subhash Chandra Bose International Airport',
        continent_code: 'AS',
        continent_name: 'Asia',
        region_code: 'IN-WB',
        region_name: 'West Bengal',
        country_code: 'IN',
        country_name: 'India',
        municipality: 'Kolkata',
        latitude: 22.654012,
        longitude: 88.44765,
        elevation: 4.9,
        elevation_ft: 16.1,
        time_zone: 'Asia/Kolkata',
        type: 'large_airport',
      };

      const result = transformAirport(raw);

      assert.strictEqual(result.code, 'VECC');
      assert.strictEqual(result.iata, 'CCU');
      assert.strictEqual(result.icao, 'VECC');
      assert.strictEqual(result.name, 'Netaji Subhash Chandra Bose International Airport');
      assert.strictEqual(result.city, 'Kolkata');
      assert.strictEqual(result.country, 'India');
      assert.strictEqual(result.countryCode, 'IN');
      assert.strictEqual(result.region, 'West Bengal');
      assert.strictEqual(result.regionCode, 'IN-WB');
      assert.strictEqual(result.continent, 'Asia');
      assert.strictEqual(result.continentCode, 'AS');
      assert.strictEqual(result.latitude, 22.654012);
      assert.strictEqual(result.longitude, 88.44765);
      assert.strictEqual(result.elevation, 4.9);
      assert.strictEqual(result.elevationFt, 16.1);
      assert.strictEqual(result.timezone, 'Asia/Kolkata');
      assert.strictEqual(result.type, 'large_airport');
    });

    it('should preserve nulls and NEVER invent fake airport details when fields are missing', () => {
      const rawWithMissingFields = {
        code: 'AE-0237',
        iata: 'dst',
        icao: null,
        name: 'Dubai Seaplane Terminal',
        continent_code: null,
        continent_name: null,
        region_code: null,
        region_name: null,
        country_code: 'ae',
        country_name: 'United Arab Emirates',
        municipality: null,
        latitude: 25.263,
        longitude: 55.272,
        elevation: null,
        elevation_ft: null,
        time_zone: null,
        type: 'seaplane_base',
      };

      const result = transformAirport(rawWithMissingFields);

      assert.strictEqual(result.code, 'AE-0237');
      assert.strictEqual(result.iata, 'DST', 'IATA code must be normalized to uppercase');
      assert.strictEqual(result.icao, null, 'Missing ICAO must remain null (never fake or placeholder)');
      assert.strictEqual(result.city, null, 'Missing municipality must remain null');
      assert.strictEqual(result.countryCode, 'AE');
      assert.strictEqual(result.elevation, null, 'Missing elevation must remain null');
      assert.strictEqual(result.elevationFt, null);
      assert.strictEqual(result.timezone, null, 'Missing timezone must remain null');
      assert.strictEqual(result.continent, null);
      assert.strictEqual(result.continentCode, null);
      assert.strictEqual(result.type, 'seaplane_base');
    });

    it('should safely return null for invalid, empty, or non-object inputs', () => {
      assert.strictEqual(transformAirport(null), null);
      assert.strictEqual(transformAirport(undefined), null);
      assert.strictEqual(transformAirport('invalid-string'), null);
      assert.strictEqual(transformAirport(123), null);
      assert.strictEqual(transformAirport([]), null);
    });

    it('should parse coordinate numbers represented as strings', () => {
      const raw = {
        name: 'Test Strip',
        latitude: '12.345',
        longitude: '-67.890',
        elevation: '100',
        elevation_ft: '328.08',
      };

      const result = transformAirport(raw);
      assert.strictEqual(result.latitude, 12.345);
      assert.strictEqual(result.longitude, -67.89);
      assert.strictEqual(result.elevation, 100);
      assert.strictEqual(result.elevationFt, 328.08);
    });
  });

  // ------------------------------------------------------------------------
  // 2. Input Validation
  // ------------------------------------------------------------------------
  describe('searchAirports input validation', () => {
    it('should throw ValidationError when query is null or undefined', async () => {
      await assert.rejects(
        async () => searchAirports(null),
        (err) => err.name === 'ValidationError' && err.message.includes('required')
      );

      await assert.rejects(
        async () => searchAirports(undefined),
        (err) => err.name === 'ValidationError'
      );
    });

    it('should throw ValidationError when query is empty or whitespace only', async () => {
      await assert.rejects(
        async () => searchAirports(''),
        (err) => err.name === 'ValidationError' && err.message.includes('empty')
      );

      await assert.rejects(
        async () => searchAirports('   '),
        (err) => err.name === 'ValidationError' && err.message.includes('whitespace')
      );
    });

    it('should throw ValidationError when query exceeds 100 characters', async () => {
      const longQuery = 'A'.repeat(101);
      await assert.rejects(
        async () => searchAirports(longQuery),
        (err) => err.name === 'ValidationError' && err.message.includes('100 characters')
      );
    });
  });

  // ------------------------------------------------------------------------
  // 3. Mocked HTTP & Network Resilience
  // ------------------------------------------------------------------------
  describe('searchAirports network & error handling', () => {
    it('should correctly query FreeAirportDB and return envelope with transformed records', async () => {
      let requestedUrl = null;
      let requestedHeaders = null;

      const mockFetch = async (url, options) => {
        requestedUrl = url;
        requestedHeaders = options.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                code: 'VECC',
                iata: 'CCU',
                icao: 'VECC',
                name: 'Netaji Subhash Chandra Bose International Airport',
                municipality: 'Kolkata',
                country_name: 'India',
                country_code: 'IN',
                latitude: 22.654,
                longitude: 88.447,
                elevation: 5,
                elevation_ft: 16,
                time_zone: 'Asia/Kolkata',
                type: 'large_airport',
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
        };
      };

      const result = await searchAirports('CCU', { fetchFn: mockFetch });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.source, 'FREE_AIRPORT_DB');
      assert.strictEqual(result.providerName, 'FreeAirportDB');
      assert.strictEqual(result.query, 'CCU');
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].iata, 'CCU');
      assert.strictEqual(result.data[0].city, 'Kolkata');

      assert.ok(requestedUrl.startsWith(FREE_AIRPORT_DB_URL));
      assert.ok(requestedUrl.includes('q=CCU'));
      assert.strictEqual(requestedHeaders['Accept'], 'application/json');
    });

    it('should throw ExternalApiError when FreeAirportDB returns non-2xx status', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await assert.rejects(
        async () => searchAirports('JFK', { fetchFn: mockFetch }),
        (err) => {
          assert.strictEqual(err.name, 'ExternalApiError');
          assert.strictEqual(err.statusCode, 503);
          assert.ok(err.message.includes('503'));
          return true;
        }
      );
    });

    it('should throw TimeoutError when request is aborted by timeout', async () => {
      const mockFetch = async () => {
        const abortErr = new Error('The operation was aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      };

      await assert.rejects(
        async () => searchAirports('LHR', { fetchFn: mockFetch, timeoutMs: 100 }),
        (err) => {
          assert.strictEqual(err.name, 'TimeoutError');
          assert.ok(err.message.includes('timed out'));
          return true;
        }
      );
    });

    it('should serve subsequent identical requests from in-memory cache', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ code: 'KJFK', iata: 'JFK', name: 'John F Kennedy International Airport' }],
            total: 1,
          }),
        };
      };

      const firstResult = await searchAirports('JFK', { fetchFn: mockFetch });
      assert.strictEqual(callCount, 1);
      assert.strictEqual(firstResult.fromCache, undefined);

      const secondResult = await searchAirports('JFK', { fetchFn: mockFetch });
      assert.strictEqual(callCount, 1, 'Second call must be served from cache without invoking fetch');
      assert.strictEqual(secondResult.fromCache, true);
      assert.strictEqual(secondResult.data[0].iata, 'JFK');
    });
  });

  // ------------------------------------------------------------------------
  // 4. Live API Connectivity (Non-breaking gracefully when network present)
  // ------------------------------------------------------------------------
  describe('FreeAirportDB Live Endpoint Integration', () => {
    it('should fetch live airport details for CCU from FreeAirportDB', async () => {
      try {
        const result = await searchAirports('CCU', { forceRefresh: true, timeoutMs: 8000 });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.source, 'FREE_AIRPORT_DB');
        assert.ok(result.count >= 1);
        const ccuAirport = result.data.find((a) => a.iata === 'CCU' || a.icao === 'VECC');
        assert.ok(ccuAirport, 'CCU airport must be present in search results');
        assert.strictEqual(ccuAirport.iata, 'CCU');
        assert.strictEqual(ccuAirport.icao, 'VECC');
        assert.ok(ccuAirport.name.includes('Netaji Subhash Chandra Bose') || ccuAirport.name.includes('Kolkata'));
        assert.strictEqual(ccuAirport.city, 'Kolkata');
        assert.strictEqual(ccuAirport.country, 'India');
        assert.ok(typeof ccuAirport.latitude === 'number');
        assert.ok(typeof ccuAirport.longitude === 'number');
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'ExternalApiError') {
          console.warn(`[Live Test Note] FreeAirportDB temporarily unreachable: ${err.message}`);
        } else {
          throw err;
        }
      }
    });

    it('should search airports by name (e.g. Heathrow) on live API', async () => {
      try {
        const result = await searchAirports('Heathrow', { forceRefresh: true, timeoutMs: 8000 });

        assert.strictEqual(result.success, true);
        assert.ok(result.count >= 1);
        const lhr = result.data.find((a) => a.iata === 'LHR');
        assert.ok(lhr, 'Heathrow Airport (LHR) should be found in results');
        assert.strictEqual(lhr.iata, 'LHR');
        assert.strictEqual(lhr.icao, 'EGLL');
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'ExternalApiError') {
          console.warn(`[Live Test Note] FreeAirportDB temporarily unreachable: ${err.message}`);
        } else {
          throw err;
        }
      }
    });

    it('should return empty results gracefully for non-existent airport query', async () => {
      try {
        const result = await searchAirports('ZZZZNONEXISTENTAIRPORT', { forceRefresh: true, timeoutMs: 8000 });

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.count, 0);
        assert.deepStrictEqual(result.data, []);
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'ExternalApiError') {
          console.warn(`[Live Test Note] FreeAirportDB temporarily unreachable: ${err.message}`);
        } else {
          throw err;
        }
      }
    });
  });
});
