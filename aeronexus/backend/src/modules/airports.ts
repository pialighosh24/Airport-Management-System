import { Router } from 'express'
import { z } from 'zod'
import { metaOf } from '../domain/freshness'
import { env } from '../env'
import { HttpError, iata, parse } from '../lib/http'
import { Airport } from '../models'
import { currentWeather, WEATHER } from '../providers/weather'

export const airportsRouter = Router()

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const dto = (a: { iata: string; icao?: string | null; name: string; city: string; country: string; timezone: string; terminals: string[]; location?: { coordinates: number[] } | null }) => ({
  iata: a.iata, icao: a.icao ?? null, name: a.name, city: a.city, country: a.country, timezone: a.timezone,
  terminals: a.terminals, lat: a.location?.coordinates[1] ?? null, lon: a.location?.coordinates[0] ?? null,
})

airportsRouter.get('/airports', async (req, res) => {
  const { query } = parse(z.object({ query: z.string().trim().min(1).max(60).optional() }), req.query)
  if (!query) {
    res.json({ items: (await Airport.find().sort({ iata: 1 }).limit(200).lean()).map(dto) })
    return
  }
  const rx = new RegExp(`^${escape(query)}`, 'i')
  const word = new RegExp(`\\b${escape(query)}`, 'i')
  const hits = await Airport.find({ $or: [{ iata: rx }, { icao: rx }, { city: word }, { name: word }] }).limit(30).lean()
  // exact code first, then code prefix, then city/name
  const q = query.toUpperCase()
  const rank = (a: (typeof hits)[number]) => (a.iata === q || a.icao === q ? 0 : rx.test(a.iata) ? 1 : 2)
  res.json({ items: hits.sort((a, b) => rank(a) - rank(b) || a.city.localeCompare(b.city)).slice(0, 10).map(dto) })
})

airportsRouter.get('/airports/:iata', async (req, res) => {
  const code = parse(iata, req.params.iata)
  const a = await Airport.findOne({ iata: code }).lean()
  if (!a) throw new HttpError(404, 'unknown_airport', `No airport ${code} in the registry.`)
  const [lon, lat] = a.location!.coordinates
  const w = await currentWeather(lat, lon)
  res.json({
    airport: dto(a),
    weather: w
      ? { ...w.weather, meta: metaOf('Open-Meteo', w.weather.fetchedAt, w.weather.observedAt, { liveSec: 20 * 60, staleSec: 90 * 60, forceStale: w.fromCache }) }
      : { meta: metaOf('Open-Meteo', null, null, { liveSec: 0, staleSec: 0 }), unavailableReason: `${WEATHER} did not respond` },
    freshnessWindows: { liveSec: env.FRESHNESS_LIVE_SEC, staleSec: env.FRESHNESS_STALE_SEC },
  })
})
