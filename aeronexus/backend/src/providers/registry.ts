import { ProviderRun } from '../models'

export type ProviderState = 'ok' | 'degraded' | 'down' | 'demo' | 'idle'

type Health = {
  id: string
  label: string
  kind: 'live' | 'demo'
  lastSuccess: Date | null
  lastError: string | null
  lastLatencyMs: number | null
  consecutiveFailures: number
  openUntil: number // circuit breaker
}

const providers = new Map<string, Health>()

export function register(id: string, label: string, kind: 'live' | 'demo') {
  providers.set(id, { id, label, kind, lastSuccess: null, lastError: null, lastLatencyMs: null, consecutiveFailures: 0, openUntil: 0 })
}

export class CircuitOpenError extends Error {}

/**
 * Timeout + one bounded retry + circuit breaker (opens for 2 min after 3 straight failures).
 * Every attempt is recorded for the health strip.
 */
export async function call<T>(id: string, fn: (signal: AbortSignal) => Promise<T>, timeoutMs = 8000): Promise<T> {
  const p = providers.get(id)
  if (!p) throw new Error(`unknown provider ${id}`)
  if (Date.now() < p.openUntil) throw new CircuitOpenError(`${p.label} paused after repeated failures`)
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = Date.now()
    try {
      const out = await fn(AbortSignal.timeout(timeoutMs))
      p.lastSuccess = new Date()
      p.lastLatencyMs = Date.now() - t0
      p.consecutiveFailures = 0
      p.lastError = null
      void ProviderRun.create({ provider: id, at: new Date(), success: true, latencyMs: p.lastLatencyMs }).catch(() => {})
      return out
    } catch (e) {
      lastErr = e
      const code = e instanceof Error ? e.message.slice(0, 120) : 'error'
      p.lastError = code
      p.consecutiveFailures++
      void ProviderRun.create({ provider: id, at: new Date(), success: false, latencyMs: Date.now() - t0, errorCode: code }).catch(() => {})
      if (code.includes('429')) break // rate limited: retrying only burns quota
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
    }
  }
  if (p.consecutiveFailures >= 3) p.openUntil = Date.now() + 120_000
  throw lastErr
}

export function markDemoTick(id: string) {
  const p = providers.get(id)
  if (p) p.lastSuccess = new Date()
}

export function health() {
  const now = Date.now()
  return [...providers.values()].map((p) => {
    let state: ProviderState
    if (p.kind === 'demo') state = 'demo'
    else if (now < p.openUntil) state = 'down'
    else if (!p.lastSuccess && !p.lastError) state = 'idle'
    else if (p.consecutiveFailures > 0) state = 'degraded'
    else state = 'ok'
    return {
      id: p.id, label: p.label, state,
      lastSuccess: p.lastSuccess?.toISOString() ?? null,
      lastLatencyMs: p.lastLatencyMs,
      // errors are short provider codes, never credentials
      lastError: p.lastError,
    }
  })
}
