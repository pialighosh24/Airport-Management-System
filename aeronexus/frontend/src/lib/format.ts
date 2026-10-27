import type { FlightStatus } from './types'

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(timeZone: string, opts: Intl.DateTimeFormatOptions) {
  const key = timeZone + JSON.stringify(opts)
  let f = fmtCache.get(key)
  if (!f) fmtCache.set(key, (f = new Intl.DateTimeFormat('en-IN', { timeZone, ...opts })))
  return f
}

/** 24h wall-clock time in the airport's own zone. */
export const clock = (iso: string | Date, tz: string) =>
  fmt(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

export const dayLabel = (iso: string | Date, tz: string) =>
  fmt(tz, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso))

export const tzName = (tz: string, at = new Date()) =>
  fmt(tz, { timeZoneName: 'short' }).formatToParts(at).find((p) => p.type === 'timeZoneName')?.value ?? tz

/** Signed minutes between two instants, null if either is unknown. */
export function deltaMin(planned: string | null, actual: string | null) {
  if (!planned || !actual) return null
  return Math.round((new Date(actual).getTime() - new Date(planned).getTime()) / 60e3)
}

export function duration(min: number) {
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export function age(sec: number | null) {
  if (sec == null) return 'unknown age'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`
  return `${Math.round(sec / 3600)} h ago`
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: currency === 'INR' ? 0 : 2 }).format(amount)
}

export const STATUS_LABEL: Record<FlightStatus, string> = {
  scheduled: 'Scheduled',
  boarding: 'Boarding',
  departed: 'Departed',
  en_route: 'In the air',
  landed: 'Landed',
  arrived: 'Arrived',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
  diverted: 'Diverted',
  unknown: 'Unknown',
}

export const todayIn = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
