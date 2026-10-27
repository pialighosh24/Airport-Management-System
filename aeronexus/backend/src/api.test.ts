import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { createApp } from './app'
import { airportDocs } from './data/airports'
import { Airport } from './models'
import { ensureDemoSchedule } from './modules/flights'

let rs: MongoMemoryReplSet
const app = createApp()
const ORIGIN = 'http://localhost:5173'

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  await mongoose.connect(rs.getUri('aeronexus-test'))
  for (const m of Object.values(mongoose.models)) {
    await m.createCollection().catch(() => {})
    await m.syncIndexes()
  }
  await Airport.insertMany(airportDocs)
  await ensureDemoSchedule()
}, 120_000)

afterAll(async () => {
  await mongoose.disconnect()
  await rs?.stop()
})

const inDays = (d: number) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10)

describe('airports and boards', () => {
  it('ranks an exact code first', async () => {
    const r = await request(app).get('/api/v1/airports?query=del').expect(200)
    expect(r.body.items[0].iata).toBe('DEL')
  })

  it('labels every board row with source and DEMO freshness', async () => {
    const r = await request(app).get('/api/v1/airports/DEL/board?type=departure&hoursAhead=24').expect(200)
    expect(r.body.items.length).toBeGreaterThan(0)
    for (const f of r.body.items) {
      expect(f.meta.freshness).toBe('DEMO')
      expect(f.meta.source).toBeTruthy()
      expect(f.scheduledDep).toBeTruthy() // scheduled time is always preserved
      expect(f).not.toHaveProperty('sim') // simulator internals never leak
    }
  })

  it('starts each flight with a status history entry', async () => {
    const board = await request(app).get('/api/v1/airports/BOM/board?hoursAhead=24').expect(200)
    const r = await request(app).get(`/api/v1/flights/${board.body.items[0].flightKey}`).expect(200)
    expect(r.body.history.length).toBeGreaterThan(0)
  })

  it('rejects bad codes with problem+json', async () => {
    const r = await request(app).get('/api/v1/airports/D3L/board').expect(400)
    expect(r.headers['content-type']).toContain('application/problem+json')
    expect(r.body).toMatchObject({ status: 400, code: 'validation_failed' })
    expect(r.body.requestId).toBeTruthy()
  })
})

describe('fares', () => {
  it('returns unique offers including one-stop itineraries', async () => {
    const r = await request(app).post('/api/v1/fares/search').set('origin', ORIGIN)
      .send({ origin: 'BLR', destination: 'GAU', date: inDays(3) }).expect(200)
    const refs = r.body.items.map((o: { providerRef: string }) => o.providerRef)
    expect(new Set(refs).size).toBe(refs.length)
    expect(r.body.items.some((o: { stops: number }) => o.stops > 0)).toBe(true)
  })

  it('converts currency and keeps the original price and rate', async () => {
    const r = await request(app).post('/api/v1/fares/search').set('origin', ORIGIN)
      .send({ origin: 'DEL', destination: 'BOM', date: inDays(5), currency: 'USD' }).expect(200)
    const o = r.body.items[0]
    expect(o.currency).toBe('USD')
    expect(o.fx).toMatchObject({ rate: expect.any(Number), at: expect.any(String) })
    expect(o.origPrice).toBeGreaterThan(o.totalPrice)
  })

  it('refuses identical origin and destination', async () => {
    await request(app).post('/api/v1/fares/search').set('origin', ORIGIN)
      .send({ origin: 'DEL', destination: 'DEL', date: inDays(1) }).expect(400)
  })
})

describe('auth', () => {
  it('registers, reads the session, and denies by default', async () => {
    const agent = request.agent(app)
    await agent.post('/api/v1/auth/register').set('origin', ORIGIN).send({ email: 'riya@example.com', password: 'long-enough-pw' }).expect(201)
    const me = await agent.get('/api/v1/auth/me').expect(200)
    expect(me.body.roles).toEqual(['user'])
    await agent.get('/api/v1/admin/providers/health').expect(403)
    await request(app).get('/api/v1/auth/me').expect(401)
  })

  it('gives the same answer for unknown email and wrong password', async () => {
    const a = await request(app).post('/api/v1/auth/login').set('origin', ORIGIN).send({ email: 'nobody@example.com', password: 'long-enough-pw' }).expect(401)
    const b = await request(app).post('/api/v1/auth/login').set('origin', ORIGIN).send({ email: 'riya@example.com', password: 'wrong-password' }).expect(401)
    expect(a.body.detail).toBe(b.body.detail)
  })

  it('blocks cross-site writes', async () => {
    await request(app).post('/api/v1/auth/login').set('origin', 'https://evil.example').send({}).expect(403)
  })
})
