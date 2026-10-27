import { Router } from 'express'
import { z } from 'zod'
import { coordsOf } from '../data/airports'
import { DEMO_SOURCE, demoPosition } from '../data/demo'
import { metaOf, type Meta } from '../domain/freshness'
import { bestMatch, type MatchResult } from '../domain/matching'
import { env } from '../env'
import { HttpError, parse } from '../lib/http'
import { AircraftState, FlightLeg } from '../models'
import { fetchStates, OPENSKY } from '../providers/opensky'
import { markDemoTick } from '../providers/registry'
import { publish } from '../realtime'

const windows = { liveSec: env.FRESHNESS_LIVE_SEC, staleSec: env.FRESHNESS_STALE_SEC }

type Tracked = {
  icao24: string
  callsign: string | null
  lat: number
  lon: number
  baroAltitude: number | null
  velocity: number | null
  heading: number | null
  onGround: boolean
  observedAt: Date
  fetchedAt: Date
  source: string
  demo: boolean
  stale: boolean // served from cache after a failed refresh
  match: MatchResult | null
  route: { origin: string; destination: string } | null
}

// ponytail: latest positions live in process memory (history goes to the time-series collection);
// move to Redis when running more than one API instance
const latest = new Map<string, Tracked>()

function dto(a: Tracked) {
  const meta: Meta = metaOf(a.source, a.fetchedAt, a.observedAt, { ...windows, demo: a.demo, forceStale: a.stale })
  return {
    icao24: a.icao24, callsign: a.callsign, lat: a.lat, lon: a.lon,
    baroAltitude: a.baroAltitude, velocity: a.velocity, heading: a.heading, onGround: a.onGround,
    // origin/destination only when the match clears the threshold
    match: a.match && a.match.confidence >= env.MATCH_CONFIDENCE_MIN ? { ...a.match, route: a.route } : null,
    meta,
  }
}

async function persist(list: Tracked[]) {
  if (!list.length) return
  await AircraftState.insertMany(list.map((a) => ({
    observedAt: a.observedAt, meta: { icao24: a.icao24, callsign: a.callsign, source: a.source },
    lat: a.lat, lon: a.lon, baroAltitude: a.baroAltitude, velocity: a.velocity, heading: a.heading, onGround: a.onGround,
  })), { ordered: false })
}

function broadcast() {
  publish(['map'], 'aircraft.snapshot', latest.values().next().value?.source ?? 'none', { items: [...latest.values()].map(dto) })
}

/** DEMO: every airborne simulated flight gets a position; identity is exact because the simulator assigned it. */
export async function tickDemoAircraft(now = new Date()) {
  const legs = await FlightLeg.find({ source: DEMO_SOURCE, status: { $in: ['departed', 'en_route', 'diverted'] } }).lean()
  const seen = new Set<string>()
  const fresh: Tracked[] = []
  for (const l of legs) {
    const p = demoPosition({ ...l, actualDep: l.actualDep ?? null, estimatedArr: l.estimatedArr ?? null }, now)
    if (!p || !l.icao24) continue
    seen.add(l.icao24)
    const t: Tracked = {
      icao24: l.icao24, callsign: l.callsign ?? null, lat: p.lat, lon: p.lon, baroAltitude: p.baroAltitude,
      velocity: p.velocity, heading: p.heading, onGround: false, observedAt: now, fetchedAt: now,
      source: DEMO_SOURCE, demo: true, stale: false,
      match: { flightKey: l.flightKey, confidence: 1, evidence: [{ rule: 'icao24', weight: 1, detail: `ICAO24 ${l.icao24} assigned by the simulator` }] },
      route: { origin: l.origin, destination: l.destination },
    }
    latest.set(l.icao24, t)
    fresh.push(t)
  }
  for (const k of latest.keys()) if (!seen.has(k)) latest.delete(k)
  await persist(fresh)
  markDemoTick('demo-aircraft')
  broadcast()
}

/** LIVE: OpenSky state vectors. Matched only against non-DEMO schedules, so demo flights are never pinned on real aircraft. */
export async function pollOpenSky() {
  try {
    const states = await fetchStates()
    const now = new Date()
    const candidates = (await FlightLeg.find({ source: { $ne: DEMO_SOURCE }, status: { $in: ['departed', 'en_route'] } }).lean())
      .flatMap((l) => {
        const o = coordsOf(l.origin), d = coordsOf(l.destination)
        return o && d ? [{ flightKey: l.flightKey, carrier: l.carrier, number: l.number, icao24: l.icao24, depTime: l.estimatedDep ?? l.scheduledDep, arrTime: l.estimatedArr ?? l.scheduledArr, origin: o, destination: d, route: { origin: l.origin, destination: l.destination } }] : []
      })
    latest.clear()
    for (const s of states) {
      const match = bestMatch(s, candidates, env.MATCH_CONFIDENCE_MIN)
      const c = match && candidates.find((x) => x.flightKey === match.flightKey)
      latest.set(s.icao24, { ...s, fetchedAt: now, source: 'OpenSky Network', demo: false, stale: false, match, route: c ? c.route : null })
    }
    await persist([...latest.values()])
  } catch (e) {
    // keep serving what we had, labelled STALE
    for (const a of latest.values()) a.stale = true
    console.warn(`[${OPENSKY}] poll failed:`, e instanceof Error ? e.message : e)
  }
  broadcast()
}

export const trackingRouter = Router()

const bboxSchema = z.string().transform((s, ctx) => {
  const n = s.split(',').map(Number)
  const [minLon, minLat, maxLon, maxLat] = n
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x)) || minLon >= maxLon || minLat >= maxLat ||
    minLat < -90 || maxLat > 90 || minLon < -180 || maxLon > 180) {
    ctx.addIssue({ code: 'custom', message: 'expected minLon,minLat,maxLon,maxLat' })
    return z.NEVER
  }
  if (maxLon - minLon > 90 || maxLat - minLat > 60) {
    ctx.addIssue({ code: 'custom', message: 'box too large (max 90° × 60°)' })
    return z.NEVER
  }
  return { minLon, minLat, maxLon, maxLat }
})

trackingRouter.get('/tracking/states', (req, res) => {
  const { bbox } = parse(z.object({ bbox: bboxSchema }), req.query)
  const items = [...latest.values()]
    .filter((a) => a.lon >= bbox.minLon && a.lon <= bbox.maxLon && a.lat >= bbox.minLat && a.lat <= bbox.maxLat)
    .map(dto)
  res.json({ generatedAt: new Date().toISOString(), mode: env.PROVIDER_MODE, items })
})

const icao24 = z.string().trim().toLowerCase().regex(/^[0-9a-f]{6}$/, 'expected a 6-digit hex ICAO24 address')

trackingRouter.get('/tracking/aircraft/:icao24', (req, res) => {
  const a = latest.get(parse(icao24, req.params.icao24))
  if (!a) throw new HttpError(404, 'not_tracked', 'This aircraft is not in the current picture.')
  res.json(dto(a))
})

trackingRouter.get('/tracking/aircraft/:icao24/trail', async (req, res) => {
  const id = parse(icao24, req.params.icao24)
  const points = await AircraftState.find({ 'meta.icao24': id, observedAt: { $gte: new Date(Date.now() - 3 * 3600e3) } })
    .sort({ observedAt: 1 }).limit(1000).lean()
  res.json({ icao24: id, points: points.map((p) => ({ t: p.observedAt, lat: p.lat, lon: p.lon, alt: p.baroAltitude })) })
})
