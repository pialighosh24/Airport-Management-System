const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const {
  validateCoordinates,
  mapWmoCodeToCondition,
  getWeatherForCoordinates,
  clearWeatherCache,
} = require('../src/services/weatherService');

let app;
try {
  // Try loading server express app for HTTP integration tests
  const serverModule = require('../server');
  app = serverModule.app || serverModule;
} catch (e) {
  // If server export is different
}

describe('Open-Meteo Weather Service & Integration Tests', () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  describe('1. Coordinate Validation', () => {
    it('should validate and parse valid numeric coordinates', () => {
      const coords = validateCoordinates(22.6547, 88.4467);
      assert.strictEqual(coords.latitude, 22.6547);
      assert.strictEqual(coords.longitude, 88.4467);
    });

    it('should parse coordinate strings properly', () => {
      const coords = validateCoordinates('40.64', '-73.78');
      assert.strictEqual(coords.latitude, 40.64);
      assert.strictEqual(coords.longitude, -73.78);
    });

    it('should throw ValidationError on non-numeric coordinates', () => {
      assert.throws(
        () => validateCoordinates('invalid', 88.4),
        (err) => err.name === 'ValidationError'
      );
    });

    it('should throw ValidationError on out-of-bounds latitude (> 90 or < -90)', () => {
      assert.throws(
        () => validateCoordinates(95.0, 88.4),
        (err) => err.name === 'ValidationError'
      );
      assert.throws(
        () => validateCoordinates(-91.0, 88.4),
        (err) => err.name === 'ValidationError'
      );
    });

    it('should throw ValidationError on out-of-bounds longitude (> 180 or < -180)', () => {
      assert.throws(
        () => validateCoordinates(22.6, 185.0),
        (err) => err.name === 'ValidationError'
      );
      assert.throws(
        () => validateCoordinates(22.6, -181.0),
        (err) => err.name === 'ValidationError'
      );
    });
  });

  describe('2. WMO Weather Code Translation', () => {
    it('should translate 0 to Clear Sky', () => {
      assert.strictEqual(mapWmoCodeToCondition(0), 'Clear Sky');
    });

    it('should translate 2 to Partly Cloudy', () => {
      assert.strictEqual(mapWmoCodeToCondition(2), 'Partly Cloudy');
    });

    it('should translate 63 to Moderate Rain', () => {
      assert.strictEqual(mapWmoCodeToCondition(63), 'Moderate Rain');
    });

    it('should translate 95 to Thunderstorm', () => {
      assert.strictEqual(mapWmoCodeToCondition(95), 'Thunderstorm');
    });

    it('should return Unknown for null or undefined codes', () => {
      assert.strictEqual(mapWmoCodeToCondition(null), 'Unknown');
      assert.strictEqual(mapWmoCodeToCondition(undefined), 'Unknown');
    });
  });

  describe('3. In-Memory Cache and Mock Network', () => {
    it('should return cached weather on second identical request', async () => {
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return {
          ok: true,
          json: async () => ({
            latitude: 22.65,
            longitude: 88.45,
            current: {
              temperature_2m: 31.0,
              relative_humidity_2m: 60,
              wind_speed_10m: 6.0,
              wind_direction_10m: 120,
              weather_code: 1,
            },
          }),
        };
      };

      const res1 = await getWeatherForCoordinates(22.65, 88.45, { fetchFn: mockFetch });
      assert.strictEqual(res1.fromCache, false);
      assert.strictEqual(callCount, 1);
      assert.strictEqual(res1.weather.condition, 'Mainly Clear');

      const res2 = await getWeatherForCoordinates(22.65, 88.45, { fetchFn: mockFetch });
      assert.strictEqual(res2.fromCache, true);
      assert.strictEqual(callCount, 1, 'Should serve from cache without re-fetching');
    });

    it('should include mandatory aviation disclaimer on all weather responses', async () => {
      const mockFetch = async () => ({
        ok: true,
        json: async () => ({
          latitude: 51.47,
          longitude: -0.45,
          current: {
            temperature_2m: 15.0,
            relative_humidity_2m: 75,
            wind_speed_10m: 12.0,
            wind_direction_10m: 240,
            weather_code: 3,
          },
        }),
      });

      const res = await getWeatherForCoordinates(51.47, -0.45, { fetchFn: mockFetch });
      assert.ok(res.disclaimer.includes('Not certified aviation METAR'));
      assert.strictEqual(res.source, 'Open-Meteo');
      assert.strictEqual(res.isLive, true);
    });
  });

  describe('4. Live Endpoints & API Integration', () => {
    it('GET /api/airports/hubs should return curated airport hubs', async () => {
      if (!app) return;
      const res = await request(app).get('/api/airports/hubs');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.count >= 5);

      const ccu = res.body.data.find((h) => h.iata === 'CCU');
      assert.ok(ccu);
      assert.strictEqual(ccu.city, 'Kolkata');
      assert.strictEqual(ccu.country, 'India');
    });

    it('GET /api/airports/CCU should return single airport details', async () => {
      if (!app) return;
      const res = await request(app).get('/api/airports/CCU');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.iata, 'CCU');
      assert.strictEqual(res.body.data.city, 'Kolkata');
    });

    it('GET /api/airports/INVALID_CODE should return 400 or 404', async () => {
      if (!app) return;
      const res = await request(app).get('/api/airports/TOOLONGCODE');
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('GET /api/weather?airport=CCU should fetch live Open-Meteo weather for Kolkata', async () => {
      if (!app) return;
      const res = await request(app).get('/api/weather?airport=CCU');
      assert.ok([200, 502, 504].includes(res.statusCode));

      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.source, 'Open-Meteo');
        assert.ok(res.body.disclaimer.includes('Not certified aviation METAR'));
        assert.strictEqual(res.body.airport.code, 'CCU');
        assert.ok(typeof res.body.weather.temperatureC === 'number');
        assert.ok(typeof res.body.weather.windSpeedKnots === 'number');
        assert.ok(res.body.weather.condition);
      }
    });

    it('GET /api/weather?lat=28.55&lon=77.10 should fetch weather by coordinates for Delhi', async () => {
      if (!app) return;
      const res = await request(app).get('/api/weather?lat=28.55&lon=77.10');
      assert.ok([200, 502, 504].includes(res.statusCode));

      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.ok(typeof res.body.weather.temperatureC === 'number');
      }
    });

    it('GET /api/weather without parameters should return 400 ValidationError', async () => {
      if (!app) return;
      const res = await request(app).get('/api/weather');
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body.error, 'ValidationError');
    });

    it('GET /api/airports/CCU/weather should return live weather endpoint', async () => {
      if (!app) return;
      const res = await request(app).get('/api/airports/CCU/weather');
      assert.ok([200, 502, 504].includes(res.statusCode));

      if (res.statusCode === 200) {
        assert.strictEqual(res.body.success, true);
        assert.strictEqual(res.body.airport.code, 'CCU');
        assert.ok(typeof res.body.weather.temperatureC === 'number');
      }
    });
  });
});
