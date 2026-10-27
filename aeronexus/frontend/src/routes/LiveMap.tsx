import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Map as MlMap, NavigationControl, setWorkerUrl, type GeoJSONSource, type LngLatBounds } from 'maplibre-gl'
// MapLibre locates its worker next to its own file, which Vite pre-bundling moves; hand it a Vite-built worker instead
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapTrifoldIcon, ListBulletsIcon, XIcon } from '@phosphor-icons/react'
import { api, rt } from '../lib/api'
import type { Aircraft, Airport, RtEnvelope } from '../lib/types'
import { DemoBanner, FreshnessBadge, field } from '../components/ui'

setWorkerUrl(mapWorkerUrl)

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
// MapLibre paints with hex; these mirror the sky ramp and amber tokens
const ALT_RAMP = { ground: '#8a95a5', low: '#7f9cc8', mid: '#4a74c0', high: '#1f4fae', selected: '#d9891f' }
const BANDS = [
  { id: 'all', label: 'Any altitude', min: -Infinity },
  { id: 'above3', label: 'Above 3,000 m', min: 3000 },
  { id: 'above9', label: 'Cruise, above 9,000 m', min: 9000 },
] as const

const ft = (m: number | null) => (m == null ? null : Math.round(m * 3.28084))
const kt = (ms: number | null) => (ms == null ? null : Math.round(ms * 1.94384))

/** Top-down aircraft drawn once into an SDF so MapLibre can tint and rotate it on the GPU. */
function planeImage() {
  const s = 48, c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.fillStyle = '#000'
  g.fill(new Path2D('M24 3 L26.5 17 L43 26 L43 30.5 L26.5 25.5 L25.6 37 L31 41.5 L31 45 L24 43 L17 45 L17 41.5 L22.4 37 L21.5 25.5 L5 30.5 L5 26 L21.5 17 Z'))
  return g.getImageData(0, 0, s, s)
}

function toGeoJSON(list: Aircraft[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: list.map((a) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
      properties: { icao24: a.icao24, heading: a.heading ?? 0, alt: a.onGround ? -1 : (a.baroAltitude ?? 0), label: a.callsign ?? a.icao24 },
    })),
  }
}

function useAircraft() {
  const [items, setItems] = useState<Aircraft[]>([])
  const [mode, setMode] = useState<'demo' | 'live' | null>(null)
  useEffect(() => {
    let alive = true
    api<{ items: Aircraft[]; mode: 'demo' | 'live' }>('/tracking/states?bbox=50,-5,110,45')
      .then((r) => { if (alive) { setItems(r.items); setMode(r.mode) } })
      .catch(() => {})
    const s = rt()
    const join = () => s.emit('subscribe', { map: true })
    const onSnap = (e: RtEnvelope<{ items: Aircraft[] }>) => setItems(e.data.items)
    join()
    s.on('connect', join)
    s.on('aircraft.snapshot', onSnap)
    return () => {
      alive = false
      s.emit('unsubscribe', { map: true })
      s.off('connect', join)
      s.off('aircraft.snapshot', onSnap)
    }
  }, [])
  return { items, mode }
}

function Drawer({ a, onClose }: { a: Aircraft; onClose: () => void }) {
  const rows: [string, string | null][] = [
    ['Altitude', a.onGround ? 'On the ground' : ft(a.baroAltitude) != null ? `${ft(a.baroAltitude)!.toLocaleString('en-IN')} ft` : null],
    ['Ground speed', kt(a.velocity) != null ? `${kt(a.velocity)} kt` : null],
    ['Heading', a.heading != null ? `${Math.round(a.heading)}°` : null],
    ['Position', `${a.lat.toFixed(3)}, ${a.lon.toFixed(3)}`],
    ['ICAO24', a.icao24.toUpperCase()],
  ]
  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 16, opacity: 0, transition: { duration: 0.16, ease: [0.7, 0, 0.84, 0] } }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      aria-label={`Aircraft ${a.callsign ?? a.icao24}`}
      className="glass-float absolute inset-x-2 bottom-2 z-10 max-h-[60%] overflow-auto rounded-lg p-5 sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-80"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-slate">Callsign</p>
          <h2 className="font-mono text-[1.6rem] font-medium leading-tight tracking-wide">{a.callsign ?? 'Not broadcast'}</h2>
        </div>
        <button onClick={onClose} aria-label="Close aircraft details" className="inline-flex size-9 items-center justify-center rounded-md text-slate hover:bg-white/60 hover:text-ink"><XIcon size={18} /></button>
      </div>
      <div className="mt-2"><FreshnessBadge meta={a.meta} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[12.5px] text-muted">{k}</dt>
            <dd className="font-mono tnum text-[14.5px]">{v ?? <span className="font-sans text-slate">Not reported</span>}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-5 border-t border-rule pt-4" aria-labelledby="match-h">
        <h3 id="match-h" className="text-[14px] font-semibold">Flight identity</h3>
        {a.match ? (
          <>
            <p className="mt-1 font-mono text-[15px]">{a.match.route ? `${a.match.route.origin} to ${a.match.route.destination}` : 'Route not known'}</p>
            <div className="mt-2 flex items-center gap-2" aria-label={`Match confidence ${Math.round(a.match.confidence * 100)} percent`}>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2"><span className="block h-full rounded-full bg-sky" style={{ width: `${a.match.confidence * 100}%` }} /></span>
              <span className="font-mono text-[12.5px]">{Math.round(a.match.confidence * 100)}%</span>
            </div>
            <ul className="mt-2 space-y-1 text-[12.5px] text-slate">
              {a.match.evidence.map((e) => <li key={e.rule}>{e.detail}</li>)}
            </ul>
            <Link to={`/flight/${a.match.flightKey}`} className="mt-3 inline-block text-[14px] text-sky-ink underline decoration-sky/40 underline-offset-[3px] hover:decoration-sky">Open flight details</Link>
          </>
        ) : (
          <p className="mt-1 text-[13.5px] text-slate">No matched flight. We only name a flight and its route when the evidence reaches 80% confidence, so this aircraft is shown without an origin or destination.</p>
        )}
      </section>
    </motion.aside>
  )
}

export function LiveMap() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('icao24')
  const select = (id: string | null) => setParams(id ? { icao24: id } : {}, { replace: true })
  const { items, mode } = useAircraft()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [callsign, setCallsign] = useState('')
  const [band, setBand] = useState<(typeof BANDS)[number]['id']>('all')
  const [airborneOnly, setAirborneOnly] = useState(false)
  const [bounds, setBounds] = useState<LngLatBounds | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const ready = useRef(false)
  const { data: airports } = useQuery({ queryKey: ['airports', 'all'], queryFn: () => api<{ items: Airport[] }>('/airports'), staleTime: Infinity })

  const filtered = useMemo(() => {
    const q = callsign.trim().toUpperCase()
    const min = BANDS.find((b) => b.id === band)!.min
    return items.filter((a) => (!q || (a.callsign ?? a.icao24).toUpperCase().includes(q)) && (!airborneOnly || !a.onGround) && (a.onGround ? min === -Infinity : (a.baroAltitude ?? 0) >= min))
  }, [items, callsign, band, airborneOnly])
  const selected = items.find((a) => a.icao24 === selectedId) ?? null
  const inView = useMemo(() => (bounds ? filtered.filter((a) => bounds.contains([a.lon, a.lat])) : filtered), [filtered, bounds])

  useEffect(() => {
    if (!el.current) return
    const m = new MlMap({ container: el.current, style: STYLE, center: [80, 22], zoom: 3.8, attributionControl: { compact: true }, dragRotate: false })
    map.current = m
    m.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('error', (e) => { if (!ready.current) setMapError(e.error?.message ?? 'The base map failed to load.') })
    m.on('moveend', () => setBounds(m.getBounds()))
    // style.load, not load: 'load' waits for every base tile, so one slow tile would hide all aircraft
    m.once('style.load', () => {
      m.addImage('plane', planeImage(), { sdf: true })
      m.addSource('airports', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addSource('trail', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addSource('aircraft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      m.addLayer({ id: 'airports', type: 'circle', source: 'airports', paint: { 'circle-radius': 3.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#1d2b3f', 'circle-stroke-width': 1.5 } })
      m.addLayer({ id: 'airport-labels', type: 'symbol', source: 'airports', minzoom: 3.5, layout: { 'text-field': ['get', 'iata'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#1d2b3f', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 } })
      m.addLayer({ id: 'trail', type: 'line', source: 'trail', paint: { 'line-color': ALT_RAMP.selected, 'line-width': 2, 'line-dasharray': [2, 1.5] } })
      m.addLayer({ id: 'selected-ring', type: 'circle', source: 'aircraft', filter: ['==', ['get', 'icao24'], ''], paint: { 'circle-radius': 18, 'circle-color': 'rgba(217,137,31,0.12)', 'circle-stroke-color': ALT_RAMP.selected, 'circle-stroke-width': 1 } })
      m.addLayer({
        id: 'aircraft', type: 'symbol', source: 'aircraft',
        layout: { 'icon-image': 'plane', 'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.38, 8, 0.62], 'icon-rotate': ['get', 'heading'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
        paint: {
          'icon-color': ['case', ['==', ['get', 'icao24'], ''], ALT_RAMP.selected, ['<', ['get', 'alt'], 0], ALT_RAMP.ground, ['<', ['get', 'alt'], 3000], ALT_RAMP.low, ['<', ['get', 'alt'], 9000], ALT_RAMP.mid, ALT_RAMP.high],
          'icon-halo-color': '#ffffff', 'icon-halo-width': 1.2,
        },
      })
      m.on('click', 'aircraft', (e: { features?: { properties?: Record<string, unknown> }[] }) => { const id = e.features?.[0]?.properties?.icao24; if (id) select(String(id)) })
      m.on('mouseenter', 'aircraft', () => { m.getCanvas().style.cursor = 'pointer' })
      m.on('mouseleave', 'aircraft', () => { m.getCanvas().style.cursor = '' })
      ready.current = true
      setBounds(m.getBounds())
      setMapError(null)
    })
    return () => { ready.current = false; m.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // data → layers
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    ;(m.getSource('aircraft') as GeoJSONSource).setData(toGeoJSON(filtered))
  }, [filtered, bounds])
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current || !airports) return
    ;(m.getSource('airports') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: airports.items.filter((a) => a.lat != null).map((a) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lon!, a.lat!] }, properties: { iata: a.iata } })),
    })
  }, [airports, bounds])
  useEffect(() => {
    const m = map.current
    if (!m || !ready.current) return
    const id = selectedId ?? ''
    m.setFilter('selected-ring', ['==', ['get', 'icao24'], id])
    m.setPaintProperty('aircraft', 'icon-color', ['case', ['==', ['get', 'icao24'], id], ALT_RAMP.selected, ['<', ['get', 'alt'], 0], ALT_RAMP.ground, ['<', ['get', 'alt'], 3000], ALT_RAMP.low, ['<', ['get', 'alt'], 9000], ALT_RAMP.mid, ALT_RAMP.high])
    const trail = m.getSource('trail') as GeoJSONSource
    trail.setData({ type: 'FeatureCollection', features: [] })
    if (!selectedId) return
    let alive = true
    api<{ points: { lat: number; lon: number }[] }>(`/tracking/aircraft/${selectedId}/trail`).then((r) => {
      if (alive && r.points.length > 1) trail.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.points.map((p) => [p.lon, p.lat]) } })
    }).catch(() => {})
    return () => { alive = false }
  }, [selectedId, bounds])
  // fly to a deep-linked aircraft once it appears
  const flown = useRef<string | null>(null)
  useEffect(() => {
    if (selected && ready.current && flown.current !== selected.icao24) {
      flown.current = selected.icao24
      map.current?.easeTo({ center: [selected.lon, selected.lat], zoom: Math.max(map.current.getZoom(), 5), duration: 600 })
    }
  }, [selected, bounds])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] text-slate">Live map</p>
          <h1 className="font-serif text-title">Aircraft over India and nearby</h1>
        </div>
        <div role="tablist" aria-label="View" className="inline-flex rounded-md border border-rule-strong bg-white/50 p-0.5">
          {([['map', 'Map', MapTrifoldIcon], ['list', 'List', ListBulletsIcon]] as const).map(([v, label, Icon]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[14px] ${view === v ? 'bg-ink text-paper' : 'text-slate hover:text-ink'}`}>
              <Icon size={16} aria-hidden />{label}
            </button>
          ))}
        </div>
      </header>

      <div className="relative h-[calc(100dvh-220px)] min-h-[480px] overflow-hidden rounded-lg border border-rule bg-paper-2">
        {/* maplibre's CSS forces position:relative on its container, so size it explicitly */}
        <div ref={el} className={`h-full w-full ${view === 'list' ? 'invisible' : ''}`} aria-hidden={view === 'list'} />
        {mapError && view === 'map' && (
          <div role="alert" className="absolute inset-x-3 bottom-16 z-10 rounded-md border border-stop/40 bg-stop-wash p-3 text-[14px] text-stop-ink sm:left-auto sm:max-w-md">
            The base map did not load ({mapError}). Aircraft are still listed in List view.
          </div>
        )}

        {/* floating filters over the map */}
        <div className="glass-float absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-end gap-2 rounded-lg p-2.5 sm:max-w-md">
          <div className="min-w-32 flex-1">
            <label htmlFor="m-cs" className="mb-0.5 block text-[12px] text-slate">Callsign</label>
            <input id="m-cs" className={`${field} py-1.5 font-mono uppercase placeholder:font-sans placeholder:normal-case`} placeholder="IGO, AIC101…" value={callsign} onChange={(e) => setCallsign(e.target.value)} />
          </div>
          <div>
            <label htmlFor="m-alt" className="mb-0.5 block text-[12px] text-slate">Altitude</label>
            <select id="m-alt" className={`${field} py-1.5`} value={band} onChange={(e) => setBand(e.target.value as typeof band)}>
              {BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-[13px]">
            <input type="checkbox" className="size-4 accent-[var(--color-sky)]" checked={airborneOnly} onChange={(e) => setAirborneOnly(e.target.checked)} /> Airborne only
          </label>
          <p className="w-full text-[12.5px] text-slate" aria-live="polite">
            <span className="font-mono tnum text-ink">{inView.length}</span> aircraft in view{mode === 'demo' && ', simulated'}
          </p>
        </div>

        {view === 'map' && (
          <div className="glass-float absolute bottom-3 left-3 z-10 hidden rounded-md px-3 py-2 text-[12px] sm:block" aria-label="Altitude legend">
            <p className="mb-1 text-slate">Altitude</p>
            <ul className="flex gap-3">
              {[['Ground', ALT_RAMP.ground], ['Below 3,000 m', ALT_RAMP.low], ['3–9,000 m', ALT_RAMP.mid], ['Above 9,000 m', ALT_RAMP.high]].map(([l, c]) => (
                <li key={l} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} />{l}</li>
              ))}
            </ul>
          </div>
        )}

        {view === 'list' && (
          <div className="absolute inset-0 overflow-auto bg-paper/95 pt-32 sm:pt-24">
            <table className="w-full text-[14px]">
              <caption className="sr-only">Aircraft in the current map view</caption>
              <thead className="text-left text-[12.5px] text-muted">
                <tr className="border-b border-rule"><th className="px-4 py-2 font-normal">Callsign</th><th className="px-4 py-2 font-normal">Route</th><th className="px-4 py-2 font-normal">Altitude</th><th className="hidden px-4 py-2 font-normal sm:table-cell">Speed</th><th className="hidden px-4 py-2 font-normal md:table-cell">Data</th></tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {[...inView].sort((a, b) => (a.callsign ?? '').localeCompare(b.callsign ?? '')).map((a) => (
                  <tr key={a.icao24} className={a.icao24 === selectedId ? 'bg-amber-wash' : ''}>
                    <td className="px-4 py-2"><button className="font-mono underline decoration-rule-strong underline-offset-[3px] hover:decoration-ink" onClick={() => { select(a.icao24); setView('map') }}>{a.callsign ?? a.icao24.toUpperCase()}</button></td>
                    <td className="px-4 py-2 font-mono">{a.match?.route ? `${a.match.route.origin}–${a.match.route.destination}` : <span className="font-sans text-muted">Unmatched</span>}</td>
                    <td className="px-4 py-2 font-mono tnum">{a.onGround ? 'Ground' : ft(a.baroAltitude) != null ? `${ft(a.baroAltitude)!.toLocaleString('en-IN')} ft` : '–'}</td>
                    <td className="hidden px-4 py-2 font-mono tnum sm:table-cell">{kt(a.velocity) ?? '–'} kt</td>
                    <td className="hidden px-4 py-2 md:table-cell"><FreshnessBadge meta={a.meta} compact /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!inView.length && <p className="px-4 py-6 text-[14px] text-slate">No aircraft match these filters in the current view.</p>}
          </div>
        )}

        <AnimatePresence>
          {selected && <Drawer key={selected.icao24} a={selected} onClose={() => select(null)} />}
        </AnimatePresence>
        {selectedId && !selected && items.length > 0 && (
          <p className="glass-float absolute right-3 top-3 z-10 max-w-72 rounded-md p-3 text-[13.5px]">Aircraft {selectedId.toUpperCase()} is no longer in the picture. It may have landed or left coverage.</p>
        )}
      </div>
      {mode === 'demo' && <DemoBanner>Aircraft positions are simulated from the demo schedule. Switch the server to live mode to plot real OpenSky positions.</DemoBanner>}
    </div>
  )
}
