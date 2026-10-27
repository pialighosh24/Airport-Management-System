import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { clock, dayLabel, STATUS_LABEL } from '../lib/format'
import type { Flight } from '../lib/types'
import { FreshnessBadge, Notice, SkeletonRows, StatusBadge } from '../components/ui'

export function FlightsSearch() {
  const [params] = useSearchParams()
  const qs = params.toString()
  const { data, error, isPending } = useQuery({
    queryKey: ['flights', qs],
    queryFn: () => api<{ items: Flight[] }>(`/flights?${qs}`),
    enabled: qs.length > 0,
  })
  const label = params.get('number') ?? `${params.get('origin')} to ${params.get('destination')}`

  return (
    <div className="max-w-3xl">
      <p className="text-[14px] text-slate">Flight search</p>
      <h1 className="mt-1 font-mono text-title font-medium tracking-wide">{label}</h1>
      <div className="glass-dense mt-6 overflow-hidden rounded-lg">
        {!qs && <div className="p-4"><Notice title="Search for a flight number from the boards page." /></div>}
        {qs && isPending && <SkeletonRows rows={3} />}
        {error && <div className="p-4"><Notice tone="error" title="Search failed.">{error.message}</Notice></div>}
        {data && !data.items.length && (
          <div className="p-4"><Notice title={`No flight ${label} in the current schedule window.`}>We keep yesterday, today and tomorrow. Check the number, or look it up on the departure airport's board.</Notice></div>
        )}
        {data && data.items.length > 0 && (
          <ul className="divide-y divide-rule">
            {data.items.map((f) => {
              const tz = f.origin.timezone ?? 'UTC'
              return (
                <li key={f.flightKey}>
                  <Link to={`/flight/${f.flightKey}`} aria-label={`${f.carrier} ${f.number} on ${dayLabel(f.scheduledDep, tz)}, ${STATUS_LABEL[f.status]}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 hover:bg-sky-wash/60 sm:grid-cols-[8rem_minmax(0,1fr)_auto_auto]">
                    <span className="text-[13.5px] text-slate">{dayLabel(f.scheduledDep, tz)}</span>
                    <span className="font-mono text-[15px]">{f.origin.iata} {clock(f.scheduledDep, tz)} <span className="text-muted">to</span> {f.destination.iata}</span>
                    <StatusBadge status={f.status} />
                    <span className="hidden sm:block"><FreshnessBadge meta={f.meta} compact /></span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
