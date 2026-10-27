import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { env } from './env'
import { readSession, requireRole } from './lib/auth'
import { HttpError, notFound, problem, requestId } from './lib/http'
import { airportsRouter } from './modules/airports'
import { faresRouter } from './modules/fares'
import { flightsRouter } from './modules/flights'
import { identityRouter } from './modules/identity'
import { trackingRouter } from './modules/tracking'
import { ProviderRun } from './models'
import { health } from './providers/registry'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(requestId)
  app.use(helmet())
  app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }))
  app.use(express.json({ limit: '50kb' }))
  app.use(cookieParser())
  app.use(readSession)

  // cookie auth + JSON bodies: reject cross-site writes (CSRF) on top of SameSite=strict
  app.use((req, _res, next) => {
    const origin = req.get('origin')
    if (req.method !== 'GET' && req.method !== 'HEAD' && origin && origin !== env.FRONTEND_ORIGIN) {
      return next(new HttpError(403, 'cross_site', 'Cross-site request blocked.'))
    }
    next()
  })

  app.get('/healthz', (_req, res) => res.json({ ok: true }))
  app.get('/readyz', (_req, res) => {
    const ready = mongoose.connection.readyState === 1
    res.status(ready ? 200 : 503).json({ ok: ready })
  })

  const api = express.Router()
  api.use(identityRouter, airportsRouter, flightsRouter, trackingRouter, faresRouter)
  api.get('/providers/health', (_req, res) => res.json({ mode: env.PROVIDER_MODE, items: health() }))
  api.get('/admin/providers/health', requireRole('admin'), async (_req, res) => {
    const since = new Date(Date.now() - 24 * 3600e3)
    const stats = await ProviderRun.aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: '$provider', runs: { $sum: 1 }, failures: { $sum: { $cond: ['$success', 0, 1] } }, avgLatencyMs: { $avg: '$latencyMs' } } },
    ])
    res.json({ mode: env.PROVIDER_MODE, items: health(), last24h: stats })
  })
  app.use('/api/v1', api)

  app.use(notFound)
  app.use(problem)
  return app
}
