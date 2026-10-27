import mongoose from 'mongoose'
import { env } from './env'

export async function connectDb() {
  let uri = env.MONGODB_URI
  if (!uri) {
    // ponytail: in-memory replica set for zero-setup dev; set MONGODB_URI for anything persistent
    const { MongoMemoryReplSet } = await import('mongodb-memory-server')
    const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    uri = rs.getUri('aeronexus')
    console.log('[db] MONGODB_URI not set, using in-memory replica set (data resets on restart)')
  }
  await mongoose.connect(uri)
  // createCollection first so time-series options apply before any insert
  for (const m of Object.values(mongoose.models)) {
    await m.createCollection().catch(() => {})
    await m.syncIndexes()
  }
  console.log('[db] connected')
}
