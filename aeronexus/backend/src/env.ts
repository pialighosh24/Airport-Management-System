import { z } from 'zod'

const schema = z.object({
  MONGODB_URI: z.string().default(''),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(8).default('change-me-dev-only'),
  PROVIDER_MODE: z.enum(['demo', 'live']).default('demo'),
  OPENSKY_POLL_SEC: z.coerce.number().min(10).default(300),
  FRESHNESS_LIVE_SEC: z.coerce.number().default(60),
  FRESHNESS_STALE_SEC: z.coerce.number().default(600),
  MATCH_CONFIDENCE_MIN: z.coerce.number().min(0).max(1).default(0.8),
  ADMIN_EMAIL: z.string().default(''),
  ADMIN_PASSWORD: z.string().default(''),
  NODE_ENV: z.string().default('development'),
})

export const env = schema.parse(process.env)

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'change-me-dev-only') {
  throw new Error('JWT_SECRET must be set in production')
}
