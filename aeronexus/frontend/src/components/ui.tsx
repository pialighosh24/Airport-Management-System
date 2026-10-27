import { useEffect, useRef, useState, type ReactNode } from 'react'
import { WarningIcon } from '@phosphor-icons/react'
import { age, STATUS_LABEL } from '../lib/format'
import type { FlightStatus, Freshness, Meta } from '../lib/types'

/**
 * Freshness is carried by shape + colour + words, never colour alone.
 * LIVE filled dot with a slow ring · RECENT half dot · STALE hollow triangle · DEMO striped tag · UNAVAILABLE crossed circle.
 */
export function FreshnessBadge({ meta, compact = false }: { meta: Meta; compact?: boolean }) {
  const words: Record<Freshness, string> = {
    LIVE: 'Live',
    RECENT: `Updated ${age(meta.ageSec)}`,
    STALE: `Stale, ${age(meta.ageSec)}`,
    DEMO: compact ? 'Demo' : 'Demo data',
    UNAVAILABLE: 'Unavailable',
  }
  const title = `${words[meta.freshness]}. Source: ${meta.source}${meta.fetchedAt ? `. Fetched ${new Date(meta.fetchedAt).toLocaleTimeString()}` : ''}`
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm text-[12px] leading-none ${meta.freshness === 'DEMO' ? (compact ? 'text-amber-ink' : 'demo-stripes px-1.5 py-1 text-amber-ink') : ''}`}>
      <FreshnessMark f={meta.freshness} />
      {compact && meta.freshness !== 'DEMO' ? <span className="sr-only">{words[meta.freshness]}</span> : <span className={meta.freshness === 'STALE' ? 'text-slate' : meta.freshness === 'UNAVAILABLE' ? 'text-stop-ink' : ''}>{words[meta.freshness]}</span>}
    </span>
  )
}

function FreshnessMark({ f }: { f: Freshness }) {
  if (f === 'LIVE') {
    return (
      <span className="relative inline-flex size-2" aria-hidden>
        <span className="pulse-ring absolute inset-0 rounded-full bg-go" />
        <span className="relative size-2 rounded-full bg-go" />
      </span>
    )
  }
  if (f === 'RECENT') return <span aria-hidden className="size-2 rounded-full border border-amber-ink" style={{ background: 'linear-gradient(90deg, var(--color-amber-ink) 50%, transparent 50%)' }} />
  if (f === 'STALE') return <svg aria-hidden width="10" height="9" viewBox="0 0 10 9"><path d="M5 1 9 8H1Z" fill="none" stroke="currentColor" className="text-muted" strokeWidth="1.4" /></svg>
  if (f === 'UNAVAILABLE') return <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" className="text-stop"><circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M2.3 7.7 7.7 2.3" stroke="currentColor" strokeWidth="1.3" /></svg>
  return null
}

const STATUS_TONE: Record<FlightStatus, string> = {
  scheduled: 'text-slate border-rule-strong',
  boarding: 'text-sky-ink border-sky bg-sky-wash',
  departed: 'text-ink border-rule-strong',
  en_route: 'text-ink border-rule-strong',
  landed: 'text-go-ink border-go/50',
  arrived: 'text-go-ink border-go/50',
  delayed: 'text-amber-ink border-amber bg-amber-wash',
  cancelled: 'text-stop-ink border-stop/60 bg-stop-wash line-through decoration-1',
  diverted: 'text-stop-ink border-stop/60 bg-stop-wash',
  unknown: 'text-muted border-dashed border-rule-strong',
}

export function StatusBadge({ status }: { status: FlightStatus }) {
  return (
    <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[12.5px] font-medium leading-none ${STATUS_TONE[status]}`}>
      <Flap text={STATUS_LABEL[status]} />
    </span>
  )
}

/** Text that flips character by character when its value changes. Static on first render. */
export function Flap({ text, className = '' }: { text: string; className?: string }) {
  const prev = useRef(text)
  const [changing, setChanging] = useState(false)
  useEffect(() => {
    if (prev.current === text) return
    prev.current = text
    setChanging(true)
    const t = setTimeout(() => setChanging(false), 900)
    return () => clearTimeout(t)
  }, [text])
  return (
    <span className={`flap ${changing ? 'is-changing' : ''} ${className}`} aria-live="polite">
      {[...text].map((ch, i) => (
        <span key={`${text}-${i}`} style={{ ['--i' as string]: i }}>{ch === ' ' ? ' ' : ch}</span>
      ))}
    </span>
  )
}

export function DemoBanner({ children }: { children?: ReactNode }) {
  return (
    <div role="note" className="demo-stripes flex items-start gap-2 rounded-md border border-amber/50 px-3 py-2 text-[13px] text-amber-ink">
      <WarningIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <p>{children ?? 'Flight times, aircraft and fares on this page are simulated demo data. Do not use them for travel decisions.'}</p>
    </div>
  )
}

export function Notice({ title, children, tone = 'neutral' }: { title: string; children?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-4 py-5 ${tone === 'error' ? 'border-stop/40 bg-stop-wash' : 'border-rule bg-paper/60'}`}>
      <p className={`font-medium ${tone === 'error' ? 'text-stop-ink' : 'text-ink'}`}>{title}</p>
      {children && <div className="mt-1 text-[14px] text-slate">{children}</div>}
    </div>
  )
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="divide-y divide-rule">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <span className="h-4 w-12 animate-pulse rounded-sm bg-paper-2" />
          <span className="h-4 w-16 animate-pulse rounded-sm bg-paper-2" />
          <span className="h-4 flex-1 animate-pulse rounded-sm bg-paper-2" />
        </div>
      ))}
    </div>
  )
}

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-ink px-4 py-2.5 text-[14px] font-medium text-paper transition-[background-color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:bg-sky-ink active:translate-y-px disabled:cursor-not-allowed disabled:bg-muted',
  quiet: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-rule-strong bg-white/50 px-3 py-2 text-[14px] text-ink transition-colors duration-[var(--dur-micro)] hover:border-ink hover:bg-white/80 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
}

export const field = 'w-full rounded-md border border-rule-strong bg-white/80 px-3 py-2.5 text-[15px] text-ink placeholder:text-muted transition-colors hover:border-slate focus:border-sky focus:outline-none focus-visible:outline-2 focus-visible:outline-sky aria-[invalid=true]:border-stop'
