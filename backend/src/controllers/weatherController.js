/**
 * AeroNexus — Weather Controller
 *
 * Exposes Open-Meteo derived weather intelligence through a single,
 * consistently shaped REST endpoint.
 */

const { fetchWeather, clearWeatherCache } = require('../services/weatherService');
const { DEMO_DISCLAIMER } = require('../data/demoData');

const DEFAULT_FORECAST_DAYS = 2;

/**
 * @route   GET /api/weather
 * @desc    Get current weather conditions + short range forecast for coordinates
 * @query   latitude  (required) Latitude
 * @query   longitude (required) Longitude
 * @query   forecastDays (optional) 1-7, default 2
 * @query   refresh (optional) true/false, default false (uses cache)
 */
async function getWeather(req, res) {
  try {
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);

    if (req.query.latitude == null || req.query.longitude == null) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Query parameters "latitude" and "longitude" are required.',
      });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Query parameters "latitude" and "longitude" must be valid numbers.',
      });
    }

    const forecastDays = Math.min(Math.max(parseInt(req.query.forecastDays, 10) || DEFAULT_FORECAST_DAYS, 1), 7);
    const forceRefresh = String(req.query.refresh).toLowerCase() === 'true';

    const result = await fetchWeather({ latitude, longitude, forecastDays, forceRefresh });

    return res.status(200).json({
      success: true,
      source: result.source,
      providerName: result.providerName,
      latitude: result.latitude,
      longitude: result.longitude,
      current: result.current,
      forecast: result.forecast,
      dataFreshness: result.dataFreshness,
      retrievedAtUtc: result.retrievedAtUtc,
      ...(result.fromCache ? { fromCache: true, cacheAgeSeconds: Math.round((Date.now() - new Date(result.retrievedAtUtc).getTime()) / 1000) } : {}),
      disclaimer: 'Weather observations via Open-Meteo (https://api.open-meteo.com). AeroNexus is not an official aviation meteorology provider.',
      ...(result.fromCache ? {} : {}),
    });
  } catch (err) {
    console.error(`❌ [Weather API Error]: ${err.message}`);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: 'ValidationError', message: err.message });
    }
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ success: false, error: 'GatewayTimeout', message: 'Weather service timed out. Please retry.' });
    }
    if (err.name === 'ExternalApiError') {
      return res.status(502).json({ success: false, error: 'BadGateway', message: `Weather provider error: ${err.message}` });
    }
    return res.status(500).json({ success: false, error: 'ServerError', message: 'Failed to retrieve weather data.' });
  }
}

module.exports = {
  getWeather,
  clearWeatherCache,
};
