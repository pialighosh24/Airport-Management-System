import { Schema, model, type InferSchemaType } from 'mongoose'

const point = {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [lon, lat]
}

const airportSchema = new Schema({
  iata: { type: String, required: true, unique: true },
  icao: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  timezone: { type: String, required: true },
  location: point,
  terminals: { type: [String], default: [] },
})
airportSchema.index({ location: '2dsphere' })
airportSchema.index({ name: 'text', city: 'text' })
export const Airport = model('Airport', airportSchema)
export type AirportDoc = InferSchemaType<typeof airportSchema>

export const FLIGHT_STATUSES = [
  'scheduled', 'boarding', 'departed', 'en_route', 'landed', 'arrived', 'delayed', 'cancelled', 'diverted', 'unknown',
] as const
export type FlightStatus = (typeof FLIGHT_STATUSES)[number]

const flightLegSchema = new Schema({
  flightKey: { type: String, required: true, unique: true },
  carrier: { type: String, required: true },
  carrierName: String,
  number: { type: String, required: true },
  callsign: String,
  icao24: String,
  serviceDate: { type: String, required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  scheduledDep: { type: Date, required: true },
  scheduledArr: { type: Date, required: true },
  estimatedDep: { type: Date, default: null },
  estimatedArr: { type: Date, default: null },
  actualDep: { type: Date, default: null },
  actualArr: { type: Date, default: null },
  status: { type: String, enum: FLIGHT_STATUSES, default: 'scheduled' },
  depTerminal: { type: String, default: null },
  depGate: { type: String, default: null },
  arrTerminal: { type: String, default: null },
  arrBelt: { type: String, default: null },
  aircraftType: { type: String, default: null },
  source: { type: String, required: true },
  fetchedAt: { type: Date, required: true },
  providerTimestamp: { type: Date, default: null },
  // simulator-only knobs, stripped before responses
  sim: { delayMin: Number, fate: String, gate: String, belt: String },
})
flightLegSchema.index({ carrier: 1, number: 1, serviceDate: 1, origin: 1 }, { unique: true })
flightLegSchema.index({ origin: 1, scheduledDep: 1 })
flightLegSchema.index({ destination: 1, scheduledArr: 1 })
export const FlightLeg = model('FlightLeg', flightLegSchema)
export type FlightLegDoc = InferSchemaType<typeof flightLegSchema>

// append-only status history
const statusSnapshotSchema = new Schema({
  flightKey: { type: String, required: true },
  capturedAt: { type: Date, required: true },
  status: String,
  estimatedDep: Date,
  estimatedArr: Date,
  depGate: String,
  source: String,
})
statusSnapshotSchema.index({ flightKey: 1, capturedAt: -1 })
export const StatusSnapshot = model('StatusSnapshot', statusSnapshotSchema)

const aircraftStateSchema = new Schema(
  {
    observedAt: { type: Date, required: true },
    meta: { icao24: String, callsign: String, source: String },
    lat: Number,
    lon: Number,
    baroAltitude: Number,
    velocity: Number,
    heading: Number,
    onGround: Boolean,
  },
  {
    timeseries: { timeField: 'observedAt', metaField: 'meta', granularity: 'seconds' },
    expireAfterSeconds: 6 * 3600, // trail retention; adjust to provider terms
  },
)
aircraftStateSchema.index({ 'meta.icao24': 1, observedAt: -1 })
export const AircraftState = model('AircraftState', aircraftStateSchema)

const offerSchema = new Schema({
  searchId: { type: String, required: true },
  providerRef: { type: String, required: true },
  supplier: String,
  carrier: String,
  carrierName: String,
  segments: [{
    _id: false, carrier: String, number: String, origin: String, destination: String, dep: Date, arr: Date, depTz: String, arrTz: String, cabin: String,
  }],
  stops: Number,
  durationMin: Number,
  totalPrice: Number,
  currency: String,
  origPrice: Number,
  origCurrency: String,
  fxRate: Number,
  fxAt: Date,
  baggage: { cabinKg: { type: Number, default: null }, checkedKg: { type: Number, default: null } },
  refundable: { type: Boolean, default: null },
  changeable: { type: Boolean, default: null },
  source: String,
  fetchedAt: Date,
  expiresAt: { type: Date, required: true },
})
offerSchema.index({ searchId: 1, providerRef: 1 }, { unique: true })
offerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 })
export const FareOffer = model('FareOffer', offerSchema)
export type FareOfferDoc = InferSchemaType<typeof offerSchema>

export const FarePriceCheck = model('FarePriceCheck', new Schema({
  offerId: String, oldPrice: Number, newPrice: Number, currency: String, checkedAt: Date, source: String,
}))

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: String,
  passwordHash: { type: String, required: true },
  roles: { type: [String], default: ['user'] },
  airportScope: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
})
export const User = model('User', userSchema)

const providerRunSchema = new Schema({ provider: String, at: Date, success: Boolean, latencyMs: Number, errorCode: String })
providerRunSchema.index({ provider: 1, at: -1 })
providerRunSchema.index({ at: 1 }, { expireAfterSeconds: 7 * 86400 })
export const ProviderRun = model('ProviderRun', providerRunSchema)

const auditSchema = new Schema({
  actor: String, action: String, reason: String, before: Schema.Types.Mixed, after: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
})
auditSchema.index({ actor: 1, createdAt: -1 })
export const AuditEvent = model('AuditEvent', auditSchema)
