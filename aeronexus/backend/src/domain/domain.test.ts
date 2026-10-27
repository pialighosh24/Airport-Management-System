import { describe, expect, it } from 'vitest'
import { freshnessOf, metaOf } from './freshness'
import { localDate, zonedTime, interpolate, distanceKm } from './geo'
import { bestMatch, callsignToFlight, scoreMatch, type Candidate } from './matching'
import { dedupe, sortOffers, weightedScores, type RankableOffer } from './fares'

const W = { liveSec: 60, staleSec: 600 }
const now = new Date('2026-10-27T10:00:00Z')
const ago = (s: number) => new Date(now.getTime() - s * 1000)

describe('freshness', () => {
  it('classifies by age', () => {
    expect(freshnessOf(ago(10), { ...W, now })).toBe('LIVE')
    expect(freshnessOf(ago(120), { ...W, now })).toBe('RECENT')
    expect(freshnessOf(ago(1200), { ...W, now })).toBe('STALE')
    expect(freshnessOf(null, { ...W, now })).toBe('UNAVAILABLE')
    expect(freshnessOf(ago(1), { ...W, now, demo: true })).toBe('DEMO')
  })
  it('never labels a cache fallback LIVE', () => {
    expect(metaOf('x', ago(5), null, { ...W, now, forceStale: true }).freshness).toBe('STALE')
  })
  it('prefers provider timestamp over fetch time', () => {
    expect(metaOf('x', ago(1), ago(900), { ...W, now }).freshness).toBe('STALE')
  })
})

describe('time zones', () => {
  it('converts IST wall clock to UTC', () => {
    expect(zonedTime('2026-10-27', 9 * 60 + 30, 'Asia/Kolkata').toISOString()).toBe('2026-10-27T04:00:00.000Z')
  })
  it('handles London DST end (25 Oct 2026 is BST→GMT)', () => {
    expect(zonedTime('2026-10-24', 12 * 60, 'Europe/London').toISOString()).toBe('2026-10-24T11:00:00.000Z')
    expect(zonedTime('2026-10-26', 12 * 60, 'Europe/London').toISOString()).toBe('2026-10-26T12:00:00.000Z')
  })
  it('handles New York spring-forward gap without throwing', () => {
    expect(zonedTime('2026-03-08', 3 * 60, 'America/New_York').toISOString()).toBe('2026-03-08T07:00:00.000Z')
  })
  it('gives the local calendar date', () => {
    expect(localDate(new Date('2026-10-27T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-28')
  })
})

describe('geo', () => {
  const DEL = { lat: 28.5562, lon: 77.1 }, BOM = { lat: 19.0896, lon: 72.8656 }
  it('measures DEL-BOM about 1,150 km', () => {
    expect(Math.round(distanceKm(DEL, BOM) / 50) * 50).toBe(1150)
  })
  it('interpolates endpoints exactly', () => {
    expect(interpolate(DEL, BOM, 0).lat).toBeCloseTo(DEL.lat, 4)
    expect(interpolate(DEL, BOM, 1).lon).toBeCloseTo(BOM.lon, 4)
  })
})

describe('matching', () => {
  const DEL = { lat: 28.5562, lon: 77.1 }, BOM = { lat: 19.0896, lon: 72.8656 }
  const cand: Candidate = {
    flightKey: '6E2134-2026-10-27-DEL', carrier: '6E', number: '2134',
    depTime: ago(3600), arrTime: new Date(now.getTime() + 3600e3), origin: DEL, destination: BOM,
  }
  const mid = { ...interpolate(DEL, BOM, 0.5), icao24: '800abc', observedAt: now, onGround: false }

  it('maps callsigns', () => {
    expect(callsignToFlight('IGO2134 ')).toBe('6E2134')
    expect(callsignToFlight('XYZ1')).toBeNull()
    expect(callsignToFlight(null)).toBeNull()
  })
  it('scores callsign + window + corridor = 0.90 and attaches', () => {
    const r = scoreMatch({ ...mid, callsign: 'IGO2134' }, cand)
    expect(r.confidence).toBe(0.9)
    expect(bestMatch({ ...mid, callsign: 'IGO2134' }, [cand], 0.8)?.flightKey).toBe(cand.flightKey)
  })
  it('does not attach on proximity alone', () => {
    const r = scoreMatch({ ...mid, callsign: 'AIC101' }, cand)
    expect(r.confidence).toBe(0.5)
    expect(bestMatch({ ...mid, callsign: 'AIC101' }, [cand], 0.8)).toBeNull()
  })
  it('refuses ambiguous ties', () => {
    expect(bestMatch({ ...mid, callsign: 'IGO2134' }, [cand, { ...cand, flightKey: 'dup' }], 0.8)).toBeNull()
  })
  it('exact icao24 wins', () => {
    expect(scoreMatch({ ...mid, callsign: null }, { ...cand, icao24: '800ABC' }).confidence).toBe(1)
  })
})

describe('fares', () => {
  const base: RankableOffer = {
    providerRef: 'a', supplier: 's', totalPrice: 5000, durationMin: 130, stops: 0,
    segments: [{ carrier: '6E', number: '1', dep: '2026-10-30T03:00:00Z', cabin: 'ECONOMY' }],
    baggage: { cabinKg: 7, checkedKg: 15 }, refundable: false,
  }
  it('dedupes identical itineraries keeping the cheaper', () => {
    const out = dedupe([base, { ...base, providerRef: 'b', totalPrice: 4800 }])
    expect(out).toHaveLength(1)
    expect(out[0].providerRef).toBe('b')
  })
  it('keeps offers with different baggage', () => {
    expect(dedupe([base, { ...base, providerRef: 'b', baggage: { cabinKg: 7, checkedKg: null } }])).toHaveLength(2)
  })
  it('weights 0.55 price, 0.30 duration, 0.15 stops', () => {
    const cheapSlow = { ...base, providerRef: 'c', totalPrice: 3000, durationMin: 400, stops: 1 }
    expect(weightedScores([base, cheapSlow])).toEqual([0.55, 0.45])
    expect(sortOffers([base, cheapSlow], 'best')[0].providerRef).toBe('c')
    expect(sortOffers([base, cheapSlow], 'duration')[0].providerRef).toBe('a')
  })
})
