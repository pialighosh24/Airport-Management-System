// AeroNexus Admin Panel — API types aligned with the Express backend responses.

export interface ApiResponse<T> {
  success: boolean;
  isDemo?: boolean;
  source?: string;
  count?: number;
  data: T;
  error?: string;
  message?: string;
  disclaimer?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: 'passenger' | 'staff' | 'admin';
  staffPin?: string | null;
  createdAt?: string;
}

export interface AirportRef {
  iata?: string;
  icao?: string | null;
  name?: string;
  city?: string;
  country?: string;
  terminal?: string | null;
  gate?: string | null;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  timezone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  kind?: string;
}

export interface Flight {
  callsign?: string;
  flightNumber?: string;
  airline?: { name?: string; iata?: string; icao?: string };
  aircraftModel?: string | null;
  registration?: string | null;
  origin?: AirportRef;
  destination?: AirportRef;
  latitude?: number | null;
  longitude?: number | null;
  altitudeFeet?: number | null;
  groundSpeedKnots?: number | null;
  headingDegrees?: number | null;
  verticalRateFpm?: number | null;
  squawkCode?: string | null;
  status: string;
  freshness?: {
    status: string;
    observationTimeUtc: string;
    retrievalTimeUtc: string;
    ageSeconds: number;
    providerName?: string;
    notes?: string | null;
  };
  isDemo?: boolean;
  dataSource?: string;
  disclaimer?: string | null;
}

export interface Disruption {
  id: string;
  caseNumber: string;
  flightNumber: string;
  route: string;
  incidentType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactedPassengers: number;
  status: string;
  reportedBy: string;
  summary: string;
  actionPlan?: string;
  rebookingStatus?: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface Notice {
  id: string;
  noticeNumber: string;
  title: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'published' | 'deactivated';
  summary: string;
  body: string;
  effectiveFromUtc?: string | null;
  effectiveToUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  publishedBy: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string | null;
  target: string | null;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  metadata: Record<string, unknown>;
  createdAtUtc: string;
}

export interface ExternalApiStatus {
  source: string;
  providerName: string;
  status: string;
  authConfigured: boolean;
  baseUrl?: string | null;
}

export interface HealthResponse {
  success: boolean;
  service: string;
  status: string;
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  database?: {
    configured: boolean;
    connected: boolean;
    state: string;
    mode: string;
    message: string;
  };
  externalApis?: Record<string, ExternalApiStatus>;
  liveness?: {
    status: string;
    checkedAt?: string;
  };
  readiness?: {
    status: string;
    checkedAt?: string;
    database?: HealthResponse['database'];
  };
}

export interface AdminStats {
  success: boolean;
  data: {
    generatedAt: string;
    flights: {
      total: number;
      active: number;
      delayed: number;
      cancelled: number;
      enRoute: number;
    };
    openDisruptions: number;
    disruptions: Disruption[];
    registeredUsers: number;
    airports: { tracked: number };
    recentActivities: {
      id: string;
      caseNumber: string;
      flightNumber: string;
      category: string;
      title: string;
      severity: string;
      status: string;
      summary: string;
      createdAtUtc: string;
      updatedAtUtc: string;
    }[];
  };
}

export interface AdminMonitoring {
  success: boolean;
  data: AdminHealthData;
}

export interface AdminHealthData extends HealthResponse {
  database?: HealthResponse['database'];
  summary?: {
    flights: { total: number; active: number };
    openDisruptions: number;
    registeredUsers: number;
  };
}
