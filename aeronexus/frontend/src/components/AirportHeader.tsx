import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { clock, dayLabel, tzName } from '../lib/format'
import type { AirportDetail } from '../lib/types'
import { FreshnessBadge } from './ui'

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function useAirport(iata: string) {
  return useQuery({ queryKey: ['airport', iata], queryFn: () => api<AirportDetail>(`/airports/${iata}`), staleTime: 5 * 60e3 })
}

const SKY: Record<number, string> = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm' }

/** The airport is the hero: city in display serif, the full name and codes beneath, local time and weather to the side. */
export function AirportHeader({ iata, lead, action }: { iata: string; lead: string; action?: React.ReactNode }) {
  const { data, error } = useAirport(iata)
  const now = useNow()
  const a = data?.airport
  const w = data?.weather
  return (
    <header className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <p className="text-[14px] text-slate">{lead}</p>
        <h1 className="mt-1 font-serif text-display tracking-[-0.01em] [overflow-wrap:anywhere]">
          {a?.city ?? (error ? iata : ' ')}
        </h1>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px] text-slate">
          <span className="font-mono text-[15px] font-medium tracking-wider text-ink">{iata}{a?.icao && <span className="text-muted"> / {a.icao}</span>}</span>
          {a && <span>{a.name}</span>}
          {action}
        </p>
        {error && <p className="mt-2 text-[14px] text-stop-ink">{error.message}</p>}
      </div>
      {a && (
        <dl className="flex gap-6 md:justify-end md:text-right">
          <div>
            <dt className="text-[12.5px] text-muted">Local time</dt>
            <dd className="font-mono tnum text-[1.65rem] leading-tight">{clock(now, a.timezone)}<span className="ml-1.5 text-[13px] text-muted">{tzName(a.timezone, now)}</span></dd>
            <dd className="text-[12.5px] text-slate">{dayLabel(now, a.timezone)}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-muted">Weather</dt>
            {w && w.temperatureC != null ? (
              <>
                <dd className="font-mono tnum text-[1.65rem] leading-tight">{Math.round(w.temperatureC)}°<span className="ml-1 text-[13px] text-muted">C</span></dd>
                <dd className="text-[12.5px] text-slate">
                  {SKY[w.code ?? -1] ?? 'Conditions unknown'}{w.windKmh != null && `, wind ${Math.round(w.windKmh)} km/h`}
                </dd>
                <dd className="mt-0.5"><FreshnessBadge meta={w.meta} /></dd>
              </>
            ) : (
              <dd className="text-[13px] text-slate">Not available right now</dd>
            )}
          </div>
        </dl>
      )}
    </header>
  )
}
