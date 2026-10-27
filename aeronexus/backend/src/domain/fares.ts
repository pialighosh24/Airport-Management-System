export type RankableOffer = {
  providerRef: string
  supplier: string
  totalPrice: number
  durationMin: number
  stops: number
  segments: { carrier: string; number: string; dep: Date | string; cabin: string }[]
  baggage: { cabinKg: number | null; checkedKg: number | null }
  refundable: boolean | null
}

export type SortKey = 'price' | 'duration' | 'stops' | 'best'

/**
 * Same segments + same fare conditions = duplicate; keep the cheaper one.
 * Offers that differ in baggage or refundability are kept, they are not like-for-like.
 */
export function dedupe<T extends RankableOffer>(offers: T[]): T[] {
  const byKey = new Map<string, T>()
  for (const o of offers) {
    const key = JSON.stringify([
      o.segments.map((s) => [s.carrier, s.number, new Date(s.dep).toISOString(), s.cabin]),
      o.baggage.cabinKg, o.baggage.checkedKg, o.refundable,
    ])
    const prev = byKey.get(key)
    if (!prev || o.totalPrice < prev.totalPrice) byKey.set(key, o)
  }
  return [...byKey.values()]
}

/** Percentile rank in [0,1], 0 = best (lowest value). Ties share a rank. */
function ranks(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = Math.max(1, values.length - 1)
  return values.map((v) => sorted.indexOf(v) / n)
}

/** Disclosed weighted score: 0.55 price rank + 0.30 duration rank + 0.15 stops rank. Lower is better. */
export function weightedScores(offers: RankableOffer[]) {
  const p = ranks(offers.map((o) => o.totalPrice))
  const d = ranks(offers.map((o) => o.durationMin))
  const s = ranks(offers.map((o) => o.stops))
  return offers.map((_, i) => Math.round((0.55 * p[i] + 0.3 * d[i] + 0.15 * s[i]) * 1000) / 1000)
}

export function sortOffers<T extends RankableOffer>(offers: T[], by: SortKey): (T & { score: number })[] {
  const scores = weightedScores(offers)
  const withScore = offers.map((o, i) => ({ ...o, score: scores[i] }))
  const cmp: Record<SortKey, (a: T & { score: number }, b: T & { score: number }) => number> = {
    price: (a, b) => a.totalPrice - b.totalPrice || a.durationMin - b.durationMin,
    duration: (a, b) => a.durationMin - b.durationMin || a.totalPrice - b.totalPrice,
    stops: (a, b) => a.stops - b.stops || a.totalPrice - b.totalPrice,
    best: (a, b) => a.score - b.score || a.totalPrice - b.totalPrice,
  }
  return withScore.sort(cmp[by])
}
