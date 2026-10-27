const R_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

export type LatLon = { lat: number; lon: number }

export function distanceKm(a: LatLon, b: LatLon) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.sqrt(h))
}

/** Point a fraction `f` (0..1) along the great circle from a to b, plus the heading there. */
export function interpolate(a: LatLon, b: LatLon, f: number): LatLon & { heading: number } {
  const φ1 = rad(a.lat), λ1 = rad(a.lon), φ2 = rad(b.lat), λ2 = rad(b.lon)
  const δ = distanceKm(a, b) / R_KM
  if (δ === 0) return { ...a, heading: 0 }
  const A = Math.sin((1 - f) * δ) / Math.sin(δ)
  const B = Math.sin(f * δ) / Math.sin(δ)
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2)
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2)
  const z = A * Math.sin(φ1) + B * Math.sin(φ2)
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
  const lon = Math.atan2(y, x)
  const heading = (deg(Math.atan2(
    Math.sin(λ2 - lon) * Math.cos(φ2),
    Math.cos(lat) * Math.sin(φ2) - Math.sin(lat) * Math.cos(φ2) * Math.cos(λ2 - lon),
  )) + 360) % 360
  return { lat: deg(lat), lon: deg(lon), heading }
}

/** Distance from point p to the great-circle segment a→b, approximated by sampling. Good enough for a corridor check. */
export function corridorKm(p: LatLon, a: LatLon, b: LatLon) {
  let best = Infinity
  for (let i = 0; i <= 20; i++) best = Math.min(best, distanceKm(p, interpolate(a, b, i / 20)))
  return best
}

/** Calendar date (YYYY-MM-DD) of an instant in an IANA timezone. */
export function localDate(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** UTC instant for a wall-clock time in an IANA timezone (DST-safe: resolves the zone offset at that instant). */
export function zonedTime(date: string, minutesOfDay: number, timeZone: string) {
  const [y, m, d] = date.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60)
  const offset = (t: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      }).formatToParts(t).map((p) => [p.type, p.value]),
    )
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - t
  }
  const first = guess - offset(guess)
  return new Date(guess - offset(first))
}
