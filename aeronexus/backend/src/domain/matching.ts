import { corridorKm, distanceKm, type LatLon } from './geo'

/** ICAO airline designator → IATA, for turning callsigns like IGO2134 into 6E2134. */
export const ICAO_TO_IATA: Record<string, string> = {
  AIC: 'AI', IGO: '6E', AKJ: 'QP', SEJ: 'SG', AXB: 'IX', UAE: 'EK', SIA: 'SQ', QTR: 'QR', ETD: 'EY', BAW: 'BA', DLH: 'LH',
}

export type AircraftObs = LatLon & { icao24: string; callsign: string | null; observedAt: Date; onGround: boolean }

export type Candidate = {
  flightKey: string
  carrier: string
  number: string
  icao24?: string | null
  depTime: Date // estimated or scheduled
  arrTime: Date
  origin: LatLon
  destination: LatLon
}

export type MatchResult = {
  flightKey: string
  confidence: number
  evidence: { rule: string; weight: number; detail: string }[]
}

export function callsignToFlight(callsign: string | null) {
  const cs = callsign?.trim().toUpperCase()
  const m = cs?.match(/^([A-Z]{3})(\d{1,4}[A-Z]?)$/)
  if (!m || !ICAO_TO_IATA[m[1]]) return null
  return `${ICAO_TO_IATA[m[1]]}${m[2]}`
}

/**
 * Score one aircraft against one candidate flight.
 * Weights from the blueprint: callsign 0.40 + schedule window 0.30 + route corridor 0.20 + airport proximity 0.10.
 * An exact ICAO24 assignment short-circuits to 1.0.
 */
export function scoreMatch(a: AircraftObs, c: Candidate): MatchResult {
  if (c.icao24 && c.icao24.toLowerCase() === a.icao24.toLowerCase()) {
    return { flightKey: c.flightKey, confidence: 1, evidence: [{ rule: 'icao24', weight: 1, detail: `ICAO24 ${a.icao24} assigned to this flight` }] }
  }
  const evidence: MatchResult['evidence'] = []
  if (callsignToFlight(a.callsign) === `${c.carrier}${c.number}`) {
    evidence.push({ rule: 'callsign', weight: 0.4, detail: `Callsign ${a.callsign} = ${c.carrier}${c.number}` })
  }
  const t = a.observedAt.getTime()
  if (t >= c.depTime.getTime() - 30 * 60e3 && t <= c.arrTime.getTime() + 30 * 60e3) {
    evidence.push({ rule: 'schedule', weight: 0.3, detail: 'Observed inside the flight window (±30 min)' })
  }
  const off = corridorKm(a, c.origin, c.destination)
  if (off <= 75) evidence.push({ rule: 'corridor', weight: 0.2, detail: `${Math.round(off)} km from the route` })
  const near = Math.min(distanceKm(a, c.origin), distanceKm(a, c.destination))
  if (near <= 50) evidence.push({ rule: 'airport', weight: 0.1, detail: `${Math.round(near)} km from an endpoint airport` })
  const confidence = Math.round(evidence.reduce((s, e) => s + e.weight, 0) * 100) / 100
  return { flightKey: c.flightKey, confidence, evidence }
}

/** Best candidate at or above the threshold, or null. Ambiguous ties (two above threshold, equal score) return null. */
export function bestMatch(a: AircraftObs, candidates: Candidate[], threshold: number): MatchResult | null {
  const scored = candidates.map((c) => scoreMatch(a, c)).filter((r) => r.confidence >= threshold)
  scored.sort((x, y) => y.confidence - x.confidence)
  if (scored.length > 1 && scored[0].confidence === scored[1].confidence) return null
  return scored[0] ?? null
}
