// Frontend copy of the API contract. The backend is the source of truth; keep these in step with backend/src/modules.

export type Freshness = 'LIVE' | 'RECENT' | 'STALE' | 'DEMO' | 'UNAVAILABLE'

export type Meta = {
  source: string
  fetchedAt: string | null
  providerTimestamp: string | null
  freshness: Freshness
  ageSec: number | null
}

export type FlightStatus =
  | 'scheduled' | 'boarding' | 'departed' | 'en_route' | 'landed' | 'arrived' | 'delayed' | 'cancelled' | 'diverted' | 'unknown'

export type AirportBrief = { iata: string; city: string | null; timezone: string | null }

export type Airport = {
  iata: string
  icao: string | null
  name: string
  city: string
  country: string
  timezone: string
  terminals: string[]
  lat: number | null
  lon: number | null
}

export type Flight = {
  flightKey: string
  carrier: string
  carrierName: string | null
  number: string
  callsign: string | null
  serviceDate: string
  origin: AirportBrief
  destination: AirportBrief
  scheduledDep: string
  scheduledArr: string
  estimatedDep: string | null
  estimatedArr: string | null
  actualDep: string | null
  actualArr: string | null
  status: FlightStatus
  depTerminal: string | null
  depGate: string | null
  arrTerminal: string | null
  arrBelt: string | null
  aircraftType: string | null
  meta: Meta
}

export type Board = { airport: AirportBrief; type: 'departure' | 'arrival'; generatedAt: string; items: Flight[] }

export type Weather = {
  temperatureC: number | null
  windKmh: number | null
  windDir: number | null
  visibilityM: number | null
  code: number | null
  meta: Meta
  unavailableReason?: string
}

export type AirportDetail = { airport: Airport; weather: Weather }

export type FlightDetail = {
  flight: Flight
  icao24: string | null
  history: { at: string; status: FlightStatus; estimatedDep: string | null; estimatedArr: string | null; depGate: string | null; source: string }[]
}

export type Aircraft = {
  icao24: string
  callsign: string | null
  lat: number
  lon: number
  baroAltitude: number | null
  velocity: number | null
  heading: number | null
  onGround: boolean
  match: {
    flightKey: string
    confidence: number
    evidence: { rule: string; weight: number; detail: string }[]
    route: { origin: string; destination: string } | null
  } | null
  meta: Meta
}

export type Offer = {
  id: string
  providerRef: string
  supplier: string
  carrier: string
  carrierName: string
  segments: { carrier: string; number: string; origin: string; destination: string; dep: string; arr: string; cabin: string }[]
  stops: number
  durationMin: number
  totalPrice: number
  currency: string
  origPrice: number
  origCurrency: string
  fx: { rate: number; at: string; source: string } | null
  baggage: { cabinKg: number | null; checkedKg: number | null }
  refundable: boolean | null
  changeable: boolean | null
  expiresAt: string
  score: number | null
  meta: Meta
}

export type FareSearch = {
  origin: string
  destination: string
  date: string
  adults: number
  cabin: 'ECONOMY' | 'BUSINESS'
  currency: 'INR' | 'USD' | 'EUR' | 'AED'
  nonStopOnly: boolean
  sort: 'best' | 'price' | 'duration' | 'stops'
}

export type FareResults = { searchId: string; count: number; disclosure: string; items: Offer[] }

export type PriceCheck = { offerId: string; oldPrice: number; newPrice: number; currency: string; changed: boolean; checkedAt: string; meta: Meta }

export type ProviderHealth = {
  mode: 'demo' | 'live'
  items: { id: string; label: string; state: 'ok' | 'degraded' | 'down' | 'demo' | 'idle'; lastSuccess: string | null; lastLatencyMs: number | null; lastError: string | null }[]
}

export type Me = { id: string; email: string; roles: string[]; airportScope: string[] }

export type RtEnvelope<T> = { eventId: string; eventTime: string; source: string; schemaVersion: number; correlationId: string; data: T }
