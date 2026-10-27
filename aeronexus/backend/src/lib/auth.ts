import type { RequestHandler, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env'
import { HttpError } from './http'

export type Role = 'user' | 'ops' | 'supervisor' | 'admin'
export type Session = { sub: string; email: string; roles: Role[]; airportScope: string[] }

const COOKIE = 'ax_session'
const MAX_AGE_SEC = 8 * 3600
// ponytail: single 8h session token, add refresh rotation when sessions need revocation

export function setSession(res: Response, s: Session) {
  const token = jwt.sign(s, env.JWT_SECRET, { expiresIn: MAX_AGE_SEC })
  res.cookie(COOKIE, token, {
    httpOnly: true, sameSite: 'strict', secure: env.NODE_ENV === 'production', maxAge: MAX_AGE_SEC * 1000, path: '/',
  })
}

export const clearSession = (res: Response) => res.clearCookie(COOKIE, { path: '/' })

/** Attaches res.locals.session when a valid cookie is present. Never rejects. */
export const readSession: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[COOKIE]
  if (token) {
    try {
      res.locals.session = jwt.verify(token, env.JWT_SECRET) as Session
    } catch {
      clearSession(res)
    }
  }
  next()
}

/** Deny by default: no session → 401, wrong role → 403. Admin passes every role check. */
export const requireRole = (...roles: Role[]): RequestHandler => (_req, res, next) => {
  const s = res.locals.session as Session | undefined
  if (!s) throw new HttpError(401, 'unauthenticated', 'Sign in to continue.')
  if (roles.length && !s.roles.some((r) => r === 'admin' || roles.includes(r))) {
    throw new HttpError(403, 'forbidden', 'Your role does not allow this.')
  }
  next()
}
