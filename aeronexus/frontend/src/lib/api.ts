import { io, type Socket } from 'socket.io-client'

/** Mirrors the backend's RFC 7807 problem+json. */
export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message)
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(`/api/v1${path}`, {
      credentials: 'same-origin',
      ...rest,
      headers: { ...(json !== undefined ? { 'content-type': 'application/json' } : {}), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ApiError(0, 'network', 'Cannot reach the AeroNexus server. Check your connection.')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body?.code ?? 'error', body?.detail ?? `Request failed (${res.status})`, body?.requestId)
  return body as T
}

let socket: Socket | null = null
/** One shared connection to the /rt namespace; reconnects with backoff on its own. */
export function rt() {
  socket ??= io('/rt', { transports: ['websocket'], reconnectionDelayMax: 10_000 })
  return socket
}
