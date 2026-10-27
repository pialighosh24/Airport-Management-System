import { call } from './registry'

export const WEATHER = 'open-meteo'
const TTL_MS = 10 * 60e3
const cache = new Map<string, { at: number; value: Weather }>()

export type Weather = {
  temperatureC: number | null
  windKmh: number | null
  windDir: number | null
  visibilityM: number | null
  code: number | null
  observedAt: Date | null
  fetchedAt: Date
}

/** General forecast context only. Not METAR/TAF, not for operational use. */
export async function currentWeather(lat: number, lon: number): Promise<{ weather: Weather; fromCache: boolean } | null> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return { weather: hit.value, fromCache: false }
  try {
    const weather = await call(WEATHER, async (signal) => {
      const qs = new URLSearchParams({
        latitude: String(lat), longitude: String(lon), timezone: 'GMT',
        current: 'temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code',
      })
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`, { signal })
      if (!r.ok) throw new Error(`open-meteo ${r.status}`)
      const c = ((await r.json()) as { current?: Record<string, number | string> }).current ?? {}
      const num = (v: unknown) => (typeof v === 'number' ? v : null)
      return {
        temperatureC: num(c.temperature_2m), windKmh: num(c.wind_speed_10m), windDir: num(c.wind_direction_10m),
        visibilityM: num(c.visibility), code: num(c.weather_code),
        observedAt: typeof c.time === 'string' ? new Date(`${c.time}Z`) : null,
        fetchedAt: new Date(),
      }
    })
    cache.set(key, { at: Date.now(), value: weather })
    return { weather, fromCache: false }
  } catch {
    // stale cache beats nothing, and gets labelled STALE by the caller
    return hit ? { weather: hit.value, fromCache: true } : null
  }
}
