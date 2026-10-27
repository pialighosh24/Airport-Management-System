import { useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, rt } from '../lib/api'
import { clock, deltaMin, STATUS_LABEL } from '../lib/format'
import type { Board as BoardData, Flight, FlightStatus, RtEnvelope } from '../lib/types'
import { Flap, FreshnessBadge, Notice, SkeletonRows, StatusBadge } from './ui'

export type BoardType = 'departure' | 'arrival'

/** Board snapshot over REST, then deltas over the socket. On reconnect we refetch before trusting deltas again. */
export function useBoard(iata: string, type: BoardType, hoursAhead = 10) {
  const qc = useQueryClient()
  const key = ['board', iata, type, hoursAhead]
  const query = useQuery({
    queryKey: key,
    queryFn: () => api<BoardData>(`/airports/${iata}/board?type=${type}&hoursAhead=${hoursAhead}`),
    refetchInterval: 60_000,
  })
  useEffect(() => {
    const s = rt()
    const join = () => s.emit('subscribe', { airport: iata })
    const resync = () => { join(); void qc.invalidateQueries({ queryKey: ['board', iata] }) }
    const onUpdate = (e: RtEnvelope<{ flight: Flight }>) => {
      qc.setQueriesData<BoardData>({ queryKey: ['board', iata] }, (old) =>
        old && { ...old, items: old.items.map((f) => (f.flightKey === e.data.flight.flightKey ? e.data.flight : f)) })
    }
    join()
    s.on('connect', resync)
    s.on('flight.status.updated', onUpdate)
    return () => {
      s.emit('unsubscribe', { airport: iata })
      s.off('connect', resync)
      s.off('flight.status.updated', onUpdate)
    }
  }, [iata, qc])
  return query
}

/** Scheduled time is always shown; the expected or actual time sits beside it when it differs. */
export function TimePair({ planned, expected, actual, tz, size = 'md' }: { planned: string; expected: string | null; actual: string | null; tz: string; size?: 'md' | 'lg' }) {
  const shown = actual ?? expected
  const delta = deltaMin(planned, shown)
  const late = delta != null && delta >= 5
  const early = delta != null && delta <= -5
  const big = size === 'lg' ? 'text-[2rem] leading-none' : 'text-[17px] leading-tight'
  return (
    <span className="inline-flex flex-col">
      <span className={`font-mono tnum font-medium ${big} ${late ? 'text-muted line-through decoration-1' : ''}`}>
        <span className="sr-only">Scheduled </span>{clock(planned, tz)}
      </span>
      {shown && (late || early) && (
        <span className="mt-0.5 font-mono tnum text-[13px] text-amber-ink">
          <span className="sr-only">{actual ? 'Actual' : 'Expected'} </span>
          <Flap text={clock(shown, tz)} /> <span className="text-[12px]">{delta! > 0 ? `+${delta}` : delta}<span className="sr-only"> minutes</span></span>
        </span>
      )}
    </span>
  )
}

function rowStatus(f: Flight, type: BoardType): FlightStatus {
  // a flight that is late but otherwise "scheduled" reads as delayed on the board
  const d = deltaMin(type === 'departure' ? f.scheduledDep : f.scheduledArr, type === 'departure' ? f.estimatedDep : f.estimatedArr)
  return f.status === 'scheduled' && d != null && d >= 15 ? 'delayed' : f.status
}

export function BoardTable({ iata, type, limit, hoursAhead, filter }: { iata: string; type: BoardType; limit?: number; hoursAhead?: number; filter?: (f: Flight) => boolean }) {
  const { data, isPending, error, refetch } = useBoard(iata, type, hoursAhead)
  if (isPending) return <SkeletonRows rows={limit ?? 8} />
  if (error) {
    return (
      <div className="p-4">
        <Notice tone="error" title="The board did not load.">
          {error.message} <button className="underline underline-offset-2" onClick={() => void refetch()}>Try again</button>
        </Notice>
      </div>
    )
  }
  const now = Date.now()
  const tz = data.airport.timezone ?? 'UTC'
  // keep a few just-gone flights for context, then everything upcoming
  const items = data.items.filter((f) => {
    const t = new Date(type === 'departure' ? (f.actualDep ?? f.scheduledDep) : (f.actualArr ?? f.scheduledArr)).getTime()
    return t > now - 45 * 60e3 && (!filter || filter(f))
  }).slice(0, limit)
  if (!items.length) {
    return <div className="p-4"><Notice title={`No ${type}s in this window.`}>The provider returned no flights for the next {hoursAhead ?? 10} hours. That usually means a quiet period, not an outage.</Notice></div>
  }
  const other = type === 'departure' ? 'To' : 'From'
  return (
    <div>
      <div aria-hidden className="hidden grid-cols-[5.5rem_6.5rem_minmax(0,1fr)_8.5rem_5.5rem_6.5rem] gap-x-4 border-b border-rule px-4 pb-2 pt-3 text-[12.5px] text-muted md:grid">
        <span>Time</span><span>Flight</span><span>{other}</span><span>Status</span><span>{type === 'departure' ? 'Gate' : 'Belt'}</span><span>Updated</span>
      </div>
      <ol className="divide-y divide-rule">
        {items.map((f) => {
          const place = type === 'departure' ? f.destination : f.origin
          const st = rowStatus(f, type)
          const where = type === 'departure' ? [f.depTerminal, f.depGate] : [f.arrTerminal, f.arrBelt]
          return (
            <li key={f.flightKey}>
              <Link
                to={`/flight/${f.flightKey}`}
                aria-label={`${f.carrier} ${f.number} ${other.toLowerCase()} ${place.city ?? place.iata}, ${STATUS_LABEL[st]}`}
                className={`group grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3 transition-colors duration-[var(--dur-micro)] hover:bg-sky-wash/60 focus-visible:-outline-offset-2 md:grid-cols-[5.5rem_6.5rem_minmax(0,1fr)_8.5rem_5.5rem_6.5rem] md:items-center md:gap-x-4 ${st === 'cancelled' ? 'opacity-70' : ''}`}
              >
                <span className="row-span-2 md:row-span-1">
                  <TimePair
                    planned={type === 'departure' ? f.scheduledDep : f.scheduledArr}
                    expected={type === 'departure' ? f.estimatedDep : f.estimatedArr}
                    actual={type === 'departure' ? f.actualDep : f.actualArr}
                    tz={tz}
                  />
                </span>
                <span className="font-mono text-[14px] font-medium tracking-wide md:order-none">
                  {f.carrier} {f.number}
                  <span className="block truncate font-sans text-[12px] font-normal tracking-normal text-muted">{f.carrierName}</span>
                </span>
                <span className="col-start-2 row-start-2 min-w-0 md:col-start-auto md:row-start-auto">
                  <span className="block truncate text-[15px]">{place.city ?? place.iata}</span>
                  <span className="font-mono text-[12px] tracking-wide text-muted">{place.iata}</span>
                </span>
                <span className="col-start-3 row-start-1 justify-self-end md:col-start-auto md:row-start-auto md:justify-self-start">
                  <StatusBadge status={st} />
                </span>
                <span className="col-start-3 row-start-2 justify-self-end font-mono text-[13.5px] md:col-start-auto md:row-start-auto md:justify-self-start">
                  {where[1] ? (
                    <><Flap text={where[1]} />{where[0] && <span className="block text-[12px] text-muted">{where[0]}</span>}</>
                  ) : (
                    <span className="font-sans text-[12.5px] text-muted">{st === 'cancelled' ? '–' : 'Not yet'}</span>
                  )}
                </span>
                <span className="hidden md:block"><FreshnessBadge meta={f.meta} compact /></span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
