// DEMO simulator. Everything produced here is fictional schedule data and is always labelled DEMO.
import { distanceKm, interpolate, zonedTime } from '../domain/geo'
import { airportByIata, coordsOf } from './airports'
import type { FlightStatus } from '../models'

export const DEMO_SOURCE = 'AeroNexus simulator'

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
export function rng(seed: string) {
  let a = hash(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const AIRLINES = {
  '6E': { icao: 'IGO', name: 'IndiGo', domestic: 0.55 },
  AI: { icao: 'AIC', name: 'Air India', domestic: 0.2 },
  QP: { icao: 'AKJ', name: 'Akasa Air', domestic: 0.1 },
  IX: { icao: 'AXB', name: 'Air India Express', domestic: 0.1 },
  SG: { icao: 'SEJ', name: 'SpiceJet', domestic: 0.05 },
  EK: { icao: 'UAE', name: 'Emirates', domestic: 0 },
  QR: { icao: 'QTR', name: 'Qatar Airways', domestic: 0 },
  SQ: { icao: 'SIA', name: 'Singapore Airlines', domestic: 0 },
  BA: { icao: 'BAW', name: 'British Airways', domestic: 0 },
  LH: { icao: 'DLH', name: 'Lufthansa', domestic: 0 },
} as const
type Carrier = keyof typeof AIRLINES

const HUBS = ['DEL', 'BOM', 'BLR', 'CCU', 'MAA', 'HYD', 'COK', 'AMD']
const SPOKES = ['PNQ', 'GOI', 'JAI', 'LKO', 'GAU', 'TRV', 'IXC', 'PAT', 'BBI', 'SXR', 'IXB']
const INTL: [string, string, Carrier[]][] = [
  ['DEL', 'DXB', ['EK', 'AI', '6E']], ['BOM', 'DXB', ['EK', '6E']], ['BLR', 'DXB', ['EK']], ['COK', 'DXB', ['EK', 'IX']],
  ['DEL', 'DOH', ['QR', '6E']], ['BOM', 'DOH', ['QR']], ['DEL', 'SIN', ['SQ', 'AI']], ['BOM', 'SIN', ['SQ']],
  ['MAA', 'SIN', ['SQ', '6E']], ['DEL', 'BKK', ['AI', '6E']], ['DEL', 'KTM', ['AI', '6E']], ['MAA', 'CMB', ['6E']],
  ['CCU', 'DAC', ['6E']], ['DEL', 'LHR', ['AI', 'BA']], ['BOM', 'LHR', ['BA', 'AI']], ['DEL', 'FRA', ['LH']],
  ['DEL', 'JFK', ['AI']],
]

type Route = { origin: string; destination: string; carriers: Carrier[]; perDay: number }

function routes(): Route[] {
  const out: Route[] = []
  const dom: Carrier[] = ['6E', 'AI', 'QP', 'IX', 'SG']
  for (const a of HUBS) for (const b of HUBS) if (a !== b) out.push({ origin: a, destination: b, carriers: dom, perDay: 5 })
  for (const h of ['DEL', 'BOM', 'BLR', 'HYD']) for (const s of SPOKES) {
    out.push({ origin: h, destination: s, carriers: dom, perDay: 2 }, { origin: s, destination: h, carriers: dom, perDay: 2 })
  }
  for (const [a, b, c] of INTL) out.push({ origin: a, destination: b, carriers: c, perDay: 1 }, { origin: b, destination: a, carriers: c, perDay: 1 })
  return out
}

function pickCarrier(r: Route, rand: () => number): Carrier {
  if (r.carriers.length === 1) return r.carriers[0]
  const weights = r.carriers.map((c) => AIRLINES[c].domestic || 1)
  let x = rand() * weights.reduce((s, w) => s + w, 0)
  for (let i = 0; i < weights.length; i++) if ((x -= weights[i]) <= 0) return r.carriers[i]
  return r.carriers[0]
}

export type DemoLeg = ReturnType<typeof scheduleFor>[number]

/** Deterministic schedule for one service date (origin-local calendar date). */
export function scheduleFor(serviceDate: string) {
  const used = new Set<string>()
  const legs = []
  for (const r of routes()) {
    const from = airportByIata.get(r.origin)!, to = airportByIata.get(r.destination)!
    const km = distanceKm(coordsOf(r.origin)!, coordsOf(r.destination)!)
    const intl = from.country !== to.country
    for (let i = 0; i < r.perDay; i++) {
      // route-level seed keeps the same flight numbers every day; day-level seed varies ops
      const rr = rng(`${r.origin}${r.destination}${i}`)
      const day = rng(`${serviceDate}${r.origin}${r.destination}${i}`)
      const carrier = pickCarrier(r, rr)
      let num = String(100 + Math.floor(rr() * 8800))
      while (used.has(carrier + num)) num = String(Number(num) + 1)
      used.add(carrier + num)
      const depMin = 300 + Math.floor((i / r.perDay + rr() / r.perDay) * 1080 / 5) * 5
      const blockMin = Math.round((km / 760) * 60 + 30)
      const scheduledDep = zonedTime(serviceDate, depMin, from.timezone)
      const scheduledArr = new Date(scheduledDep.getTime() + blockMin * 60e3)
      const roll = day()
      const fate = roll < 0.015 ? 'cancel' : roll < 0.02 ? 'divert' : 'normal'
      const d = day()
      const delayMin = d < 0.7 ? 0 : d < 0.9 ? 5 + Math.floor(day() * 25) : 30 + Math.floor(day() * 90)
      const terminals = from.terminals
      legs.push({
        flightKey: `${carrier}${num}-${serviceDate}-${r.origin}`,
        carrier, carrierName: AIRLINES[carrier].name, number: num,
        callsign: `${AIRLINES[carrier].icao}${num}`,
        icao24: 'd' + hash(`${carrier}${num}${serviceDate}`).toString(16).padStart(8, '0').slice(-5),
        serviceDate, origin: r.origin, destination: r.destination, scheduledDep, scheduledArr,
        depTerminal: terminals.length ? terminals[Math.floor(rr() * terminals.length)] : null,
        arrTerminal: to.terminals.length ? to.terminals[Math.floor(rr() * to.terminals.length)] : null,
        aircraftType: intl ? (km > 5000 ? 'Boeing 777-300ER' : 'Boeing 787-8') : ['Airbus A320neo', 'Airbus A321neo', 'Boeing 737-8'][Math.floor(rr() * 3)],
        sim: { delayMin, fate, gate: `${'ABCD'[Math.floor(rr() * 4)]}${1 + Math.floor(rr() * 40)}`, belt: String(1 + Math.floor(rr() * 12)) },
      })
    }
  }
  return legs
}

type SimInput = {
  scheduledDep: Date; scheduledArr: Date
  sim?: { delayMin?: number | null; fate?: string | null; gate?: string | null; belt?: string | null } | null
}

/** Where a simulated flight is at `now`. Pure: same inputs, same answer. */
export function simulate(leg: SimInput, now: Date) {
  const delay = (leg.sim?.delayMin ?? 0) * 60e3
  const fate = leg.sim?.fate ?? 'normal'
  const t = now.getTime()
  const sDep = leg.scheduledDep.getTime(), sArr = leg.scheduledArr.getTime()
  const estDep = sDep + delay
  const estArr = sArr + Math.max(0, delay - 10 * 60e3) // a little catch-up en route
  const gate = t >= sDep - 150 * 60e3 ? (leg.sim?.gate ?? null) : null
  const base = { estimatedDep: new Date(estDep), estimatedArr: new Date(estArr), actualDep: null as Date | null, actualArr: null as Date | null, depGate: gate, arrBelt: null as string | null }

  if (fate === 'cancel' && t >= sDep - 180 * 60e3) {
    return { ...base, status: 'cancelled' as FlightStatus, estimatedDep: null, estimatedArr: null, depGate: null }
  }
  let status: FlightStatus
  if (t < estDep - 45 * 60e3) status = delay >= 15 * 60e3 ? 'delayed' : 'scheduled'
  else if (t < estDep) status = 'boarding'
  else if (t < estDep + 12 * 60e3) status = 'departed'
  else if (t < estArr) status = 'en_route'
  else if (t < estArr + 10 * 60e3) status = 'landed'
  else status = 'arrived'
  if (t >= estDep) base.actualDep = new Date(estDep)
  if (t >= estArr) {
    base.actualArr = new Date(estArr)
    base.arrBelt = leg.sim?.belt ?? null
  }
  if (fate === 'divert' && t >= estDep + (estArr - estDep) / 2) {
    return { ...base, status: 'diverted' as FlightStatus, actualArr: null, arrBelt: null }
  }
  return { ...base, status }
}

/** Simulated position for an airborne demo flight, or null when it is on the ground. */
export function demoPosition(leg: { origin: string; destination: string; actualDep: Date | null; estimatedArr: Date | null; status: string }, now: Date) {
  if (!leg.actualDep || !leg.estimatedArr || !['departed', 'en_route', 'diverted'].includes(leg.status)) return null
  const a = coordsOf(leg.origin), b = coordsOf(leg.destination)
  if (!a || !b) return null
  const span = leg.estimatedArr.getTime() - leg.actualDep.getTime()
  const f = Math.min(1, Math.max(0, (now.getTime() - leg.actualDep.getTime()) / span))
  if (leg.status === 'diverted' && f > 0.55) return null
  const p = interpolate(a, b, f)
  const climb = Math.min(1, f / 0.15, (1 - f) / 0.15)
  return { lat: p.lat, lon: p.lon, heading: Math.round(p.heading), baroAltitude: Math.round(11000 * climb), velocity: Math.round(120 + 110 * climb), onGround: false, progress: f }
}

// --- fares ---

const FX_DEMO: Record<string, number> = { INR: 1, USD: 0.0119, EUR: 0.0109, AED: 0.0437 }
export const fxDemo = (currency: string) => ({ rate: FX_DEMO[currency] ?? null, at: new Date(), source: 'Demo FX table' })

export function demoOffers(q: { origin: string; destination: string; date: string; adults: number; cabin: 'ECONOMY' | 'BUSINESS' }) {
  const legs = scheduleFor(q.date)
  const direct = legs.filter((l) => l.origin === q.origin && l.destination === q.destination)
  const itineraries: (typeof legs)[] = direct.map((l) => [l])
  for (const hub of ['DEL', 'BOM', 'BLR', 'HYD']) {
    if (hub === q.origin || hub === q.destination) continue
    for (const a of legs.filter((l) => l.origin === q.origin && l.destination === hub)) {
      for (const b of legs.filter((l) => l.origin === hub && l.destination === q.destination)) {
        const gap = (b.scheduledDep.getTime() - a.scheduledArr.getTime()) / 60e3
        if (gap >= 60 && gap <= 360) itineraries.push([a, b])
      }
    }
  }
  const daysOut = Math.max(0, (zonedTime(q.date, 0, 'Asia/Kolkata').getTime() - Date.now()) / 86400e3)
  const offers = []
  for (const it of itineraries.slice(0, 24)) {
    const r = rng(`${q.date}${it.map((l) => l.flightKey).join()}`)
    const km = it.reduce((s, l) => s + distanceKm(coordsOf(l.origin)!, coordsOf(l.destination)!), 0)
    const urgency = daysOut < 3 ? 1.45 : daysOut < 10 ? 1.15 : 1
    const fare = Math.round(((1800 + km * 4.1) * (0.85 + r() * 0.4) * urgency * (q.cabin === 'BUSINESS' ? 3.3 : 1) * (it.length > 1 ? 0.92 : 1)) / 10) * 10
    const durationMin = Math.round((it[it.length - 1].scheduledArr.getTime() - it[0].scheduledDep.getTime()) / 60e3)
    const lead = it[0]
    const ref = it.map((l) => l.flightKey).join('+')
    const segments = it.map((l) => ({ carrier: l.carrier, number: l.number, origin: l.origin, destination: l.destination, dep: l.scheduledDep, arr: l.scheduledArr, depTz: airportByIata.get(l.origin)!.timezone, arrTz: airportByIata.get(l.destination)!.timezone, cabin: q.cabin }))
    const refundable = r() < 0.25 ? true : r() < 0.6 ? false : null
    const checkedKg = q.cabin === 'BUSINESS' ? 35 : lead.carrier === 'IX' || lead.carrier === 'SG' ? (r() < 0.5 ? 15 : null) : 15
    const base = { carrier: lead.carrier, carrierName: lead.carrierName, segments, stops: it.length - 1, durationMin, refundable }
    offers.push({ ...base, providerRef: `${ref}:direct`, supplier: `${lead.carrierName} (direct)`, totalPrice: fare * q.adults, baggage: { cabinKg: 7, checkedKg } })
    // agency resale: a little cheaper, but baggage is not stated, which is exactly the trade-off the UI must show
    if (r() < 0.55) {
      offers.push({ ...base, providerRef: `${ref}:agency`, supplier: 'Partner agency (demo)', totalPrice: Math.round(fare * (0.95 + r() * 0.03) / 10) * 10 * q.adults, baggage: { cabinKg: null, checkedKg: null }, refundable: null })
    }
  }
  return offers
}
