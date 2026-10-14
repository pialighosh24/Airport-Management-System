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
import { AircraftTelemetry, AirportScheduleItem, FlightFare, AirportDetail } from '@/types';

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
  async getFares(filters?: { origin?: string; destination?: string; sortBy?: string }): Promise<ApiResponse<FlightFare[]>> {
    const params = new URLSearchParams();
    if (filters?.origin) params.append('origin', filters.origin);
    if (filters?.destination) params.append('destination', filters.destination);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchWithTimeout<ApiResponse<FlightFare[]>>(`/api/fares${queryString}`);
  },
};

