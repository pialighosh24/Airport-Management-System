/**
 * AeroNexus — Mobile API Service
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
import { AircraftTelemetry, AirportScheduleItem, FlightFare, AirportDetail, WeatherSummaryResponse, CurrencyResponse, FlightStatusResponse, GroundOperationTask } from '@/types';

// Detect the best default backend URL based on platform and environment
export function getDefaultBaseUrl(): string {
  // 0. Explicit development override via Expo public env variable
  //    (e.g. EXPO_PUBLIC_BACKEND_URL=http://10.86.83.4:5000 — inlined at build/start).
  const envBackendUrl = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL;
  if (envBackendUrl && envBackendUrl.trim().length > 0) {
    return envBackendUrl.trim().replace(/\/+$/, '');
  }

  // 1. Web browser running on development machine
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // 2. Physical Android device / development client: Expo hostUri
  //    (scheme may be exp:// or http://; strip scheme before extracting host)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '').split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:5000`;
    }
  }

  // 3. Android Studio Virtual Device (Emulator loopback address)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  // 4. Default fallback
  return 'http://localhost:5000';
}

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

export function setApiBaseUrl(newUrl: string): void {
  activeBaseUrl = newUrl.replace(/\/+$/, ''); // Remove trailing slashes
}

// Current active base URL (mutable so user can configure in settings/debug if needed)
let activeBaseUrl = getDefaultBaseUrl();

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

export interface ExternalApiStatus {
  source: string;
  providerName: string;
  status: string;
  authConfigured: boolean;
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
  externalApis?: {
    openSky?: ExternalApiStatus;
    openMeteo?: ExternalApiStatus;
    openErApi?: ExternalApiStatus;
  };
}

// Weather & currency responses reuse canonical response shapes from @/types
// (WeatherSummaryResponse, CurrencyResponse, WeatherCurrentConditions, WeatherForecast, CurrencyRates)

// Core HTTP fetch helper with timeout, friendly error formatting and
// controlled retry with exponential backoff for transient network failures.
const FETCH_MAX_RETRIES = 2;
const FETCH_RETRY_BASE_DELAY_MS = 400;

async function fetchWithTimeout<T>(path: string, options: RequestInit = {}, timeoutMs = 8000): Promise<T> {
  const url = `${activeBaseUrl}${path}`;

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

      const isNetworkError = err instanceof Error && err.message.includes('Network request failed');
      const canRetry = attempt < FETCH_MAX_RETRIES && isNetworkError;

      if (canRetry) {
        // Controlled exponential backoff before retrying transient network failures.
        await new Promise((resolve) => setTimeout(resolve, FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }

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
}

// Response caches with TTL (weather + currency refresh slowly; keep client lean)
const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
const CURRENCY_CACHE_TTL_MS = 5 * 60 * 1000;

const weatherResponseCache = new Map<string, { payload: WeatherSummaryResponse; cachedAt: number }>();
const currencyResponseCache = new Map<string, { payload: CurrencyResponse; cachedAt: number }>();

function buildWeatherCacheKey(latitude: number, longitude: number, forecastDays: number, refresh: boolean | undefined): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}::${forecastDays}::${refresh ? 'refresh' : 'default'}`;
}

function buildCurrencyCacheKey(base: string | undefined, symbols: string[] | undefined): string {
  return `${base ?? 'USD'}::${(symbols ?? ['USD', 'INR']).join(',')}`;
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
   * Current Weather + Forecast (Open-Meteo): GET /api/weather?latitude=&longitude=&forecastDays=&refresh=
   */
  async getWeather(params: { latitude: number; longitude: number; forecastDays?: number; refresh?: boolean }): Promise<WeatherSummaryResponse> {
    const forecastDays = params.forecastDays && params.forecastDays >= 1 && params.forecastDays <= 7 ? Math.floor(params.forecastDays) : 2;
    const cacheKey = buildWeatherCacheKey(params.latitude, params.longitude, forecastDays, params.refresh);
    const now = Date.now();

    const cached = weatherResponseCache.get(cacheKey);
    if (!params.refresh && cached && now - cached.cachedAt < WEATHER_CACHE_TTL_MS) {
      return { ...cached.payload, fromCache: true, cacheAgeSeconds: Math.max(0, Math.round((now - cached.cachedAt) / 1000)) };
    }

    const paramsString = new URLSearchParams();
    paramsString.append('latitude', String(params.latitude));
    paramsString.append('longitude', String(params.longitude));
    paramsString.append('forecastDays', String(forecastDays));
    if (params.refresh) paramsString.append('refresh', 'true');

    const response = await fetchWithTimeout<WeatherSummaryResponse>(`/api/weather?${paramsString.toString()}`);
    weatherResponseCache.set(cacheKey, { payload: response, cachedAt: Date.now() });
    return response;
  },

  /**
   * Currency Exchange Rates (Open Exchange Rate API): GET /api/currency?base=&symbols=
   */
  async getCurrency(params?: { base?: string; symbols?: string[] }): Promise<CurrencyResponse> {
    const base = params?.base || 'USD';
    const symbols = params?.symbols?.length ? params.symbols : ['USD', 'INR'];
    const cacheKey = buildCurrencyCacheKey(base, symbols);
    const now = Date.now();

    const cached = currencyResponseCache.get(cacheKey);
    if (cached && now - cached.cachedAt < CURRENCY_CACHE_TTL_MS) {
      return { ...cached.payload, fromCache: true };
    }

    const paramsString = new URLSearchParams();
    paramsString.append('base', base);
    symbols.forEach((s) => paramsString.append('symbols', s));

    const response = await fetchWithTimeout<CurrencyResponse>(`/api/currency?${paramsString.toString()}`);
    currencyResponseCache.set(cacheKey, { payload: response, cachedAt: Date.now() });
    return response;
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
  async getFares(filters?: { origin?: string; destination?: string; sortBy?: string }): Promise<ApiResponse<FlightFare[]>> {
    const params = new URLSearchParams();
    if (filters?.origin) params.append('origin', filters.origin);
    if (filters?.destination) params.append('destination', filters.destination);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<FlightFare[]>>(`/api/fares${queryString}`);
  },

  /**
   * Flight Offers Search via Amadeus: GET /api/flights/search
   * @param params origin, destination, departureDate, returnDate, adults, cabinClass
   */
  async getFlightOffers(params?: { origin?: string; destination?: string; departureDate?: string; returnDate?: string; adults?: number; cabinClass?: string }): Promise<any> {
    const paramsString = new URLSearchParams();
    if (params?.origin) paramsString.append('origin', params.origin);
    if (params?.destination) paramsString.append('destination', params.destination);
    if (params?.departureDate) paramsString.append('departureDate', params.departureDate);
    if (params?.returnDate) paramsString.append('returnDate', params.returnDate);
    if (params?.adults) paramsString.append('adults', String(params.adults));
    if (params?.cabinClass) paramsString.append('cabinClass', params.cabinClass);

    const queryString = paramsString.toString();
    return fetchWithTimeout<any>(`/api/flights/search${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Flight Status via FlightAware AeroAPI: GET /api/flights/status/:identifier
   */
  async getFlightStatus(identifier: string): Promise<FlightStatusResponse> {
    return fetchWithTimeout<FlightStatusResponse>(`/api/flights/status/${encodeURIComponent(identifier)}`);
  },

  /**
   * Ground Operations Tasks: GET /api/ground-operations
   */
  async getGroundOperations(filters?: { status?: string; type?: string; flightNumber?: string }): Promise<ApiResponse<GroundOperationTask[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.flightNumber) params.append('flightNumber', filters.flightNumber);

    const queryString = params.toString();
    return fetchWithTimeout<ApiResponse<GroundOperationTask[]>>(`/api/ground-operations${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Staff PIN Login: POST /api/auth/staff-login
   */
  async staffLogin(pin: string): Promise<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>> {
    return fetchWithTimeout<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>>('/api/auth/staff-login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  /**
   * User Login: POST /api/auth/login
   */
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>> {
    return fetchWithTimeout<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * User Registration: POST /api/auth/register
   */
  async register(data: { name: string; email: string; password: string; role?: string }): Promise<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>> {
    return fetchWithTimeout<ApiResponse<{ token: string; user: { id: string; name: string; role: string; email: string } }>>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Fetch Disruption Cases: GET /api/disruptions
   */
  async getDisruptions(filters?: { status?: string; severity?: string }): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<any[]>>(`/api/disruptions${qs}`);
  },

  /**
   * Create Disruption Case: POST /api/disruptions
   */
  async createDisruption(disruptionData: any, token?: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>('/api/disruptions', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(disruptionData),
    });
  },

  /**
   * Update Disruption Status: PATCH /api/disruptions/:id
   */
  async updateDisruption(id: string, updates: any, token?: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>(`/api/disruptions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(updates),
    });
  },

  /**
   * Fetch Alerts & Notifications: GET /api/alerts
   */
  async getAlerts(token?: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>('/api/alerts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  /**
   * Save Flight to Watchlist: POST /api/alerts/watchlist
   */
  async addToWatchlist(flightNumber: string, token?: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>('/api/alerts/watchlist', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ flightNumber }),
    });
  },

  /**
   * Remove Flight from Watchlist: DELETE /api/alerts/watchlist/:flightNumber
   */
  async removeFromWatchlist(flightNumber: string, token?: string): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>(`/api/alerts/watchlist/${encodeURIComponent(flightNumber)}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },

  /**
   * Trigger Simulated Alert: POST /api/alerts/simulate
   */
  async triggerSimulatedAlert(payload: { flightNumber: string; type: string; title?: string; message?: string }): Promise<ApiResponse<any>> {
    return fetchWithTimeout<ApiResponse<any>>('/api/alerts/simulate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

