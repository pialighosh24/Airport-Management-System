import { randomUUID } from 'node:crypto'
import type { Server as HttpServer } from 'node:http'
import { Server, type Namespace } from 'socket.io'
import { env } from './env'

let rt: Namespace | null = null

export function initRealtime(http: HttpServer) {
  const io = new Server(http, { cors: { origin: env.FRONTEND_ORIGIN, credentials: true } })
  rt = io.of('/rt')
  rt.on('connection', (socket) => {
    // subscriptions are validated server-side; unknown shapes are ignored
    socket.on('subscribe', (msg: unknown, ack?: (ok: boolean) => void) => {
      const room = roomFor(msg)
      if (room) void socket.join(room)
      ack?.(Boolean(room))
    })
    socket.on('unsubscribe', (msg: unknown) => {
      const room = roomFor(msg)
      if (room) void socket.leave(room)
    })
  })
}

function roomFor(msg: unknown): string | null {
  const m = msg as { airport?: unknown; map?: unknown } | null
  if (typeof m?.airport === 'string' && /^[A-Z]{3}$/.test(m.airport)) return `airport:${m.airport}`
  if (m?.map === true) return 'map'
  return null
}

export function publish(rooms: string[], event: string, source: string, data: unknown, correlationId?: string) {
  if (!rt || !rooms.length) return
  rt.to(rooms).emit(event, {
    eventId: randomUUID(), eventTime: new Date().toISOString(), source, schemaVersion: 1,
    correlationId: correlationId ?? randomUUID(), data,
  })
}
