import { randomUUID } from 'node:crypto'
import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z, type ZodType } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, public code: string, detail: string) {
    super(detail)
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id')
  const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID()
  res.locals.requestId = id
  res.setHeader('x-request-id', id)
  next()
}

/** Parse and validate; throws a 400 problem on failure. */
export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data)
  if (!r.success) {
    const first = r.error.issues[0]
    throw new HttpError(400, 'validation_failed', `${first.path.join('.') || 'input'}: ${first.message}`)
  }
  return r.data
}

/** RFC 7807 problem+json for every error. Internals never leak. */
export const problem: ErrorRequestHandler = (err, req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500
  if (status === 500) console.error(`[${res.locals.requestId}]`, err)
  res.status(status).type('application/problem+json').json({
    type: 'about:blank',
    title: status === 500 ? 'Internal Server Error' : err.message,
    status,
    code: err instanceof HttpError ? err.code : 'internal_error',
    detail: status === 500 ? 'Something went wrong on our side.' : err.message,
    instance: req.originalUrl,
    requestId: res.locals.requestId,
  })
}

export const notFound: RequestHandler = (req) => {
  throw new HttpError(404, 'not_found', `No route for ${req.method} ${req.path}`)
}

export const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'expected a 3-letter IATA code')
