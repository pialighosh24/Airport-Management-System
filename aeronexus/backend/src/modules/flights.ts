import { Router } from 'express'
import { z } from 'zod'
import { DEMO_SOURCE, scheduleFor, simulate } from '../data/demo'
import { airportByIata } from '../data/airports'
import { metaOf } from '../domain/freshness'
import { localDate } from '../domain/geo'
import { env } from '../env'
import { HttpError, iata, parse } from '../lib/http'
import { FlightLeg, StatusSnapshot } from '../models'
import { markDemoTick } from '../providers/registry'
import { publish } from '../realtime'

const windows = { liveSec: env.FRESHNESS_LIVE_SEC, staleSec: env.FRESHNESS_STALE_SEC }

type Leg = Awaited<ReturnType<typeof FlightLeg.findOne>> & {}

export function legDto(l: Leg) {
  const demo = l.source === DEMO_SOURCE
  return {
    flightKey: l.flightKey,
    carrier: l.carrier, carrierName: l.carrierName ?? null, number: l.number, callsign: l.callsign ?? null,
    serviceDate: l.serviceDate,
    origin: airportBrief(l.origin), destination: airportBrief(l.destination),
    scheduledDep: l.scheduledDep, scheduledArr: l.scheduledArr,
    estimatedDep: l.estimatedDep ?? null, estimatedArr: l.estimatedArr ?? null,
    actualDep: l.actualDep ?? null, actualArr: l.actualArr ?? null,
    status: l.status,
    depTerminal: l.depTerminal ?? null, depGate: l.depGate ?? null, arrTerminal: l.arrTerminal ?? null, arrBelt: l.arrBelt ?? null,
    aircraftType: l.aircraftType ?? null,
    meta: metaOf(l.source, l.fetchedAt, l.providerTimestamp ?? null, { ...windows, demo }),
  }
}

const airportBrief = (code: string) => {
  const a = airportByIata.get(code)
  return { iata: code, city: a?.city ?? null, timezone: a?.timezone ?? null }
}

/** Insert today ± 1 day of DEMO schedule. Idempotent: existing legs keep their live state. */
export async function ensureDemoSchedule(now = new Date()) {
  const dates = [-1, 0, 1].map((d) => localDate(new Date(now.getTime() + d * 86400e3), 'Asia/Kolkata'))
  for (const date of dates) {
    const legs = scheduleFor(date).map((l) => ({ ...l, ...simulate(l, now) }))
    const res = await FlightLeg.bulkWrite(legs.map((l) => ({
      updateOne: {
        filter: { flightKey: l.flightKey },
        update: { $setOnInsert: { ...l, source: DEMO_SOURCE, fetchedAt: now } },
        upsert: true,
      },
    })), { ordered: false })
    // history starts with the state each flight was first seen in
    const fresh = Object.keys(res.upsertedIds).map((i) => legs[Number(i)])
    if (fresh.length) {
      await StatusSnapshot.insertMany(fresh.map((l) => ({
        flightKey: l.flightKey, capturedAt: now, status: l.status,
        estimatedDep: l.estimatedDep, estimatedArr: l.estimatedArr, depGate: l.depGate, source: DEMO_SOURCE,
      })))
    }
  }
  // keep the store bounded: drop legs that departed more than two days ago
  await FlightLeg.deleteMany({ scheduledDep: { $lt: new Date(now.getTime() - 2 * 86400e3) } })
}

const TRACKED = ['status', 'estimatedDep', 'estimatedArr', 'actualDep', 'actualArr', 'depGate', 'arrBelt'] as const
const same = (a: unknown, b: unknown) => (a instanceof Date || b instanceof Date ? new Date(a as Date).getTime() === new Date(b as Date).getTime() : a === b)

/** Advance every active DEMO flight to `now`; persist changes, append history, push deltas to airport rooms. */
export async function tickDemoBoard(now = new Date()) {
  const legs = await FlightLeg.find({
    source: DEMO_SOURCE,
    scheduledDep: { $gte: new Date(now.getTime() - 20 * 3600e3), $lte: new Date(now.getTime() + 24 * 3600e3) },
    status: { $nin: ['arrived', 'cancelled'] },
  })
  for (const leg of legs) {
    // occasional knock-on delay before departure, so the board actually moves
    const minsOut = (leg.scheduledDep.getTime() - now.getTime()) / 60e3
    if (leg.sim && minsOut > 20 && minsOut < 180 && Math.random() < 0.004) {
      leg.sim.delayMin = (leg.sim.delayMin ?? 0) + 5 + Math.floor(Math.random() * 20)
    }
    const next = simulate(leg, now)
    const changed = TRACKED.filter((k) => !same(leg.get(k), next[k]))
    if (!changed.length) continue
    const oldStatus = leg.status
    leg.set(next)
    leg.fetchedAt = now
    await leg.save()
    await StatusSnapshot.create({
      flightKey: leg.flightKey, capturedAt: now, status: leg.status,
      estimatedDep: leg.estimatedDep, estimatedArr: leg.estimatedArr, depGate: leg.depGate, source: leg.source,
    })
    publish([`airport:${leg.origin}`, `airport:${leg.destination}`, `flight:${leg.flightKey}`], 'flight.status.updated', leg.source, {
      oldStatus, changed, flight: legDto(leg),
    })
  }
  markDemoTick('demo-schedule')
}

export const flightsRouter = Router()

flightsRouter.get('/airports/:iata/board', async (req, res) => {
  const code = parse(iata, req.params.iata)
  const q = parse(z.object({
    type: z.enum(['departure', 'arrival']).default('departure'),
    hoursBack: z.coerce.number().min(0).max(12).default(2),
    hoursAhead: z.coerce.number().min(1).max(24).default(10),
    limit: z.coerce.number().min(1).max(100).default(100),
  }), req.query)
  if (!airportByIata.has(code)) throw new HttpError(404, 'unknown_airport', `No airport ${code} in the registry.`)
  const now = Date.now()
  const field = q.type === 'departure' ? 'scheduledDep' : 'scheduledArr'
  const legs = await FlightLeg.find({
    [q.type === 'departure' ? 'origin' : 'destination']: code,
    [field]: { $gte: new Date(now - q.hoursBack * 3600e3), $lte: new Date(now + q.hoursAhead * 3600e3) },
  }).sort({ [field]: 1 }).limit(q.limit)
  res.json({
    airport: airportBrief(code), type: q.type, generatedAt: new Date().toISOString(),
    items: legs.map(legDto),
  })
})

flightsRouter.get('/flights/:flightKey', async (req, res) => {
  const key = parse(z.string().regex(/^[A-Z0-9]{2}\d{1,4}[A-Z]?-\d{4}-\d{2}-\d{2}-[A-Z]{3}$/), req.params.flightKey)
  const leg = await FlightLeg.findOne({ flightKey: key })
  if (!leg) throw new HttpError(404, 'unknown_flight', 'We have no record of that flight.')
  const history = await StatusSnapshot.find({ flightKey: key }).sort({ capturedAt: 1 }).limit(100).lean()
  res.json({
    flight: legDto(leg),
    icao24: leg.icao24 ?? null,
    history: history.map((h) => ({ at: h.capturedAt, status: h.status, estimatedDep: h.estimatedDep ?? null, estimatedArr: h.estimatedArr ?? null, depGate: h.depGate ?? null, source: h.source })),
  })
})

/** Search by flight number ("6E 2134", "AI101") or by route (origin + destination). */
flightsRouter.get('/flights', async (req, res) => {
  const q = parse(z.object({
    number: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/).optional(),
    origin: iata.optional(),
    destination: iata.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }), req.query)
  const filter: Record<string, unknown> = {}
  if (q.number) {
    const m = q.number.replace(/\s/, '').match(/^([A-Z0-9]{2})(\d.*)$/)!
    Object.assign(filter, { carrier: m[1], number: m[2] })
  }
  if (q.origin) filter.origin = q.origin
  if (q.destination) filter.destination = q.destination
  if (q.date) filter.serviceDate = q.date
  if (!q.number && !(q.origin && q.destination)) throw new HttpError(400, 'validation_failed', 'Give a flight number, or both origin and destination.')
  const legs = await FlightLeg.find(filter).sort({ scheduledDep: 1 }).limit(50)
  res.json({ items: legs.map(legDto) })
})
