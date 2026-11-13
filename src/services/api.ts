/**
 * AeroNexus â€” Mobile API Service
 * 
 * Reusable HTTP client for communicating with the Express backend.
 * 
 * Host Resolution Strategy:
 * - Web Browser: 'http://localhost:5000'
 * - Physical Phone via Expo Go: Automatically detects laptop LAN IP via Constants.expoConfig.hostUri (e.g., 'http://192.168.x.x:5000')
 * - Android Studio Emulator: 'http://10.0.2.2:5000' (maps to host localhost)
 * - User Override: Can be manually customized at runtime
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  AircraftTelemetry,
  AirportScheduleItem,
  FlightFare,
  AirportDetail,
  AirportWeather,
  AdminSession,
  AdminDashboardData,
  ProviderIntegrationStatus,
  FlightNotice,
  GroundOperationTask,
} from '@/types';


// Detect the best default backend URL based on platform and environment
export function getDefaultBaseUrl(): string {
  // 1. Web browser running on development machine
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // 2. Physical Android device running Expo Go on the local WiFi network:
  // Expo provides the development computer's LAN IP in hostUri (e.g., "192.168.1.50:8082")
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000`;
    }
  }

  // 3. Android Studio Virtual Device (Emulator loopback address)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // 4. Default fallback
  return 'http://localhost:5000';
}

// Current active base URL (mutable so user can configure in settings/debug if needed)
let activeBaseUrl = getDefaultBaseUrl();

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

export function setApiBaseUrl(newUrl: string): void {
  activeBaseUrl = newUrl.replace(/\/+$/, ''); // Remove trailing slashes
}

// Response envelope types matching the Express backend
export interface ApiResponse<T> {
  success: boolean;
  isDemo?: boolean;
  isLive?: boolean;
  source?: string;
  airspace?: string;
  disclaimer?: string;
  count?: number;
  totalInAirspace?: number;
  data: T;
  error?: string;
  message?: string;
  warning?: string;
  fromCache?: boolean;
}

export interface AirportScheduleResponse {
  success: boolean;
  isDemo: boolean;
  disclaimer: string;
  airport: {
    iata: string;
    icao: string;
    name: string;
    city: string;
    country: string;
    metar: {
      temperatureC: number;
      condition: string;
      windSpeedKnots: number;
      visibilityKm: number;
      delayIndex: string;
      delayDescription: string;
    };
  };
  filterType: string;
  summary: {
    departuresCount: number;
    arrivalsCount: number;
    totalFlights: number;
  };
  departures: AirportScheduleItem[];
  arrivals: AirportScheduleItem[];
}

export interface HealthCheckResponse {
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
}

// Core HTTP fetch helper with timeout and friendly error formatting
async function fetchWithTimeout<T>(path: string, options: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${activeBaseUrl}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.message || data?.error || `Server responded with HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error(
          `Connection timed out (${timeoutMs / 1000}s). Is the backend running at ${activeBaseUrl}?`
        );
      }
      // Provide actionable network advice for common mobile errors
      if (err.message.includes('Network request failed')) {
        throw new Error(
          `Cannot connect to ${activeBaseUrl}. Ensure the Express backend is running and that your phone is on the same WiFi network.`
        );
      }
      throw err;
    }

    throw new Error('An unknown network error occurred.');
  }
}

/**
 * Reusable API Service Methods
 */
export const apiService = {
  /**
   * Health Check: GET /api/health
   */
  async getHealth(): Promise<HealthCheckResponse> {
    return fetchWithTimeout<HealthCheckResponse>('/api/health');
  },

  /**
   * Flights List: GET /api/flights
   * @param filters optional status, origin, destination
   */
  async getFlights(filters?: { status?: string; origin?: string; destination?: string }): Promise<ApiResponse<AircraftTelemetry[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.origin) params.append('origin', filters.origin);
    if (filters?.destination) params.append('destination', filters.destination);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<AircraftTelemetry[]>>(`/api/flights${queryString}`);
  },

  /**
   * Live Flights from OpenSky Network: GET /api/flights/live
   * @param options optional preset ('europe' | 'us_east') and limit
   */
  async getLiveFlights(options?: { preset?: string; limit?: number }): Promise<ApiResponse<AircraftTelemetry[]>> {
    const params = new URLSearchParams();
    if (options?.preset) params.append('preset', options.preset);
    if (options?.limit) params.append('limit', options.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<AircraftTelemetry[]>>(`/api/flights/live${queryString}`);
  },

  /**
   * Single Flight: GET /api/flights/:identifier
   */
  async getFlightByIdentifier(identifier: string): Promise<ApiResponse<AircraftTelemetry>> {
    return fetchWithTimeout<ApiResponse<AircraftTelemetry>>(`/api/flights/${encodeURIComponent(identifier)}`);
  },

  /**
   * Airport Schedule: GET /api/airports/:code/schedule
   */
  async getAirportSchedule(code: string, type?: 'all' | 'departure' | 'arrival'): Promise<AirportScheduleResponse> {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<AirportScheduleResponse>(`/api/airports/${encodeURIComponent(code)}/schedule${queryString}`);
  },

  /**
   * Search Airports via FreeAirportDB: GET /api/airports?search=...
   * @param query Airport code (IATA/ICAO) or name
   * @param limit Optional maximum results (default 20)
   */
  async searchAirports(query: string, limit?: number): Promise<ApiResponse<AirportDetail[]>> {
    const params = new URLSearchParams();
    params.append('search', query);
    if (limit) params.append('limit', limit.toString());

    return fetchWithTimeout<ApiResponse<AirportDetail[]>>(`/api/airports?${params.toString()}`);
  },

  /**
   * Fares Comparison: GET /api/fares
   */
  async getFares(filters?: {
    origin?: string;
    destination?: string;
    currency?: 'INR' | 'USD';
    sortBy?: string;
  }): Promise<ApiResponse<FlightFare[]>> {
    const params = new URLSearchParams();
    if (filters?.origin) params.append('origin', filters.origin);
    if (filters?.destination) params.append('destination', filters.destination);
    if (filters?.currency) params.append('currency', filters.currency);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<FlightFare[]>>(`/api/fares${queryString}`);
  },

  /**
   * Price-Check Revalidation: POST /api/fares/:offerId/price-check (Blueprint Section 11)
   */
  async priceCheck(offerId: string): Promise<{
    success: boolean;
    revalidated: boolean;
    offerId: string;
    guaranteedPriceInr: number;
    guaranteedPriceUsd: number;
    seatsAvailable: number;
    supplierName: string;
    priceLockMinutes: number;
    supplierNotice: string;
    verifiedAtUtc: string;
  }> {
    return fetchWithTimeout(`/api/fares/${encodeURIComponent(offerId)}/price-check`, {
      method: 'POST',
    });
  },

  /**
   * Curated Airport Hubs: GET /api/airports/hubs
   */
  async getAirportHubs(): Promise<ApiResponse<AirportDetail[]>> {
    return fetchWithTimeout<ApiResponse<AirportDetail[]>>('/api/airports/hubs');
  },

  /**
   * Single Airport Details: GET /api/airports/:code
   */
  async getAirportByCode(code: string): Promise<ApiResponse<AirportDetail>> {
    return fetchWithTimeout<ApiResponse<AirportDetail>>(`/api/airports/${encodeURIComponent(code)}`);
  },

  /**
   * Live Meteorological Data from Open-Meteo: GET /api/weather
   * @param options lat/lon or airport code
   */
  async getAirportWeather(options: { lat?: number; lon?: number; airport?: string }): Promise<AirportWeather> {
    const params = new URLSearchParams();
    if (options.airport) params.append('airport', options.airport);
    if (options.lat != null) params.append('lat', options.lat.toString());
    if (options.lon != null) params.append('lon', options.lon.toString());

    return fetchWithTimeout<AirportWeather>(`/api/weather?${params.toString()}`);
  },

  /**
   * Master Airports Registry: GET /api/airports/master
   */
  async getMasterAirports(country?: string): Promise<ApiResponse<AirportDetail[]>> {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<AirportDetail[]>>(`/api/airports/master${qs}`);
  },

  /**
   * Currency Exchange Rates: GET /api/fares/exchange-rates
   */
  async getExchangeRates(): Promise<{
    success: boolean;
    isLive: boolean;
    base: string;
    rates: Record<string, number>;
    source: string;
    rateTimestampUtc: string;
  }> {
    return fetchWithTimeout('/api/fares/exchange-rates');
  },

  /**
   * Ground Operations Cases: GET /api/ops/cases
   */
  async getOpsCases(): Promise<ApiResponse<any[]>> {
    return fetchWithTimeout<ApiResponse<any[]>>('/api/ops/cases');
  },

  /**
   * Turnaround Milestones: GET /api/ops/milestones
   */
  async getTurnaroundMilestones(): Promise<ApiResponse<any[]>> {
    return fetchWithTimeout<ApiResponse<any[]>>('/api/ops/milestones');
  },

  /**
   * Notification Delay & Gate Alerts: GET /api/alerts
   */
  async getAlerts(): Promise<ApiResponse<any[]>> {
    return fetchWithTimeout<ApiResponse<any[]>>('/api/alerts');
  },

  /**
   * Register Alert Subscription: POST /api/alerts
   */
  async createAlertSubscription(subscription: {
    flightNumber: string;
    type?: string;
    email?: string;
    thresholdMinutes?: number;
    quietHours?: { enabled: boolean; startUtc: string; endUtc: string };
  }): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  },

  // ----------------------------------------------------
  // Admin Panel API Methods
  // ----------------------------------------------------

  /**
   * Public Notices: GET /api/notices
   */
  async getPublicNotices(): Promise<ApiResponse<FlightNotice[]>> {
    return fetchWithTimeout<ApiResponse<FlightNotice[]>>('/api/notices');
  },

  /**
   * Admin Login: POST /api/admin/login
   */
  async adminLogin(credentials: { username: string; password: string }): Promise<AdminSession & { success: boolean; message: string }> {
    return fetchWithTimeout<AdminSession & { success: boolean; message: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * Verify Admin Session: GET /api/admin/me
   */
  async adminGetMe(token: string): Promise<{ success: boolean; admin: { username: string; role: string; expiresAt: string } }> {
    return fetchWithTimeout<{ success: boolean; admin: { username: string; role: string; expiresAt: string } }>('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Admin Dashboard Metrics: GET /api/admin/dashboard
   */
  async adminGetDashboard(token: string): Promise<AdminDashboardData> {
    return fetchWithTimeout<AdminDashboardData>('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Provider Integration Statuses: GET /api/admin/integrations
   */
  async adminGetIntegrations(token: string, force = false): Promise<{ success: boolean; results: ProviderIntegrationStatus[]; fromCache: boolean }> {
    return fetchWithTimeout<{ success: boolean; results: ProviderIntegrationStatus[]; fromCache: boolean }>(`/api/admin/integrations${force ? '?force=true' : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Run Provider Integration Probes: POST /api/admin/integrations/check
   */
  async adminCheckIntegrations(token: string): Promise<{ success: boolean; results: ProviderIntegrationStatus[]; fromCache: boolean }> {
    return fetchWithTimeout<{ success: boolean; results: ProviderIntegrationStatus[]; fromCache: boolean }>('/api/admin/integrations/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Admin Notices List: GET /api/admin/notices
   */
  async adminGetNotices(token: string): Promise<ApiResponse<FlightNotice[]>> {
    return fetchWithTimeout<ApiResponse<FlightNotice[]>>('/api/admin/notices', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Create Notice: POST /api/admin/notices
   */
  async adminCreateNotice(token: string, notice: Partial<FlightNotice>): Promise<ApiResponse<FlightNotice>> {
    return fetchWithTimeout<ApiResponse<FlightNotice>>('/api/admin/notices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(notice),
    });
  },

  /**
   * Update Notice: PUT /api/admin/notices/:id
   */
  async adminUpdateNotice(token: string, id: string, updates: Partial<FlightNotice>): Promise<ApiResponse<FlightNotice>> {
    return fetchWithTimeout<ApiResponse<FlightNotice>>(`/api/admin/notices/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete Notice: DELETE /api/admin/notices/:id
   */
  async adminDeleteNotice(token: string, id: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>(`/api/admin/notices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Admin Audit Trail: GET /api/admin/audit
   */
  async adminGetAuditTrail(token: string, limit = 50, category?: string): Promise<{ success: boolean; count: number; data: any[] }> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (category) q.append('category', category);
    return fetchWithTimeout<{ success: boolean; count: number; data: any[] }>('/api/admin/audit?' + q.toString(), {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Admin System Logs: GET /api/admin/logs
   */
  async adminGetSystemLogs(token: string, limit = 100, level?: string): Promise<{ success: boolean; count: number; data: any[] }> {
    const q = new URLSearchParams({ limit: String(limit) });
    if (level) q.append('level', level);
    return fetchWithTimeout<{ success: boolean; count: number; data: any[] }>('/api/admin/logs?' + q.toString(), {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Admin Config: GET /api/admin/config
   */
  async adminGetConfig(token: string): Promise<{ success: boolean; data: any }> {
    return fetchWithTimeout<{ success: boolean; data: any }>('/api/admin/config', {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Update Config: PUT /api/admin/config
   */
  async adminUpdateConfig(token: string, updates: any): Promise<{ success: boolean; message: string; data: any }> {
    return fetchWithTimeout<{ success: boolean; message: string; data: any }>('/api/admin/config', {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify(updates),
    });
  },

  /**
   * Database Diagnostics: GET /api/admin/database
   */
  async adminGetDatabase(token: string): Promise<{ success: boolean; diagnostics: any }> {
    return fetchWithTimeout<{ success: boolean; diagnostics: any }>('/api/admin/database', {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Airlines: GET /api/admin/airlines
   */
  async adminGetAirlines(token: string): Promise<{ success: boolean; count: number; data: any[] }> {
    return fetchWithTimeout<{ success: boolean; count: number; data: any[] }>('/api/admin/airlines', {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Users: GET /api/admin/users
   */
  async adminGetUsers(token: string): Promise<{
    success: boolean;
    users: any[];
    endUsers: {
      available: boolean;
      source: string;
      total: number | null;
      roleBreakdown: Record<string, number> | null;
      records: {
        id: number;
        username: string;
        email: string;
        fullName: string;
        role: string;
        createdAt: string | null;
      }[];
      reason: string | null;
    };
  }> {
    return fetchWithTimeout('/api/admin/users', {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Ground Operations tasks: GET /api/admin/ground-operations
   */
  async adminGetGroundOperations(token: string, status?: string): Promise<{
    success: boolean;
    count: number;
    demoCount: number;
    storage: string;
    allowedStatuses: string[];
    data: GroundOperationTask[];
  }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchWithTimeout('/api/admin/ground-operations' + q, {
      headers: { Authorization: 'Bearer ' + token },
    });
  },

  /**
   * Update Ground Operations task: PATCH /api/admin/ground-operations/:id
   */
  async adminUpdateGroundOperation(
    token: string,
    id: string,
    updates: { status?: string; notes?: string; assignedTo?: string; priority?: string }
  ): Promise<{ success: boolean; data: GroundOperationTask; message?: string }> {
    return fetchWithTimeout('/api/admin/ground-operations/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
      body: JSON.stringify(updates),
    });
  },
};