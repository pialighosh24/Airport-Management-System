/**
 * AeroNexus - Type Definitions
 * 
 * Core Principle: "Unknown stays unknown. Never invent flight information 
 * or display stale data as current. Distinguish valid, stale, missing, 
 * and unavailable data."
 */

export type FreshnessStatus = 'valid' | 'stale' | 'missing' | 'unavailable';

export interface DataFreshness {
  status: FreshnessStatus;
  observationTimeUtc: string;      // When the provider/radar actually observed the aircraft
  retrievalTimeUtc: string;        // When our server fetched the data
  ageSeconds: number;              // Elapsed time in seconds since observation
  providerName: string;            // Source provider (e.g., ADS-B Network, FlightRadar24, OpenSky)
  notes?: string;                  // Clarification for stale or missing information
}

export type FlightStatusCode = 
  | 'scheduled' 
  | 'boarding' 
  | 'departed' 
  | 'en_route' 
  | 'approaching' 
  | 'landed' 
  | 'delayed' 
  | 'diverted' 
  | 'cancelled' 
  | 'unknown';

export interface AirportLocation {
  iata: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  terminal?: string | null;
  gate?: string | null;
}

export interface AirportDetail {
  code: string | null;
  iata: string | null;
  icao: string | null;
  name: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  regionCode: string | null;
  continent: string | null;
  continentCode: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  elevationFt: number | null;
  timezone: string | null;
  type: string | null;
}


export interface TelemetryFlags {
  hasConflict: boolean;
  conflictType: string | null;
  description: string | null;
}

export interface AircraftTelemetry {
  callsign: string | null;
  flightNumber: string;
  airline: {
    name: string | null;
    iata: string | null;
    icao: string | null;
  };
  aircraftModel: string | null;     // null if unknown
  registration: string | null;      // Tail number, null if unknown
  countryOfRegistration?: string | null; // Country where aircraft transponder is registered
  origin: AirportLocation;
  destination: AirportLocation;
  // Radar/ADS-B metrics (can be null if missing/transponder unavailable)
  latitude: number | null;
  longitude: number | null;
  altitudeFeet: number | null;
  groundSpeedKnots: number | null;
  headingDegrees: number | null;
  verticalRateFpm: number | null;
  squawkCode: string | null;
  status: FlightStatusCode;
  freshness: DataFreshness;
  isDemo?: boolean;
  isLive?: boolean;
  onGround?: boolean;
  icao24?: string;
  dataSource?: string;
  telemetryFlags?: TelemetryFlags;
}

export interface AirportScheduleItem {
  id: string;
  flightNumber: string;
  airlineName: string;
  airlineCode: string;
  type: 'departure' | 'arrival';
  airportCode: string;             // Airport where schedule is listed
  otherAirport: AirportLocation;   // Origin (if arrival) or Destination (if departure)
  scheduledTimeUtc: string;
  estimatedTimeUtc: string | null;  // null if no estimate available
  actualTimeUtc: string | null;     // null if not yet departed/arrived
  delayMinutes: number;            // 0 if on time, >0 if delayed
  terminal: string | null;         // null if gate assignment not yet published
  gate: string | null;             // null if pending
  baggageCarousel: string | null;  // null if unavailable / not assigned
  status: FlightStatusCode;
  freshness: DataFreshness;
}

export interface BaggageRules {
  personalItemIncluded: boolean;
  personalItemRule: string;        // e.g. "Fits under the seat in front (40x30x15cm)"
  cabinBagIncluded: boolean;
  cabinBagWeightKg: number | null; // e.g. 7kg or 10kg
  checkedBagIncluded: boolean;
  checkedBagWeightKg: number | null; // e.g. 23kg
  extraCheckedBagFeeUsd: number | null; // fee if checked bag not included
}

export interface FlightFare {
  id: string;
  airlineName: string;
  airlineCode: string;
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  departureTimeUtc: string;
  arrivalTimeUtc: string;
  durationMinutes: number;
  stopsCount: number;              // 0 for non-stop
  travelClass: 'Economy' | 'Premium Economy' | 'Business';
  baseFareUsd: number;
  taxesAndAirportFeesUsd: number;
  totalFareUsd: number;
  baggage: BaggageRules;
  cancellationPolicy: string;
  availableSeats: number;
  isTransparentGuaranteed: boolean; // Guarantee of zero hidden fees at checkout
}

export interface DisruptionCase {
  id: string;
  caseNumber: string;
  flightNumber: string;
  route: string;
  incidentType: 'weather' | 'mechanical' | 'air_traffic_control' | 'crew_duty' | 'medical' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactedPassengers: number;
  status: 'open' | 'investigating' | 'resolved';
  createdAtUtc: string;
  updatedAtUtc: string;
  reportedBy: string;
  summary: string;
  actionPlan: string;
  rebookingStatus: 'in_progress' | 'completed' | 'not_required';
}

export interface AirportMetar {
  iata: string;
  name: string;
  city: string;
  temperatureC: number;
  condition: string;
  windSpeedKnots: number;
  visibilityKm: number;
  delayIndex: 'minimal' | 'moderate' | 'severe';
  delayDescription: string;
}

export interface AlertNotification {
  id: string;
  flightNumber: string;
  type: 'delay' | 'gate_change' | 'boarding' | 'disruption' | 'system';
  title: string;
  message: string;
  timestampUtc: string;
  read: boolean;
}

/* -------------------------------------------------------------------------- */
/* Weather (Open-Meteo via AeroNexus backend)                                 */
/* -------------------------------------------------------------------------- */

export interface WeatherCurrentConditions {
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  isDay: boolean;
  precipitationMm: number;
  weatherCode: number | null;
  condition: string;
  windSpeedKnots: number | null;
  windDirectionDegrees: number | null;
  windGustKnots: number | null;
  cloudCoverPercent: number | null;
  visibilityKm: number | null;
  observedAtUtc: string | null;
  source?: string;
}

export interface WeatherForecast {
  forecastDays: number;
  validFromUtc: string | null;
  validUntilUtc: string | null;
  maxTemperatureC: number | null;
  minTemperatureC: number | null;
  totalPrecipitationMm: number;
  maxWindSpeedKnots: number;
  thunderstormRisk: boolean;
  summary: string;
}

export interface WeatherDataFreshness {
  status: FreshnessStatus;
  retrievalTimeUtc: string;
  providerName: string;
  notes?: string;
}

export interface WeatherSummaryResponse {
  success: boolean;
  source: string;
  providerName: string;
  latitude: number;
  longitude: number;
  current: WeatherCurrentConditions | null;
  forecast: WeatherForecast | null;
  dataFreshness: WeatherDataFreshness;
  retrievedAtUtc: string;
  fromCache?: boolean;
  cacheAgeSeconds?: number;
  disclaimer: string;
}

/* -------------------------------------------------------------------------- */
/* Currency Exchange Rates (Open Exchange Rate API via AeroNexus backend)    */
/* -------------------------------------------------------------------------- */

export interface CurrencyRates {
  base: string;
  baseCurrency: string;
  rates: Record<string, number>;
  updatedAtUtc: string;
  retrievedAtUtc: string;
  disclaimer: string;
  fromProvider: string;
}

export interface CurrencyResponse {
  success: boolean;
  source: string;
  providerName: string;
  base: string;
  baseCurrency: string;
  rates: Record<string, number>;
  updatedAtUtc: string;
  retrievedAtUtc: string;
  disclaimer: string;
  fromProvider: string;
  fromCache?: boolean;
}
