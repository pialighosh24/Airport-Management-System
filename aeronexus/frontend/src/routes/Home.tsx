import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AirportHeader } from '../components/AirportHeader'
import { AirportSearch } from '../components/AirportSearch'
import { BoardTable, type BoardType } from '../components/Board'
import { btn, DemoBanner, field } from '../components/ui'
import { api } from '../lib/api'
import { age, todayIn } from '../lib/format'
import type { ProviderHealth } from '../lib/types'

const KEY = 'ax.homeAirport'
const saved = () => { try { return localStorage.getItem(KEY) ?? 'DEL' } catch { return 'DEL' } }

export function BoardTabs({ value, onChange, id }: { value: BoardType; onChange: (t: BoardType) => void; id: string }) {
  const tabs: [BoardType, string][] = [['departure', 'Departures'], ['arrival', 'Arrivals']]
  return (
    <div role="tablist" aria-label="Board" className="inline-flex rounded-md border border-rule-strong bg-white/50 p-0.5">
      {tabs.map(([t, label]) => (
        <button
          key={t}
          role="tab"
          id={`${id}-${t}`}
          aria-selected={value === t}
          aria-controls={`${id}-panel`}
          tabIndex={value === t ? 0 : -1}
          onClick={() => onChange(t)}
          onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') onChange(t === 'departure' ? 'arrival' : 'departure') }}
          className={`rounded-sm px-3.5 py-1.5 text-[14px] transition-colors duration-[var(--dur-micro)] ${value === t ? 'bg-ink text-paper' : 'text-slate hover:text-ink'}`}
        >{label}</button>
      ))}
    </div>
  )
}

function TrackFlight() {
  const navigate = useNavigate()
  const [num, setNum] = useState('')
  const valid = /^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/i.test(num.trim())
  return (
    <form
      className="glass-card rounded-lg p-4"
      onSubmit={(e) => { e.preventDefault(); if (valid) void navigate(`/flights?number=${encodeURIComponent(num.trim().toUpperCase())}`) }}
    >
      <h2 className="text-[16px] font-semibold">Track a flight</h2>
      <label htmlFor="flightno" className="mt-3 block text-[13px] text-slate">Flight number</label>
      <div className="mt-1 flex gap-2">
        <input id="flightno" className={`${field} font-mono uppercase placeholder:font-sans placeholder:normal-case`} placeholder="e.g. 6E 2134" value={num} onChange={(e) => setNum(e.target.value)} aria-invalid={num !== '' && !valid} aria-describedby="flightno-hint" />
        <button className={btn.primary} disabled={!valid}>Track</button>
      </div>
      <p id="flightno-hint" className="mt-1.5 text-[12.5px] text-muted">Airline code plus number, with or without a space.</p>
    </form>
  )
}

function QuickCompare({ from }: { from: string }) {
  const navigate = useNavigate()
  const [to, setTo] = useState('')
  const [date, setDate] = useState(() => todayIn('Asia/Kolkata'))
  return (
    <form
      className="glass-card rounded-lg p-4"
      onSubmit={(e) => { e.preventDefault(); if (to) void navigate(`/compare?origin=${from}&destination=${to}&date=${date}`) }}
    >
      <h2 className="text-[16px] font-semibold">Compare fares from {from}</h2>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <AirportSearch label="To" onChange={(a) => setTo(a.iata)} />
        <div>
          <label htmlFor="qc-date" className="mb-1 block text-[13px] text-slate">Date</label>
          <input id="qc-date" type="date" min={todayIn('Asia/Kolkata')} className={`${field} font-mono`} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <button className={`${btn.quiet} mt-3 w-full`} disabled={!to || to === from}>Show fares</button>
    </form>
  )
}

const STATE_COPY: Record<ProviderHealth['items'][number]['state'], [string, string]> = {
  ok: ['Working', 'bg-go'],
  degraded: ['Slow or failing', 'bg-amber'],
  down: ['Paused', 'bg-stop'],
  demo: ['Simulated', 'demo-stripes border border-amber/60'],
  idle: ['Not called yet', 'bg-rule-strong'],
}

export function DataSources() {
  const { data } = useQuery({ queryKey: ['providers'], queryFn: () => api<ProviderHealth>('/providers/health'), refetchInterval: 30_000 })
  return (
    <section className="glass-card rounded-lg p-4" aria-labelledby="sources-h">
      <h2 id="sources-h" className="text-[16px] font-semibold">Where this data comes from</h2>
      <ul className="mt-3 space-y-2.5">
        {data?.items.map((p) => {
          const [label, dot] = STATE_COPY[p.state]
          const sec = p.lastSuccess ? Math.round((Date.now() - new Date(p.lastSuccess).getTime()) / 1000) : null
          return (
            <li key={p.id} className="flex items-start gap-2.5 text-[13.5px]">
              <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} />
              <span className="min-w-0 flex-1">
                <span className="block">{p.label}</span>
                <span className="block text-[12.5px] text-muted">{label}{sec != null && `, last data ${age(sec)}`}</span>
              </span>
            </li>
          )
        }) ?? <li className="text-[13px] text-muted">Checking sources…</li>}
      </ul>
    </section>
  )
}

export function Home() {
  const [iata, setIata] = useState(saved)
  const [type, setType] = useState<BoardType>('departure')
  const [picking, setPicking] = useState(false)
  const choose = (code: string) => {
    setIata(code)
    setPicking(false)
    try { localStorage.setItem(KEY, code) } catch { /* private mode: fine, just not remembered */ }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <AirportHeader
          iata={iata}
          lead={type === 'departure' ? 'Departures from' : 'Arrivals into'}
          action={!picking && <button className="text-sky-ink underline decoration-sky/40 underline-offset-[3px] hover:decoration-sky" onClick={() => setPicking(true)}>Change airport</button>}
        />
        {picking && (
          <div className="mt-4 max-w-sm">
            <AirportSearch label="Show the board for" autoFocus onChange={(a) => choose(a.iata)} />
          </div>
        )}
      </div>

      <section className="min-w-0 lg:col-span-8" aria-label="Flight board">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <BoardTabs id="home-board" value={type} onChange={setType} />
          <Link to={`/airports/${iata}`} className="text-[14px] text-sky-ink underline decoration-sky/40 underline-offset-[3px] hover:decoration-sky">Full board, filters and terminals</Link>
        </div>
        <div id="home-board-panel" role="tabpanel" aria-labelledby={`home-board-${type}`} className="glass-dense overflow-hidden rounded-lg">
          <BoardTable iata={iata} type={type} limit={10} />
        </div>
        <div className="mt-3"><DemoBanner>Flight times on this board come from the AeroNexus simulator, not an airline feed. Weather is live.</DemoBanner></div>
      </section>

      <aside className="flex flex-col gap-4 lg:col-span-4">
        <TrackFlight />
        <QuickCompare from={iata} />
        <DataSources />
      </aside>
    </div>
  )
}
