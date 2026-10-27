import argon2 from 'argon2'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { clearSession, requireRole, setSession, type Role, type Session } from '../lib/auth'
import { HttpError, parse } from '../lib/http'
import { AuditEvent, User } from '../models'

export const identityRouter = Router()

const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false })
const creds = z.object({ email: z.email().max(200), password: z.string().min(10, 'use at least 10 characters').max(200) })

const sessionOf = (u: { _id: unknown; email: string; roles: string[]; airportScope: string[] }): Session => ({
  sub: String(u._id), email: u.email, roles: u.roles as Role[], airportScope: u.airportScope,
})
const me = (s: Session) => ({ id: s.sub, email: s.email, roles: s.roles, airportScope: s.airportScope })

identityRouter.post('/auth/register', authLimit, async (req, res) => {
  const { email, password, name } = parse(creds.extend({ name: z.string().trim().max(80).optional() }), req.body)
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'email_taken', 'That email already has an account.')
  const user = await User.create({ email, name, passwordHash: await argon2.hash(password) })
  const s = sessionOf(user)
  setSession(res, s)
  res.status(201).json(me(s))
})

identityRouter.post('/auth/login', authLimit, async (req, res) => {
  const { email, password } = parse(creds, req.body)
  const user = await User.findOne({ email: email.toLowerCase() })
  // same message for unknown email and wrong password
  if (!user || !(await argon2.verify(user.passwordHash, password))) throw new HttpError(401, 'bad_credentials', 'Email or password is incorrect.')
  const s = sessionOf(user)
  setSession(res, s)
  await AuditEvent.create({ actor: user.email, action: 'login' })
  res.json(me(s))
})

identityRouter.post('/auth/logout', (_req, res) => {
  clearSession(res)
  res.status(204).end()
})

identityRouter.get('/auth/me', requireRole(), (_req, res) => {
  res.json(me(res.locals.session as Session))
})

export async function ensureAdmin(email: string, password: string) {
  if (!email || !password) return
  if (await User.exists({ email: email.toLowerCase() })) return
  await User.create({ email, name: 'Admin', passwordHash: await argon2.hash(password), roles: ['admin'] })
  console.log(`[identity] created admin ${email}`)
}
