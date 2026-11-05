import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AircraftTelemetry, 
  AirportScheduleItem, 
  DisruptionCase, 
  AlertNotification 
} from '@/types';
import { DEMO_AIRCRAFT } from '@/data/demo-flights';
import { DEMO_SCHEDULES } from '@/data/demo-airports';
import { DEMO_DISRUPTIONS } from '@/data/demo-disruptions';
import { apiService, getApiBaseUrl, setApiBaseUrl } from '@/services/api';

export type RadarDataMode = 'live' | 'demo';

export interface LiveAirspaceMetadata {
  source?: string;
  providerName?: string;
  airspace?: string;
  count?: number;
  totalInAirspace?: number;
  warning?: string;
  fromCache?: boolean;
}

interface FlightContextType {
  // Flight radar & telemetry
  aircraftList: AircraftTelemetry[];
  selectedAircraft: AircraftTelemetry | null;
  setSelectedAircraft: (aircraft: AircraftTelemetry | null) => void;
  isLoadingFlights: boolean;
  flightError: string | null;
  isBackendConnected: boolean;
  serverUrl: string;
  updateServerUrl: (url: string) => void;
  fetchFlights: (overrideMode?: RadarDataMode) => Promise<void>;

  // Live vs Demo Fleet controls
  radarMode: RadarDataMode;
  setRadarMode: (mode: RadarDataMode) => void;
  airspacePreset: 'europe' | 'us_east';
  setAirspacePreset: (preset: 'europe' | 'us_east') => void;
  liveMetadata: LiveAirspaceMetadata | null;

  // Saved flights watchlist
  savedFlightNumbers: string[];
  toggleSaveFlight: (flightNumber: string) => void;
  isFlightSaved: (flightNumber: string) => boolean;

  // Alert preferences & notifications
  userEmail: string;
  setUserEmail: (email: string) => void;
  alertsDelayThresholdMins: number;
  setAlertsDelayThresholdMins: (mins: number) => void;
  alertOnGateChange: boolean;
  setAlertOnGateChange: (enabled: boolean) => void;
  alertOnBoarding: boolean;
  setAlertOnBoarding: (enabled: boolean) => void;
  notifications: AlertNotification[];
  dismissNotification: (id: string) => void;
  simulateTriggerAlert: (flightNumber: string, type: 'delay' | 'gate_change' | 'boarding') => void;

  // Schedules
  schedules: AirportScheduleItem[];

  // Staff Portal
  isStaffAuthenticated: boolean;
  staffPin: string;
  loginStaff: (pin: string) => boolean;
  logoutStaff: () => void;
  disruptionCases: DisruptionCase[];
  addDisruptionCase: (newCase: Omit<DisruptionCase, 'id' | 'createdAtUtc' | 'updatedAtUtc'>) => void;
  updateDisruptionStatus: (id: string, status: 'open' | 'investigating' | 'resolved') => void;
}

const INITIAL_NOTIFICATIONS: AlertNotification[] = [
  {
    id: 'notif-1',
    flightNumber: 'EK202',
    type: 'delay',
    title: 'Flight EK202 Departure Delayed',
    message: 'Estimated departure moved from 19:30 to 20:10 UTC (+40 mins). Baggage loading turnaround in progress.',
    timestampUtc: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: 'notif-2',
    flightNumber: 'BA178',
    type: 'gate_change',
    title: 'Gate Assigned: Gate 1',
    message: 'Flight BA178 boarding gate confirmed at JFK Terminal 7, Gate 1.',
    timestampUtc: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    read: true,
  },
];

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  // Live vs Demo Fleet controls
  const [radarMode, setRadarMode] = useState<RadarDataMode>('live');
  const [airspacePreset, setAirspacePreset] = useState<'europe' | 'us_east'>('europe');
  const [liveMetadata, setLiveMetadata] = useState<LiveAirspaceMetadata | null>(null);

  const handleSetRadarMode = (mode: RadarDataMode) => {
    setSelectedAircraft(null);
    setAircraftList([]); // Clear previous fleet immediately to prevent mixing records
    setRadarMode(mode);
  };

  const handleSetAirspacePreset = (preset: 'europe' | 'us_east') => {
    setSelectedAircraft(null);
    setAircraftList([]); // Clear previous airspace targets immediately
    setAirspacePreset(preset);
  };

  // Aircraft telemetry list & backend synchronization state
  // In live mode, initialize with an empty array so demo flights are never rendered on the live radar
  const [aircraftList, setAircraftList] = useState<AircraftTelemetry[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftTelemetry | null>(null);
  const [isLoadingFlights, setIsLoadingFlights] = useState<boolean>(true);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [serverUrl, setServerUrl] = useState<string>(getApiBaseUrl());

  // Watchlist
  const [savedFlightNumbers, setSavedFlightNumbers] = useState<string[]>(['BA178', 'EK202']);

  // Alert preferences
  const [userEmail, setUserEmail] = useState<string>('traveller@aeronexus.aero');
  const [alertsDelayThresholdMins, setAlertsDelayThresholdMins] = useState<number>(15);
  const [alertOnGateChange, setAlertOnGateChange] = useState<boolean>(true);
  const [alertOnBoarding, setAlertOnBoarding] = useState<boolean>(true);

  // Notifications timeline
  const [notifications, setNotifications] = useState<AlertNotification[]>(INITIAL_NOTIFICATIONS);

  // Airport schedules
  const [schedules] = useState<AirportScheduleItem[]>(DEMO_SCHEDULES);

  // Staff Portal
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [disruptionCases, setDisruptionCases] = useState<DisruptionCase[]>(DEMO_DISRUPTIONS);

  // Function to fetch flights from Express backend (user-triggered refresh)
  const fetchFlights = async (overrideMode?: RadarDataMode) => {
    const targetMode = overrideMode || radarMode;
    setIsLoadingFlights(true);
    setFlightError(null);

    try {
      if (targetMode === 'live') {
        const response = await apiService.getLiveFlights({ preset: airspacePreset });
        if (response && response.success && Array.isArray(response.data)) {
          // Strictly guarantee only live ADS-B records are set (never demo flights)
          const liveOnly = response.data.filter((f) => f.isLive && !f.isDemo);
          setAircraftList(liveOnly);
          setIsBackendConnected(true);
          setLiveMetadata({
            source: response.source,
            providerName: 'OpenSky Network (Live ADS-B)',
            airspace: response.airspace,
            count: liveOnly.length,
            totalInAirspace: response.totalInAirspace,
            warning: response.warning,
            fromCache: response.fromCache,
          });
        } else {
          throw new Error('Unexpected response format from live OpenSky endpoint.');
        }
      } else {
        const response = await apiService.getFlights();
        if (response && response.success && Array.isArray(response.data)) {
          setAircraftList(response.data);
          setIsBackendConnected(true);
          setLiveMetadata(null);
        } else {
          throw new Error('Unexpected response format from backend server.');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect to backend server.';
      setFlightError(message);
      setIsBackendConnected(false);
      if (targetMode === 'live') {
        // Never retain or fallback to demo records in live mode
        setAircraftList([]);
      } else {
        // In demo mode only, fallback to local demo aircraft if backend is unreachable
        setAircraftList(DEMO_AIRCRAFT);
      }
    } finally {
      setIsLoadingFlights(false);
    }
  };

  // Synchronize flights on mount and when radarMode or airspacePreset changes
  useEffect(() => {
    let ignore = false;
    async function loadInitialOrChangedFlights() {
      try {
        if (radarMode === 'live') {
          const response = await apiService.getLiveFlights({ preset: airspacePreset });
          if (!ignore && response && response.success && Array.isArray(response.data)) {
            const liveOnly = response.data.filter((f) => f.isLive && !f.isDemo);
            setAircraftList(liveOnly);
            setIsBackendConnected(true);
            setFlightError(null);
            setLiveMetadata({
              source: response.source,
              providerName: 'OpenSky Network (Live ADS-B)',
              airspace: response.airspace,
              count: liveOnly.length,
              totalInAirspace: response.totalInAirspace,
              warning: response.warning,
              fromCache: response.fromCache,
            });
          }
        } else {
          const response = await apiService.getFlights();
          if (!ignore && response && response.success && Array.isArray(response.data)) {
            setAircraftList(response.data);
            setIsBackendConnected(true);
            setFlightError(null);
            setLiveMetadata(null);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const message = err instanceof Error ? err.message : 'Failed to connect to backend server.';
          setFlightError(message);
          setIsBackendConnected(false);
          if (radarMode === 'live') {
            setAircraftList([]);
          } else {
            setAircraftList(DEMO_AIRCRAFT);
          }
        }
      } finally {
        if (!ignore) {
          setIsLoadingFlights(false);
        }
      }
    }

    loadInitialOrChangedFlights();

    return () => {
      ignore = true;
    };
  }, [radarMode, airspacePreset]);

  const updateServerUrl = (newUrl: string) => {
    setApiBaseUrl(newUrl);
    setServerUrl(getApiBaseUrl());
    fetchFlights();
  };

  const toggleSaveFlight = (flightNumber: string) => {
    setSavedFlightNumbers((prev) => {
      if (prev.includes(flightNumber)) {
        return prev.filter((fn) => fn !== flightNumber);
      }
      return [...prev, flightNumber];
    });
  };

  const isFlightSaved = (flightNumber: string) => savedFlightNumbers.includes(flightNumber);

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const simulateTriggerAlert = (flightNumber: string, type: 'delay' | 'gate_change' | 'boarding') => {
    const titles = {
      delay: `Delay Alert: ${flightNumber}`,
      gate_change: `Gate Change: ${flightNumber}`,
      boarding: `Boarding Call: ${flightNumber}`,
    };
    const messages = {
      delay: `Live Radar Alert: ${flightNumber} delay changed by +25 min. Sent to ${userEmail}.`,
      gate_change: `Airport ops updated: ${flightNumber} moved to Gate B18. Sent to ${userEmail}.`,
      boarding: `Flight ${flightNumber} is now boarding Group 1-3. Sent to ${userEmail}.`,
    };

    const newNotification: AlertNotification = {
      id: `notif-${Date.now()}`,
      flightNumber,
      type,
      title: titles[type],
      message: messages[type],
      timestampUtc: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  };

  const loginStaff = (pin: string) => {
    // Blueprint Staff PIN: 2026 (or emergency demo PIN: 7700 / 1234)
    if (pin === '2026' || pin === '7700' || pin === '1234' || pin === 'admin') {
      setIsStaffAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutStaff = () => {
    setIsStaffAuthenticated(false);
  };

  const addDisruptionCase = (newCaseData: Omit<DisruptionCase, 'id' | 'createdAtUtc' | 'updatedAtUtc'>) => {
    const created: DisruptionCase = {
      ...newCaseData,
      id: `disp-${Date.now()}`,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
    };
    setDisruptionCases((prev) => [created, ...prev]);
  };

  const updateDisruptionStatus = (id: string, status: 'open' | 'investigating' | 'resolved') => {
    setDisruptionCases((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, updatedAtUtc: new Date().toISOString() } : item
      )
    );
  };

  return (
    <FlightContext.Provider
      value={{
        aircraftList,
        selectedAircraft,
        setSelectedAircraft,
        isLoadingFlights,
        flightError,
        isBackendConnected,
        serverUrl,
        updateServerUrl,
        fetchFlights,
        radarMode,
        setRadarMode: handleSetRadarMode,
        airspacePreset,
        setAirspacePreset: handleSetAirspacePreset,
        liveMetadata,
        savedFlightNumbers,
        toggleSaveFlight,
        isFlightSaved,
        userEmail,
        setUserEmail,
        alertsDelayThresholdMins,
        setAlertsDelayThresholdMins,
        alertOnGateChange,
        setAlertOnGateChange,
        alertOnBoarding,
        setAlertOnBoarding,
        notifications,
        dismissNotification,
        simulateTriggerAlert,
        schedules,
        isStaffAuthenticated,
        staffPin: '7700',
        loginStaff,
        logoutStaff,
        disruptionCases,
        addDisruptionCase,
        updateDisruptionStatus,
      }}
    >
      {children}
    </FlightContext.Provider>
  );
}

export function useFlight() {
  const context = useContext(FlightContext);
  if (!context) {
    throw new Error('useFlight must be used within a FlightProvider');
  }
  return context;
}
