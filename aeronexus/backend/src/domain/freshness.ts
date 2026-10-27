export type Freshness = 'LIVE' | 'RECENT' | 'STALE' | 'DEMO' | 'UNAVAILABLE'

export type Meta = {
  source: string
  fetchedAt: string | null
  providerTimestamp: string | null
  freshness: Freshness
  ageSec: number | null
}

export type Windows = { liveSec: number; staleSec: number }

/** Age is measured from the provider's own timestamp when it has one, else from when we fetched it. */
export function freshnessOf(
  observed: Date | null | undefined,
  opts: Windows & { demo?: boolean; now?: Date },
): Freshness {
  if (opts.demo) return 'DEMO'
  if (!observed) return 'UNAVAILABLE'
  const age = ((opts.now ?? new Date()).getTime() - observed.getTime()) / 1000
  if (age <= opts.liveSec) return 'LIVE'
  if (age <= opts.staleSec) return 'RECENT'
  return 'STALE'
}

export function metaOf(
  source: string,
  fetchedAt: Date | null,
  providerTimestamp: Date | null,
  opts: Windows & { demo?: boolean; now?: Date; forceStale?: boolean },
): Meta {
  const now = opts.now ?? new Date()
  const observed = providerTimestamp ?? fetchedAt
  let freshness = freshnessOf(observed, { ...opts, now })
  // cache fallback is never LIVE
  if (opts.forceStale && (freshness === 'LIVE' || freshness === 'RECENT')) freshness = 'STALE'
  return {
    source,
    fetchedAt: fetchedAt?.toISOString() ?? null,
    providerTimestamp: providerTimestamp?.toISOString() ?? null,
    freshness,
    ageSec: observed ? Math.max(0, Math.round((now.getTime() - observed.getTime()) / 1000)) : null,
  }
}
