import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { Types } from 'mongoose'
import { z } from 'zod'
import { airportByIata } from '../data/airports'
import { DEMO_SOURCE, demoOffers, fxDemo } from '../data/demo'
import { metaOf } from '../domain/freshness'
import { dedupe, sortOffers } from '../domain/fares'
import { HttpError, iata, parse } from '../lib/http'
import { FareOffer, FarePriceCheck } from '../models'
import { markDemoTick } from '../providers/registry'

export const faresRouter = Router()

const throttle = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false })
const OFFER_TTL_MS = 20 * 60e3
const meta = (fetchedAt: Date) => metaOf(DEMO_SOURCE, fetchedAt, null, { liveSec: 0, staleSec: 0, demo: true })

const searchSchema = z.object({
  origin: iata,
  destination: iata,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(9).default(1),
  cabin: z.enum(['ECONOMY', 'BUSINESS']).default('ECONOMY'),
  currency: z.enum(['INR', 'USD', 'EUR', 'AED']).default('INR'),
  nonStopOnly: z.boolean().default(false),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['best', 'price', 'duration', 'stops']).default('best'),
}).refine((q) => q.origin !== q.destination, { message: 'origin and destination must differ', path: ['destination'] })

type OfferRow = Omit<ReturnType<typeof demoOffers>[number], never> & { totalPrice: number }

function offerDto(o: { _id: unknown; fetchedAt?: Date | null; expiresAt: Date } & Record<string, unknown>, score?: number) {
  return {
    id: String(o._id), providerRef: o.providerRef, supplier: o.supplier, carrier: o.carrier, carrierName: o.carrierName,
    segments: o.segments, stops: o.stops, durationMin: o.durationMin,
    totalPrice: o.totalPrice, currency: o.currency, origPrice: o.origPrice, origCurrency: o.origCurrency,
    fx: o.origCurrency === o.currency ? null : { rate: o.fxRate, at: o.fxAt, source: 'Demo FX table' },
    baggage: o.baggage, refundable: o.refundable ?? null, changeable: o.changeable ?? null,
    expiresAt: o.expiresAt, score: score ?? null,
    meta: meta(o.fetchedAt ?? new Date()),
  }
}

faresRouter.post('/fares/search', throttle, async (req, res) => {
  const q = parse(searchSchema, req.body)
  const today = new Date().toISOString().slice(0, 10)
  if (q.date < today) throw new HttpError(400, 'validation_failed', 'date: pick today or a later date')
  if (!airportByIata.has(q.origin) || !airportByIata.has(q.destination)) throw new HttpError(404, 'unknown_airport', 'One of those airports is not in the registry.')

  const fetchedAt = new Date()
  const fx = fxDemo(q.currency)
  if (fx.rate == null) throw new HttpError(400, 'unsupported_currency', `No rate for ${q.currency}`)
  let offers: OfferRow[] = dedupe(demoOffers(q))
  if (q.nonStopOnly) offers = offers.filter((o) => o.stops === 0)
  const converted = offers.map((o) => ({ ...o, origPrice: o.totalPrice, totalPrice: Math.round(o.totalPrice * fx.rate!) }))
  const filtered = q.maxPrice ? converted.filter((o) => o.totalPrice <= q.maxPrice!) : converted
  const sorted = sortOffers(filtered, q.sort)

  const searchId = randomUUID()
  const docs = await FareOffer.insertMany(sorted.map((o) => ({
    ...o, searchId, currency: q.currency, origCurrency: 'INR', fxRate: fx.rate, fxAt: fx.at,
    source: DEMO_SOURCE, fetchedAt, expiresAt: new Date(fetchedAt.getTime() + OFFER_TTL_MS),
  })))
  markDemoTick('demo-fares')
  res.json({
    searchId, query: q, count: docs.length,
    disclosure: 'Prices are indicative until the supplier confirms them at checkout. "Best" = 0.55 × price rank + 0.30 × duration rank + 0.15 × stops rank.',
    items: docs.map((d, i) => offerDto(d.toObject(), sorted[i].score)),
  })
})

faresRouter.post('/fares/:offerId/price-check', throttle, async (req, res) => {
  const id = parse(z.string().refine((s) => Types.ObjectId.isValid(s), 'invalid offer id'), req.params.offerId)
  const offer = await FareOffer.findById(id)
  if (!offer) throw new HttpError(404, 'offer_gone', 'This offer has expired. Search again for current prices.')
  if (offer.expiresAt.getTime() < Date.now()) throw new HttpError(410, 'offer_expired', 'This offer expired. Search again for current prices.')
  // DEMO: revalidation usually confirms, sometimes moves a little, like real fare caches do
  const roll = Math.random()
  const factor = roll < 0.75 ? 1 : roll < 0.9 ? 1.04 : 0.98
  const oldPrice = offer.totalPrice!
  const newPrice = Math.round(oldPrice * factor)
  const checkedAt = new Date()
  offer.totalPrice = newPrice
  offer.fetchedAt = checkedAt
  await offer.save()
  await FarePriceCheck.create({ offerId: id, oldPrice, newPrice, currency: offer.currency, checkedAt, source: DEMO_SOURCE })
  res.json({ offerId: id, oldPrice, newPrice, currency: offer.currency, changed: newPrice !== oldPrice, checkedAt, meta: meta(checkedAt) })
})
