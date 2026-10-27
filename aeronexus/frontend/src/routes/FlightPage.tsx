import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, rt } from '../lib/api'
import { clock, dayLabel, deltaMin, duration, STATUS_LABEL, tzName } from '../lib/format'
import type { Flight, FlightDetail, RtEnvelope } from '../lib/types'
import { TimePair } from '../components/Board'
import { DemoBanner, Flap, FreshnessBadge, Notice, StatusBadge } from '../components/ui'

function End({ label, code, city, planned, expected, actual, tz, place }: {
  label: string; code: string; city: string | null; planned: string; expected: string | null; actual: string | null; tz: string; place: [string, string | null][]
}) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-slate">{label}</p>
      <p className="mt-1 font-mono text-[2.4rem] font-medium leading-none tracking-wide">{code}</p>
      <p className="mt-1 truncate text-[15px]">{city ?? 'Unknown city'}</p>
      <div className="mt-4"><TimePair planned={planned} expected={expected} actual={actual} tz={tz} size="lg" /></div>
      <p className="mt-1 text-[12.5px] text-muted">{dayLabel(planned, tz)}, {tzName(tz, new Date(planned))}</p>
      <dl className="mt-4 flex gap-5">
        {place.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12.5px] text-muted">{k}</dt>
            <dd className="font-mono text-[17px]">{v ? <Flap text={v} /> : <span className="font-sans text-[13.5px] text-slate">Not published</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function FlightPage() {
  const key = useParams().flightKey ?? ''
  const qc = useQueryClient()
  const { data, error, isPending } = useQuery({ queryKey: ['flight', key], queryFn: () => api<FlightDetail>(`/flights/${key}`), refetchInterval: 60_000 })

  useEffect(() => {
    const s = rt()
    const room = data?.flight.origin.iata
    if (!room) return
    const onUpdate = (e: RtEnvelope<{ flight: Flight }>) => {
      if (e.data.flight.flightKey === key) void qc.invalidateQueries({ queryKey: ['flight', key] })
    }
    s.emit('subscribe', { airport: room })
    s.on('flight.status.updated', onUpdate)
    return () => { s.off('flight.status.updated', onUpdate) }
  }, [key, qc, data?.flight.origin.iata])

  if (isPending) return <p className="text-slate" aria-busy="true">Loading flight…</p>
  if (error) return <Notice tone="error" title="We could not load this flight.">{error.message} <Link className="underline" to="/">Back to boards</Link></Notice>

  const f = data.flight
  const oTz = f.origin.timezone ?? 'UTC', dTz = f.destination.timezone ?? 'UTC'
  const block = Math.round((new Date(f.scheduledArr).getTime() - new Date(f.scheduledDep).getTime()) / 60e3)
  const late = deltaMin(f.scheduledDep, f.actualDep ?? f.estimatedDep)
  const airborne = ['departed', 'en_route'].includes(f.status)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <p className="text-[14px] text-slate">{f.carrierName ?? f.carrier}{f.aircraftType && `, ${f.aircraftType}`}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="font-mono text-title font-medium tracking-wide">{f.carrier} {f.number}</h1>
          <StatusBadge status={f.status} />
          <FreshnessBadge meta={f.meta} />
        </div>
        {late != null && late >= 5 && f.status !== 'cancelled' && (
          <p className="mt-2 text-[15px] text-amber-ink">Running {late} minutes behind schedule.</p>
        )}
        {f.status === 'cancelled' && <p className="mt-2 text-[15px] text-stop-ink">This flight is cancelled. Contact {f.carrierName ?? 'the airline'} about rebooking.</p>}
        {f.status === 'diverted' && <p className="mt-2 text-[15px] text-stop-ink">This flight was diverted. The new arrival airport has not been reported.</p>}

        <div className="glass-dense mt-6 grid gap-8 rounded-lg p-6 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <End label="Departs" code={f.origin.iata} city={f.origin.city} planned={f.scheduledDep} expected={f.estimatedDep} actual={f.actualDep} tz={oTz} place={[['Terminal', f.depTerminal], ['Gate', f.depGate]]} />
          <div className="flex items-center justify-center text-center text-[13px] text-muted sm:flex-col" aria-hidden>
            <svg width="88" height="20" viewBox="0 0 88 20" className="text-rule-strong sm:rotate-0"><path d="M2 10h84" stroke="currentColor" strokeDasharray="5 5" /><circle cx="86" cy="10" r="2" fill="currentColor" /></svg>
            <span className="ml-2 font-mono sm:ml-0 sm:mt-1">{duration(block)}</span>
          </div>
          <End label="Arrives" code={f.destination.iata} city={f.destination.city} planned={f.scheduledArr} expected={f.estimatedArr} actual={f.actualArr} tz={dTz} place={[['Terminal', f.arrTerminal], ['Belt', f.arrBelt]]} />
        </div>

        {airborne && data.icao24 && (
          <p className="mt-4 text-[14px]">
            <Link className="text-sky-ink underline decoration-sky/40 underline-offset-[3px] hover:decoration-sky" to={`/live-map?icao24=${data.icao24}`}>See this aircraft on the live map</Link>
          </p>
        )}
        <div className="mt-4"><DemoBanner /></div>
      </section>

      <aside className="lg:col-span-4">
        <section className="glass-card rounded-lg p-5" aria-labelledby="hist-h">
          <h2 id="hist-h" className="text-[16px] font-semibold">Status history</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">Every change the source reported, oldest first. Times in {f.origin.iata} local time.</p>
          {data.history.length ? (
            <ol className="mt-4 border-l border-rule-strong pl-4">
              {data.history.map((h, i) => (
                <li key={i} className="relative pb-4 last:pb-0">
                  <span aria-hidden className={`absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-paper ${i === data.history.length - 1 ? 'bg-sky' : 'bg-rule-strong'}`} />
                  <p className="text-[14px] font-medium">{STATUS_LABEL[h.status]}</p>
                  <p className="font-mono text-[12.5px] text-slate">
                    {clock(h.at, oTz)}
                    {h.estimatedDep && ` · exp. dep ${clock(h.estimatedDep, oTz)}`}
                    {h.depGate && ` · gate ${h.depGate}`}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-[14px] text-slate">No changes recorded yet. The first update usually arrives when the gate is published.</p>
          )}
        </section>
      </aside>
    </div>
  )
}
