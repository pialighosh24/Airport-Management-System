import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowsLeftRightIcon, SuitcaseRollingIcon, BackpackIcon } from '@phosphor-icons/react'
import { api } from '../lib/api'
import { clock, dayLabel, duration, money, todayIn } from '../lib/format'
import type { FareResults, FareSearch, Offer, PriceCheck } from '../lib/types'
import { AirportSearch } from '../components/AirportSearch'
import { btn, DemoBanner, field, FreshnessBadge, Notice, SkeletonRows } from '../components/ui'

type Seg = Offer['segments'][number] & { depTz?: string; arrTz?: string }

function readQuery(p: URLSearchParams): FareSearch | null {
  const origin = p.get('origin'), destination = p.get('destination'), date = p.get('date')
  if (!origin || !destination || !date) return null
  return {
    origin, destination, date,
    adults: Number(p.get('adults') ?? 1),
    cabin: p.get('cabin') === 'BUSINESS' ? 'BUSINESS' : 'ECONOMY',
    currency: (['INR', 'USD', 'EUR', 'AED'].includes(p.get('currency') ?? '') ? p.get('currency') : 'INR') as FareSearch['currency'],
    nonStopOnly: false,
    sort: 'best',
  }
}

function Baggage({ b }: { b: Offer['baggage'] }) {
  const part = (kg: number | null, what: string, Icon: typeof BackpackIcon) => (
    <span className={`inline-flex items-center gap-1.5 ${kg == null ? 'text-amber-ink' : ''}`}>
      <Icon size={15} aria-hidden />
      {kg == null ? `${what} bag not specified` : `${what} ${kg} kg`}
    </span>
  )
  return <span className="flex flex-col gap-1 text-[13px]">{part(b.cabinKg, 'Cabin', BackpackIcon)}{part(b.checkedKg, 'Checked', SuitcaseRollingIcon)}</span>
}

const refundCopy = (r: boolean | null) => (r === true ? 'Refundable' : r === false ? 'Non-refundable' : 'Refund rules not provided')

function OfferCard({ o, adults, onCheck }: { o: Offer; adults: number; onCheck: (o: Offer) => void }) {
  const segs = o.segments as Seg[]
  const first = segs[0], last = segs[segs.length - 1]
  const layover = segs.length > 1 ? Math.round((new Date(segs[1].dep).getTime() - new Date(segs[0].arr).getTime()) / 60e3) : 0
  const ftz = first.depTz ?? 'Asia/Kolkata', ltz = last.arrTz ?? 'Asia/Kolkata'
  const nextDay = dayLabel(last.arr, ltz) !== dayLabel(first.dep, ftz)
  return (
    <article className="glass-dense grid overflow-hidden rounded-lg sm:grid-cols-[minmax(0,1fr)_14.5rem]" aria-label={`${o.carrierName}, ${money(o.totalPrice, o.currency)}`}>
      <div className="p-5">
        <p className="text-[13.5px] text-slate">{o.carrierName}<span className="text-muted"> sold by {o.supplier}</span></p>
        <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <div>
            <p className="font-mono tnum text-[1.6rem] font-medium leading-none">{clock(first.dep, ftz)}</p>
            <p className="mt-1 font-mono text-[13px] tracking-wide text-slate">{first.origin}</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-[12.5px] text-slate">{duration(o.durationMin)}</p>
            <div aria-hidden className="relative my-1.5 h-px bg-rule-strong">
              {segs.slice(1).map((s) => <span key={s.origin} className="absolute left-1/2 top-1/2 size-2 -translate-1/2 rounded-full border border-slate bg-paper" />)}
            </div>
            <p className={`text-[12.5px] ${o.stops ? 'text-amber-ink' : 'text-go-ink'}`}>
              {o.stops === 0 ? 'Non-stop' : `${o.stops} stop via ${segs.slice(1).map((s) => s.origin).join(', ')}, ${duration(layover)} change`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono tnum text-[1.6rem] font-medium leading-none">{clock(last.arr, ltz)}{nextDay && <sup className="ml-0.5 text-[11px] text-amber-ink">+1</sup>}</p>
            <p className="mt-1 font-mono text-[13px] tracking-wide text-slate">{last.destination}</p>
          </div>
        </div>
        <p className="mt-4 font-mono text-[12.5px] text-muted">{segs.map((s) => `${s.carrier} ${s.number}`).join('  +  ')}</p>
      </div>
      {/* perforation: dashed rule with two notches, the stub of a boarding pass */}
      <div className="relative flex flex-col gap-3 border-t border-dashed border-rule-strong p-5 sm:border-l sm:border-t-0">
        <span aria-hidden className="absolute -left-2 -top-2 hidden size-4 rounded-full bg-paper sm:block" />
        <span aria-hidden className="absolute -bottom-2 -left-2 hidden size-4 rounded-full bg-paper sm:block" />
        <div>
          <p className="font-mono tnum text-[1.55rem] font-medium leading-none">{money(o.totalPrice, o.currency)}</p>
          <p className="mt-1 text-[12.5px] text-muted">
            Total for {adults} {adults === 1 ? 'traveller' : 'travellers'}
            {o.fx && <>, from {money(o.origPrice, o.origCurrency)}</>}
          </p>
        </div>
        <Baggage b={o.baggage} />
        <p className={`text-[13px] ${o.refundable == null ? 'text-amber-ink' : 'text-slate'}`}>{refundCopy(o.refundable)}</p>
        <div className="mt-auto flex items-center justify-between gap-2">
          <FreshnessBadge meta={o.meta} />
          <button className={btn.quiet} onClick={() => onCheck(o)}>Check price</button>
        </div>
      </div>
    </article>
  )
}

function PriceCheckDialog({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const check = useQuery({
    queryKey: ['price-check', offer?.id],
    queryFn: () => api<PriceCheck>(`/fares/${offer!.id}/price-check`, { method: 'POST' }),
    enabled: Boolean(offer),
    gcTime: 0,
    retry: false,
  })
  return (
    <dialog
      ref={(el) => { ref.current = el; if (el && offer && !el.open) el.showModal() }}
      onClose={onClose}
      className="glass-float m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg p-6 text-ink backdrop:bg-ink/25 backdrop:backdrop-blur-[2px]"
    >
      {offer && (
        <>
          <h2 className="text-[18px] font-semibold">Price check</h2>
          <p className="mt-1 text-[14px] text-slate">{offer.carrierName}, {offer.segments[0].origin} to {offer.segments[offer.segments.length - 1].destination}, sold by {offer.supplier}</p>
          <div className="mt-5 min-h-16" aria-live="polite">
            {check.isPending && <p className="text-[15px] text-slate">Asking the supplier to confirm this fare…</p>}
            {check.error && <Notice tone="error" title="The supplier did not confirm this fare.">{check.error.message}</Notice>}
            {check.data && (check.data.changed ? (
              <p className="text-[15px]">The price moved from <span className="font-mono line-through">{money(check.data.oldPrice, check.data.currency)}</span> to <span className="font-mono font-medium text-amber-ink">{money(check.data.newPrice, check.data.currency)}</span>.</p>
            ) : (
              <p className="text-[15px]">Confirmed at <span className="font-mono font-medium text-go-ink">{money(check.data.newPrice, check.data.currency)}</span>.</p>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-muted">The supplier sets the final price, seats and conditions at checkout. Demo offers have no booking link.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btn.quiet} onClick={() => ref.current?.close()}>Close</button>
            <button className={btn.primary} disabled title="Not available for demo offers">Continue to supplier</button>
          </div>
        </>
      )}
    </dialog>
  )
}

const SORTS: [FareSearch['sort'], string][] = [['best', 'Best overall'], ['price', 'Lowest price'], ['duration', 'Shortest'], ['stops', 'Fewest stops']]

export function Compare() {
  const [params, setParams] = useSearchParams()
  const initial = readQuery(params)
  const [form, setForm] = useState<FareSearch>(initial ?? { origin: '', destination: '', date: todayIn('Asia/Kolkata'), adults: 1, cabin: 'ECONOMY', currency: 'INR', nonStopOnly: false, sort: 'best' })
  const [formKey, setFormKey] = useState(0)
  const [sort, setSort] = useState<FareSearch['sort']>('best')
  const [nonStop, setNonStop] = useState(false)
  const [knownBags, setKnownBags] = useState(false)
  const [checking, setChecking] = useState<Offer | null>(null)

  const search = useQuery({
    queryKey: ['fares', initial],
    queryFn: () => api<FareResults>('/fares/search', { method: 'POST', json: initial }),
    enabled: Boolean(initial),
    staleTime: 10 * 60e3,
    retry: false,
  })

  const offers = useMemo(() => {
    const list = (search.data?.items ?? []).filter((o) => (!nonStop || o.stops === 0) && (!knownBags || (o.baggage.cabinKg != null && o.baggage.checkedKg != null)))
    const by: Record<FareSearch['sort'], (a: Offer, b: Offer) => number> = {
      best: (a, b) => (a.score ?? 0) - (b.score ?? 0) || a.totalPrice - b.totalPrice,
      price: (a, b) => a.totalPrice - b.totalPrice,
      duration: (a, b) => a.durationMin - b.durationMin,
      stops: (a, b) => a.stops - b.stops || a.totalPrice - b.totalPrice,
    }
    return [...list].sort(by[sort])
  }, [search.data, sort, nonStop, knownBags])

  const submit = () => {
    if (!form.origin || !form.destination || form.origin === form.destination) return
    setParams({ origin: form.origin, destination: form.destination, date: form.date, adults: String(form.adults), cabin: form.cabin, currency: form.currency })
  }
  const set = <K extends keyof FareSearch>(k: K, v: FareSearch[K]) => setForm((f) => ({ ...f, [k]: v }))
  const sameAirport = form.origin !== '' && form.origin === form.destination

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[14px] text-slate">Compare fares</p>
        <h1 className="mt-1 font-serif text-display">
          {initial ? <span className="font-mono text-title font-medium tracking-wide">{initial.origin} to {initial.destination}</span> : 'Like for like, before you pay.'}
        </h1>
      </header>

      <form key={formKey} className="glass-float grid grid-cols-2 items-end gap-3 rounded-lg p-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_10rem_7rem_8.5rem_6.5rem_auto]" onSubmit={(e) => { e.preventDefault(); submit() }}>
        <AirportSearch label="From" value={form.origin} onChange={(a) => set('origin', a.iata)} />
        <button
          type="button"
          aria-label="Swap origin and destination"
          className="hidden size-[42px] items-center justify-center self-end rounded-md border border-rule-strong bg-white/50 text-slate hover:text-ink md:inline-flex"
          onClick={() => { setForm((f) => ({ ...f, origin: f.destination, destination: f.origin })); setFormKey((k) => k + 1) }}
        ><ArrowsLeftRightIcon size={18} /></button>
        <AirportSearch label="To" value={form.destination} onChange={(a) => set('destination', a.iata)} />
        <div>
          <label htmlFor="c-date" className="mb-1 block text-[13px] text-slate">Date</label>
          <input id="c-date" type="date" required min={todayIn('Asia/Kolkata')} className={`${field} font-mono`} value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label htmlFor="c-pax" className="mb-1 block text-[13px] text-slate">Travellers</label>
          <select id="c-pax" className={field} value={form.adults} onChange={(e) => set('adults', Number(e.target.value))}>
            {Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} adult{i ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="c-cabin" className="mb-1 block text-[13px] text-slate">Cabin</label>
          <select id="c-cabin" className={field} value={form.cabin} onChange={(e) => set('cabin', e.target.value as FareSearch['cabin'])}>
            <option value="ECONOMY">Economy</option><option value="BUSINESS">Business</option>
          </select>
        </div>
        <div>
          <label htmlFor="c-cur" className="mb-1 block text-[13px] text-slate">Currency</label>
          <select id="c-cur" className={field} value={form.currency} onChange={(e) => set('currency', e.target.value as FareSearch['currency'])}>
            {['INR', 'USD', 'EUR', 'AED'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <button className={`${btn.primary} col-span-2 h-[42px] md:col-span-1`} disabled={!form.origin || !form.destination || sameAirport}>Search fares</button>
        {sameAirport && <p className="col-span-full text-[13px] text-stop-ink">From and To are the same airport.</p>}
      </form>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
        <section className="min-w-0 space-y-3 lg:col-span-8" aria-label="Offers" aria-busy={search.isFetching}>
          {!initial && <Notice title="Pick a route and a date to see offers.">We compare the total price for the same travellers, cabin and currency, and show what each fare actually includes.</Notice>}
          {search.isFetching && <div className="glass-dense rounded-lg"><SkeletonRows rows={4} /></div>}
          {search.error && <Notice tone="error" title="The fare search did not complete.">{search.error.message}</Notice>}
          {search.data && !search.isFetching && (
            offers.length ? (
              <>
                <p className="text-[13.5px] text-slate">{offers.length} of {search.data.count} offers for {dayLabel(`${initial!.date}T12:00:00Z`, 'UTC')}</p>
                {offers.map((o) => <OfferCard key={o.id} o={o} adults={initial!.adults} onCheck={setChecking} />)}
              </>
            ) : (
              <Notice title={search.data.count ? 'Your filters hide every offer.' : 'No offers for this route and date.'}>
                {search.data.count ? 'Turn off non-stop only or the baggage filter to see them.' : 'Suppliers returned nothing. Try another date or a nearby airport.'}
              </Notice>
            )
          )}
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <fieldset className="glass-card rounded-lg p-4">
            <legend className="sr-only">Sort and filter</legend>
            <p className="text-[16px] font-semibold">Sort by</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Sort by">
              {SORTS.map(([k, label]) => (
                <label key={k} className={`cursor-pointer rounded-md border px-3 py-2 text-[14px] has-focus-visible:outline-2 has-focus-visible:outline-sky ${sort === k ? 'border-ink bg-ink text-paper' : 'border-rule-strong bg-white/50 text-slate hover:text-ink'}`}>
                  <input type="radio" name="sort" className="sr-only" checked={sort === k} onChange={() => setSort(k)} />{label}
                </label>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-[14px]">
              <input type="checkbox" className="size-4 accent-[var(--color-sky)]" checked={nonStop} onChange={(e) => setNonStop(e.target.checked)} /> Non-stop only
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-[14px]">
              <input type="checkbox" className="size-4 accent-[var(--color-sky)]" checked={knownBags} onChange={(e) => setKnownBags(e.target.checked)} /> Only fares with stated baggage
            </label>
            {search.data && <p className="mt-4 border-t border-rule pt-3 text-[12.5px] leading-relaxed text-muted">{search.data.disclosure}</p>}
          </fieldset>
          <DemoBanner>Fares and suppliers here are simulated. Exchange rates come from a fixed demo table, stamped with the time they were applied.</DemoBanner>
        </aside>
      </div>

      <PriceCheckDialog offer={checking} onClose={() => setChecking(null)} />
    </div>
  )
}
