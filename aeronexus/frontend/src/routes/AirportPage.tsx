import { useState } from 'react'
import { useParams } from 'react-router'
import { AirportHeader, useAirport } from '../components/AirportHeader'
import { BoardTable, type BoardType } from '../components/Board'
import { DemoBanner, field } from '../components/ui'
import { STATUS_LABEL } from '../lib/format'
import type { FlightStatus } from '../lib/types'
import { BoardTabs, DataSources } from './Home'

const STATUS_FILTERS: ('all' | FlightStatus)[] = ['all', 'scheduled', 'delayed', 'boarding', 'departed', 'en_route', 'landed', 'arrived', 'cancelled', 'diverted']

export function AirportPage() {
  const iata = (useParams().iata ?? '').toUpperCase()
  const { data } = useAirport(iata)
  const [type, setType] = useState<BoardType>('departure')
  const [terminal, setTerminal] = useState('all')
  const [status, setStatus] = useState<'all' | FlightStatus>('all')
  const [airline, setAirline] = useState('')
  const [hours, setHours] = useState(12)
  const terminals = data?.airport.terminals ?? []
  const q = airline.trim().toLowerCase()

  return (
    <div className="space-y-6">
      <AirportHeader iata={iata} lead={type === 'departure' ? 'Departures from' : 'Arrivals into'} />

      <div className="glass-float sticky top-[76px] z-20 flex flex-wrap items-end gap-3 rounded-lg p-3">
        <BoardTabs id="ap-board" value={type} onChange={setType} />
        <div className="min-w-40 flex-1">
          <label htmlFor="f-airline" className="mb-1 block text-[12.5px] text-slate">Airline or flight</label>
          <input id="f-airline" className={`${field} py-2`} placeholder="IndiGo, AI 101…" value={airline} onChange={(e) => setAirline(e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-status" className="mb-1 block text-[12.5px] text-slate">Status</label>
          <select id="f-status" className={`${field} py-2`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'all' ? 'Any status' : STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        {terminals.length > 0 && (
          <div>
            <label htmlFor="f-term" className="mb-1 block text-[12.5px] text-slate">Terminal</label>
            <select id="f-term" className={`${field} py-2`} value={terminal} onChange={(e) => setTerminal(e.target.value)}>
              <option value="all">All terminals</option>
              {terminals.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="f-hours" className="mb-1 block text-[12.5px] text-slate">Window</label>
          <select id="f-hours" className={`${field} py-2`} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[3, 6, 12, 24].map((h) => <option key={h} value={h}>Next {h} hours</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
        <section id="ap-board-panel" role="tabpanel" aria-labelledby={`ap-board-${type}`} className="glass-dense min-w-0 overflow-hidden rounded-lg lg:col-span-9">
          <BoardTable
            iata={iata}
            type={type}
            hoursAhead={hours}
            filter={(f) =>
              (status === 'all' || f.status === status) &&
              (terminal === 'all' || (type === 'departure' ? f.depTerminal : f.arrTerminal) === terminal) &&
              (!q || `${f.carrier} ${f.number} ${f.carrier}${f.number} ${f.carrierName ?? ''}`.toLowerCase().includes(q))}
          />
        </section>
        <aside className="space-y-4 lg:col-span-3">
          <DemoBanner>Board times are simulated. Terminal and gate appear only once the source publishes them, usually about two and a half hours before departure.</DemoBanner>
          <DataSources />
        </aside>
      </div>
    </div>
  )
}
