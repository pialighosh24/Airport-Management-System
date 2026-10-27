import { call } from './registry'

export const OPENSKY = 'opensky'
export const INDIA_BBOX = { lamin: 6, lomin: 68, lamax: 36, lomax: 98 }

export type StateVector = {
  icao24: string
  callsign: string | null
  originCountry: string
  observedAt: Date
  lat: number
  lon: number
  baroAltitude: number | null
  velocity: number | null
  heading: number | null
  onGround: boolean
}

type Raw = [string, string | null, string, number | null, number, number | null, number | null, number | null, boolean, number | null, number | null, ...unknown[]]

/** OpenSky state-vector arrays → canonical objects. Rows without a position are dropped, not guessed. */
export function mapStates(body: unknown): StateVector[] {
  const states = (body as { states?: Raw[] | null })?.states
  if (!Array.isArray(states)) return []
  const out: StateVector[] = []
  for (const s of states) {
    if (!Array.isArray(s) || typeof s[0] !== 'string' || s[5] == null || s[6] == null) continue
    const t = s[3] ?? s[4]
    out.push({
      icao24: s[0].toLowerCase(),
      callsign: typeof s[1] === 'string' && s[1].trim() ? s[1].trim() : null,
      originCountry: s[2],
      observedAt: new Date(t * 1000),
      lon: s[5], lat: s[6],
      baroAltitude: s[7], onGround: Boolean(s[8]), velocity: s[9], heading: s[10],
    })
  }
  return out
}

export async function fetchStates(bbox = INDIA_BBOX) {
  const qs = new URLSearchParams(Object.entries(bbox).map(([k, v]) => [k, String(v)]))
  return call(OPENSKY, async (signal) => {
    const r = await fetch(`https://opensky-network.org/api/states/all?${qs}`, { signal })
    if (!r.ok) throw new Error(`opensky ${r.status}`)
    return mapStates(await r.json())
  }, 15000)
}
