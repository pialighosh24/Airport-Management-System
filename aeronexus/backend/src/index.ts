import { createServer } from 'node:http'
import { createApp } from './app'
import { airportDocs } from './data/airports'
import { connectDb } from './db'
import { env } from './env'
import { Airport } from './models'
import { ensureDemoSchedule, tickDemoBoard } from './modules/flights'
import { ensureAdmin } from './modules/identity'
import { pollOpenSky, tickDemoAircraft } from './modules/tracking'
import { OPENSKY } from './providers/opensky'
import { register } from './providers/registry'
import { WEATHER } from './providers/weather'
import { initRealtime } from './realtime'

/** setInterval that never overlaps itself and never crashes the process. */
function every(ms: number, name: string, fn: () => Promise<unknown>) {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      await fn()
    } catch (e) {
      console.error(`[job:${name}]`, e)
    } finally {
      running = false
    }
  }
  void run()
  setInterval(run, ms)
}

await connectDb()
await Airport.bulkWrite(airportDocs.map((a) => ({ updateOne: { filter: { iata: a.iata }, update: { $set: a }, upsert: true } })))
await ensureAdmin(env.ADMIN_EMAIL, env.ADMIN_PASSWORD)

register('demo-schedule', 'Flight status (simulated)', 'demo')
register('demo-fares', 'Fares (simulated)', 'demo')
register(WEATHER, 'Weather · Open-Meteo', 'live')
if (env.PROVIDER_MODE === 'live') register(OPENSKY, 'Aircraft · OpenSky Network', 'live')
else register('demo-aircraft', 'Aircraft positions (simulated)', 'demo')

await ensureDemoSchedule()

const http = createServer(createApp())
initRealtime(http)

every(60 * 60e3, 'schedule', () => ensureDemoSchedule())
every(15e3, 'board', () => tickDemoBoard())
if (env.PROVIDER_MODE === 'live') every(env.OPENSKY_POLL_SEC * 1000, 'opensky', pollOpenSky)
else every(10e3, 'aircraft', () => tickDemoAircraft())

http.listen(env.PORT, () => console.log(`[api] http://localhost:${env.PORT}  mode=${env.PROVIDER_MODE}`))
