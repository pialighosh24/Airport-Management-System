const { describe, it } = require('node:test');
const assert = require('node:assert');
const { buildCurrentConditions, fetchWeather } = require('../../backend/src/services/weatherService');

describe('AeroNexus Weather Service - Open-Meteo', () => {
  it('should map WMO weather codes to readable conditions', () => {
    const current = buildCurrentConditions({
      time: new Date().toISOString(),
      temperature_2m: 16.4,
      apparent_temperature: 15.1,
      is_day: 1,
      precipitation: 0.2,
      rain: 0.2,
      weather_code: 61,
      cloud_cover: 80,
      wind_speed_10m: 24.5,
      wind_direction_10m: 270,
      wind_gusts_10m: 41,
    });

    assert.ok(current);
    assert.strictEqual(current.condition, 'Rain');
    assert.strictEqual(current.temperatureC, 16.4);
    assert.strictEqual(current.windSpeedKnots, 13.2);
    assert.strictEqual(current.precipitationMm, 0.2);
  });

  it('should convert wind speed from km/h to knots', () => {
    const current = buildCurrentConditions({
      time: new Date().toISOString(),
      temperature_2m: 10,
      apparent_temperature: 9,
      is_day: 0,
      precipitation: 0,
      weather_code: 0,
      wind_speed_10m: 12.4,
      wind_direction_10m: 90,
      wind_gusts_10m: 25,
    });

    assert.ok(current);
    assert.strictEqual(current.windSpeedKnots, 6.7);
    assert.strictEqual(current.windGustKnots, 13.5);
  });

  it('should require latitude and longitude', async () => {
    await assert.rejects(() => fetchWeather({ latitude: null, longitude: 0 }), /Latitude and longitude are required/);
    await assert.rejects(() => fetchWeather({ latitude: 0, longitude: null }), /Latitude and longitude are required/);
  });

  it('should return cached weather data on second call within TTL', async () => {
    let calls = 0;
    const fakeFetch = async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          current_weather: {
            time: new Date().toISOString(),
            temperature_2m: 12,
            apparent_temperature: 11,
            is_day: 0,
            precipitation: 0,
            weather_code: 2,
            cloud_cover: 30,
            wind_speed_10m: 8,
            wind_direction_10m: 180,
            wind_gusts_10m: 14,
          },
          hourly: { time: [] },
          daily: { time: [] },
        }),
      };
    };

    const first = await fetchWeather({ latitude: 40.7128, longitude: -74.006, fetchFn: fakeFetch, forceRefresh: true });
    const second = await fetchWeather({ latitude: 40.7128, longitude: -74.006, fetchFn: fakeFetch });

    assert.strictEqual(first.success, true);
    assert.strictEqual(second.fromCache, true);
    assert.strictEqual(calls, 1, 'Second call within TTL should be served from cache');
  });
});
