/**
 * AeroNexus — Open-Meteo Weather Service
 *
 * Fetches current conditions and short-range forecasts from Open-Meteo
 * (https://api.open-meteo.com/v1). All responses are cached server-side and
 * every payload carries explicit source / freshness metadata so the mobile
 * client can distinguish live data from cached or unavailable data.
 */

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const OPEN_METEO_FORECAST_PATH = '/forecast';
const DEFAULT_TIMEOUT_MS = 10000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

const weatherCache = new Map();

function clearWeatherCache() {
  weatherCache.clear();
}

function parseNumber(value) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function windToKnots(value) {
  const knots = parseNumber(value);
  if (knots == null) return null;
  // Open-Meteo reports wind speed in km/h; 1 knot = 1.852 km/h
  const converted = knots / 1.852;
  return Math.round(converted * 10) / 10;
}

function describeWeatherCode(code) {
  const c = parseInt(code, 10);
  if (c === null || Number.isNaN(c)) return 'Unknown';
  if (c === 0) return 'Clear sky';
  if (c === 1) return 'Mainly clear';
  if (c === 2) return 'Partly cloudy';
  if (c === 3) return 'Overcast';
  if (c === 45 || c === 48) return 'Fog';
  if (c >= 51 && c <= 57) return 'Drizzle';
  if (c === 56 || c === 57) return 'Freezing drizzle';
  if (c >= 61 && c <= 67) return 'Rain';
  if (c === 66 || c === 67) return 'Freezing rain';
  if (c >= 71 && c <= 77) return 'Snow';
  if (c >= 80 && c <= 82) return 'Rain showers';
  if (c === 85 || c === 86) return 'Snow showers';
  if (c >= 95 && c <= 99) return c >= 96 ? 'Thunderstorm with hail' : 'Thunderstorm';
  return 'Unknown';
}

function buildCurrentConditions(current) {
  if (!current) return null;

  const temperatureC = parseNumber(current.temperature) ?? parseNumber(current.temperature_2m);
  const windSpeedKnots = windToKnots(current.windspeed ?? current.wind_speed_10m);
  const windDirectionDegrees = parseNumber(current.winddirection ?? current.wind_direction_10m);
  const windGustKnots = current.wind_gusts_10m != null ? windToKnots(current.wind_gusts_10m) : null;

  const condition = describeWeatherCode(current.weathercode ?? current.weather_code);
  const precipitationMm = parseNumber(current.precipitation) || parseNumber(current.rain) || 0;
  const visibilityKm = parseNumber(current.visibility) || null;

  return {
    temperatureC,
    apparentTemperatureC: parseNumber(current.apparent_temperature) ?? parseNumber(current.apparent_temperature_2m),
    humidityPercent: parseNumber(current.relative_humidity_2m),
    isDay: Boolean(current.is_day),
    precipitationMm,
    weatherCode: parseNumber(current.weathercode ?? current.weather_code),
    condition,
    windSpeedKnots,
    windDirectionDegrees,
    windGustKnots,
    cloudCoverPercent: parseNumber(current.cloud_cover),
    visibilityKm,
    observedAtUtc: current.time
      ? new Date(/^\d{4}-\d{2}-\d{2}T/.test(current.time) && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(current.time) ? `${current.time}Z` : current.time).toISOString()
      : null,
  };
}

function buildForecastSummary(forecastDays, current, hourly) {
  if (!forecastDays || forecastDays.length === 0) {
    return null;
  }

  const first = forecastDays[0];
  const last = forecastDays[forecastDays.length - 1];

  const temps = forecastDays
    .map((d) => parseNumber(d.temperature_2m_max))
    .filter((t) => t != null);
  const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
  const minTemp = temps.length > 0 ? Math.min(...temps) : null;

  const totalPrecipitation = forecastDays.reduce((sum, d) => {
    const rain = parseNumber(d.precipitation_sum) || 0;
    const snow = parseNumber(d.snowfall_sum) || 0;
    return sum + rain + snow;
  }, 0);

  const anyThunderstorm = forecastDays.some((d) => parseInt(d.weather_code, 10) >= 95);

  const windSpeeds = (hourly || [])
    .map((h) => windToKnots(h.wind_speed_10m))
    .filter((v) => v != null);
  const maxWindSpeedKnots = windSpeeds.length > 0 ? Math.max(...windSpeeds) : 0;

  const validFromUtc = first?.time ? new Date(first.time).toISOString() : null;
  const validUntilUtc = last?.time ? new Date(last.time).toISOString() : null;

  const summaryText = anyThunderstorm
    ? 'Elevated thunderstorm probability in the multi-day outlook.'
    : `Temperatures ranging ${minTemp != null ? Math.round(minTemp * 10) / 10 : 'n/a'}°C to ${maxTemp != null ? Math.round(maxTemp * 10) / 10 : 'n/a'}°C with ${Math.round(totalPrecipitation)} mm precipitation across the outlook.`;

  return {
    forecastDays: forecastDays.length,
    validFromUtc,
    validUntilUtc,
    maxTemperatureC: maxTemp,
    minTemperatureC: minTemp,
    totalPrecipitationMm: Math.round(totalPrecipitation * 10) / 10,
    maxWindSpeedKnots: Math.round(maxWindSpeedKnots * 10) / 10,
    thunderstormRisk: anyThunderstorm,
    summary: summaryText,
  };
}

async function fetchWeather(options = {}) {
  const {
    latitude,
    longitude,
    currentWeather = true,
    forecastDays = 2,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn = globalThis.fetch,
    forceRefresh = false,
  } = options;

  if (latitude == null || longitude == null) {
    const err = new Error('Latitude and longitude are required.');
    err.name = 'ValidationError';
    throw err;
  }

  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}::${currentWeather ? 'current' : 'hourly'}::${forecastDays}`;
  const now = Date.now();

  if (!forceRefresh && weatherCache.has(cacheKey)) {
    const entry = weatherCache.get(cacheKey);
    if (now - entry.cachedAt < CACHE_TTL_MS) {
      return { ...entry.payload, fromCache: true };
    }
    weatherCache.delete(cacheKey);
  }

  const url = new URL(`${OPEN_METEO_BASE_URL}${OPEN_METEO_FORECAST_PATH}`);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  if (currentWeather) {
    url.searchParams.set('current_weather', 'true');
  }
  url.searchParams.set('hourly', 'temperature_2m,rain,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,weather_code');
  url.searchParams.set('forecast_days', String(Math.min(Math.max(parseInt(forecastDays, 10) || 2, 1), 7)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AeroNexus-WeatherService/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = new Error(`Open-Meteo returned HTTP ${response.status} (${response.statusText || 'Error'})`);
      err.name = 'ExternalApiError';
      err.statusCode = response.status;
      throw err;
    }

    const payload = await response.json();

    const current = buildCurrentConditions(payload.current_weather);
    const hourlyData = payload.hourly || {};
    const dailyData = payload.daily || {};
    const hourlyTimes = Array.isArray(hourlyData.time) ? hourlyData.time : [];
    const dailyTimes = Array.isArray(dailyData.time) ? dailyData.time : [];

    const hourly = hourlyTimes.map((t, i) => ({
      time: t,
      temperature_2m: hourlyData.temperature_2m?.[i],
      rain: hourlyData.rain?.[i],
      weather_code: hourlyData.weather_code?.[i],
      wind_speed_10m: hourlyData.wind_speed_10m?.[i],
    }));

    const daily = dailyTimes.map((t, i) => ({
      time: t,
      temperature_2m_max: dailyData.temperature_2m_max?.[i],
      temperature_2m_min: dailyData.temperature_2m_min?.[i],
      precipitation_sum: dailyData.precipitation_sum?.[i],
      snowfall_sum: dailyData.snowfall_sum?.[i],
      weather_code: dailyData.weather_code?.[i],
      wind_speed_10m: dailyData.wind_speed_10m?.[i],
    }));

    const result = {
      success: true,
      source: 'OPEN_METEO',
      providerName: 'Open-Meteo',
      latitude: Number(latitude),
      longitude: Number(longitude),
      retrievedAtUtc: new Date().toISOString(),
      current: current
        ? {
            ...current,
            source: 'OPEN_METEO',
          }
        : null,
      forecast: buildForecastSummary(daily, current, hourly),
      dataFreshness: {
        status: current ? 'valid' : 'unavailable',
        retrievalTimeUtc: new Date().toISOString(),
        providerName: 'Open-Meteo',
        notes: current
          ? 'Weather observations are refreshed every 15 minutes from public Open-Meteo archives.'
          : 'No current weather observation could be resolved for the requested coordinates.',
      },
    };

    if (weatherCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = weatherCache.keys().next().value;
      if (oldestKey) weatherCache.delete(oldestKey);
    }
    weatherCache.set(cacheKey, { payload: result, cachedAt: now });

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Open-Meteo request timed out (${Math.round(timeoutMs / 1000)}s).`);
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  }
}

module.exports = {
  OPEN_METEO_BASE_URL,
  weatherCache,
  clearWeatherCache,
  buildCurrentConditions,
  buildForecastSummary,
  fetchWeather,
};
