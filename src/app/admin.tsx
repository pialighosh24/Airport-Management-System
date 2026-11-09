import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { apiService } from '@/services/api';
import { useFlight } from '@/context/FlightContext';
import {
  AdminSession,
  AdminDashboardData,
  ProviderIntegrationStatus,
  FlightNotice,
  AircraftTelemetry,
  AirportDetail,
  AirlineCarrier,
  AuditEvent,
  SystemLogItem,
  SystemConfig,
  DatabaseDiagnostics,
  AirportWeather,
  DisruptionCase,
  FlightFare,
  AirportScheduleItem,
  GroundOperationTask,
} from '@/types';

export type AdminTab =
  | 'overview'
  | 'flights'
  | 'disruptions'
  | 'schedules'
  | 'fares'
  | 'ground-ops'
  | 'airports'
  | 'airlines'
  | 'live-monitoring'
  | 'weather'
  | 'integrations'
  | 'quotas'
  | 'users'
  | 'notices'
  | 'logs'
  | 'audit'
  | 'database'
  | 'config'
  | 'settings';

interface SidebarItem {
  id: AdminTab | 'logout';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'OPERATIONS' | 'CONNECTIVITY' | 'MANAGEMENT' | 'SYSTEM';
  badge?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Operations & Live Intelligence
  { id: 'overview', label: 'Overview Dashboard', icon: 'speedometer-outline', category: 'OPERATIONS' },
  { id: 'live-monitoring', label: 'Live Flight Radar', icon: 'radio-outline', category: 'OPERATIONS' },
  { id: 'flights', label: 'Flight Management', icon: 'airplane-outline', category: 'OPERATIONS' },
  { id: 'disruptions', label: 'OCC Disruptions', icon: 'warning-outline', category: 'OPERATIONS' },
  { id: 'schedules', label: 'Flight Boards', icon: 'time-outline', category: 'OPERATIONS' },
  { id: 'fares', label: 'Airfare Engine', icon: 'pricetag-outline', category: 'OPERATIONS' },
  { id: 'ground-ops', label: 'Ground Operations', icon: 'construct-outline', category: 'OPERATIONS' },
  { id: 'airports', label: 'Airport Registry', icon: 'business-outline', category: 'OPERATIONS' },
  { id: 'airlines', label: 'Airline Registry', icon: 'git-network-outline', category: 'OPERATIONS' },
  { id: 'weather', label: 'Weather Telemetry', icon: 'cloud-outline', category: 'OPERATIONS' },

  // API & Provider Connectivity
  { id: 'integrations', label: 'API Provider Health', icon: 'hardware-chip-outline', category: 'CONNECTIVITY' },
  { id: 'quotas', label: 'Rate Limits & Quotas', icon: 'pie-chart-outline', category: 'CONNECTIVITY' },
  { id: 'database', label: 'Database Health', icon: 'server-outline', category: 'CONNECTIVITY' },

  // Control & Management
  { id: 'notices', label: 'Notice Management', icon: 'megaphone-outline', category: 'MANAGEMENT' },
  { id: 'users', label: 'User & Staff Access', icon: 'people-outline', category: 'MANAGEMENT' },
  { id: 'config', label: 'System Configuration', icon: 'options-outline', category: 'MANAGEMENT' },

  // Security & Diagnostics
  { id: 'logs', label: 'Live System Logs', icon: 'terminal-outline', category: 'SYSTEM' },
  { id: 'audit', label: 'Audit Trail', icon: 'shield-checkmark-outline', category: 'SYSTEM' },
  { id: 'settings', label: 'Security & Posture', icon: 'lock-closed-outline', category: 'SYSTEM' },
  { id: 'logout', label: 'Logout Admin', icon: 'log-out-outline', category: 'SYSTEM' },
];

export default function AdminScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { serverUrl, aircraftList, fetchFlights } = useFlight();

  // ----------------------------------------------------
  // Authentication State
  // ----------------------------------------------------
  const [session, setSession] = useState<AdminSession | null>(null);
  const [usernameInput, setUsernameInput] = useState('admin');
  const [passwordInput, setPasswordInput] = useState('AeroNexusAdmin2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ----------------------------------------------------
  // Navigation State
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ----------------------------------------------------
  // Live Domain Data States
  // ----------------------------------------------------
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

  const [integrations, setIntegrations] = useState<ProviderIntegrationStatus[]>([]);
  const [isCheckingIntegrations, setIsCheckingIntegrations] = useState(false);

  const [notices, setNotices] = useState<FlightNotice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(false);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState<FlightNotice | null>(null);
  const [noticeFormCategory, setNoticeFormCategory] = useState('SAFETY ADVISORY');
  const [noticeFormTitle, setNoticeFormTitle] = useState('');
  const [noticeFormMessage, setNoticeFormMessage] = useState('');
  const [noticeFormPriority, setNoticeFormPriority] = useState<'normal' | 'high' | 'urgent'>('normal');

  const [masterAirports, setMasterAirports] = useState<AirportDetail[]>([]);
  const [airportSearch, setAirportSearch] = useState('');
  const [isLoadingAirports, setIsLoadingAirports] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<AirportDetail | null>(null);

  const [flightSearch, setFlightSearch] = useState('');
  const [flightFilter, setFlightFilter] = useState<'all' | 'live' | 'demo'>('all');
  const [selectedFlight, setSelectedFlight] = useState<AircraftTelemetry | null>(null);

  const [airlines, setAirlines] = useState<AirlineCarrier[]>([]);
  const [isLoadingAirlines, setIsLoadingAirlines] = useState(false);
  const [airlineSearch, setAirlineSearch] = useState('');

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditFilterCategory, setAuditFilterCategory] = useState<string>('ALL');

  const [systemLogs, setSystemLogs] = useState<SystemLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');

  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

  const [dbDiagnostics, setDbDiagnostics] = useState<DatabaseDiagnostics | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const [userDiagnostics, setUserDiagnostics] = useState<any>(null);

  // FEATURE/DASHBOARD BRANCH MODULE STATES
  const [groundTasks, setGroundTasks] = useState<GroundOperationTask[]>([]);
  const [groundMeta, setGroundMeta] = useState<{ storage: string; demoCount: number } | null>(null);
  const [groundStatusFilter, setGroundStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [isLoadingGround, setIsLoadingGround] = useState(false);
  const [groundError, setGroundError] = useState<string | null>(null);

  const [hubWeatherList, setHubWeatherList] = useState<AirportWeather[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  // ----------------------------------------------------
  // ANIMA-AERONEXUS BRANCH MODULE STATES
  // ----------------------------------------------------
  const [disruptions, setDisruptions] = useState<DisruptionCase[]>([]);
  const [isLoadingDisruptions, setIsLoadingDisruptions] = useState(false);
  const [selectedDisruption, setSelectedDisruption] = useState<DisruptionCase | null>(null);
  const [disruptionFilter, setDisruptionFilter] = useState<'all' | 'mechanical' | 'weather' | 'air_traffic_control'>('all');

  const [fares, setFares] = useState<FlightFare[]>([]);
  const [isLoadingFares, setIsLoadingFares] = useState(false);
  const [selectedFare, setSelectedFare] = useState<FlightFare | null>(null);
  const [fareCurrency, setFareCurrency] = useState<'INR' | 'USD'>('INR');

  const [schedules, setSchedules] = useState<{ departures: AirportScheduleItem[]; arrivals: AirportScheduleItem[] }>({
    departures: [],
    arrivals: [],
  });
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleAirport, setScheduleAirport] = useState('JFK');
  const [scheduleTabType, setScheduleTabType] = useState<'departures' | 'arrivals'>('departures');

  // ----------------------------------------------------
  // Data Loaders
  // ----------------------------------------------------
  const loadDashboard = useCallback(async (token: string) => {
    setIsLoadingDashboard(true);
    try {
      const data = await apiService.adminGetDashboard(token);
      setDashboardData(data);
    } catch {
      // Keep existing data on error
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  const loadIntegrations = useCallback(async (token: string, force = false) => {
    setIsCheckingIntegrations(true);
    try {
      const res = await apiService.adminGetIntegrations(token, force);
      if (res && res.results) {
        setIntegrations(res.results);
      }
    } catch {
      // Fail silently
    } finally {
      setIsCheckingIntegrations(false);
    }
  }, []);

  const loadNotices = useCallback(async (token: string) => {
    setIsLoadingNotices(true);
    try {
      const res = await apiService.adminGetNotices(token);
      if (res && res.data) {
        setNotices(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingNotices(false);
    }
  }, []);

  const loadAirports = useCallback(async () => {
    setIsLoadingAirports(true);
    try {
      const res = await apiService.getMasterAirports();
      if (res && res.data) {
        setMasterAirports(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingAirports(false);
    }
  }, []);

  const loadAirlines = useCallback(async (token: string) => {
    setIsLoadingAirlines(true);
    try {
      const res = await apiService.adminGetAirlines(token);
      if (res && res.data) {
        setAirlines(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingAirlines(false);
    }
  }, []);

  const loadAudit = useCallback(async (token: string) => {
    setIsLoadingAudit(true);
    try {
      const res = await apiService.adminGetAuditTrail(token, 100);
      if (res && res.data) {
        setAuditEvents(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingAudit(false);
    }
  }, []);

  const loadLogs = useCallback(async (token: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await apiService.adminGetSystemLogs(token, 100);
      if (res && res.data) {
        setSystemLogs(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const loadConfig = useCallback(async (token: string) => {
    try {
      const res = await apiService.adminGetConfig(token);
      if (res && res.data) {
        setSystemConfig(res.data);
      }
    } catch {
      // Fail silently
    }
  }, []);

  const loadDatabase = useCallback(async (token: string) => {
    setIsLoadingDb(true);
    try {
      const res = await apiService.adminGetDatabase(token);
      if (res && res.diagnostics) {
        setDbDiagnostics(res.diagnostics);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  const loadUsers = useCallback(async (token: string) => {
    try {
      const res = await apiService.adminGetUsers(token);
      setUserDiagnostics(res);
    } catch {
      // Fail silently
    }
  }, []);

  const loadWeather = useCallback(async () => {
    setIsLoadingWeather(true);
    try {
      const hubs = ['DEL', 'BOM', 'BLR', 'CCU', 'DXB', 'LHR'];
      const promises = hubs.map(h => apiService.getAirportWeather({ airport: h }));
      const results = await Promise.all(promises);
      const valid = results.filter((w): w is AirportWeather => Boolean(w && w.success));
      setHubWeatherList(valid);
    } catch {
      // Fail silently
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Feature/dashboard Branch Loaders
  const loadGroundOps = useCallback(async (token: string) => {
    setIsLoadingGround(true);
    setGroundError(null);
    try {
      const res = await apiService.adminGetGroundOperations(token);
      if (res && res.success) {
        setGroundTasks(res.data);
        setGroundMeta({ storage: res.storage, demoCount: res.demoCount });
      }
    } catch (err: unknown) {
      setGroundError(err instanceof Error ? err.message : 'Ground operations unavailable.');
    } finally {
      setIsLoadingGround(false);
    }
  }, []);

  const updateGroundTaskStatus = useCallback(
    async (token: string, id: string, status: string) => {
      try {
        await apiService.adminUpdateGroundOperation(token, id, { status });
        await loadGroundOps(token);
      } catch (err: unknown) {
        setGroundError(err instanceof Error ? err.message : 'Failed to update task.');
      }
    },
    [loadGroundOps]
  );

  // Anima Branch Loaders
  const loadDisruptions = useCallback(async () => {
    setIsLoadingDisruptions(true);
    try {
      const res = await apiService.getOpsCases();
      if (res && res.data) {
        setDisruptions(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingDisruptions(false);
    }
  }, []);

  const loadFares = useCallback(async () => {
    setIsLoadingFares(true);
    try {
      const res = await apiService.getFares();
      if (res && Array.isArray(res.data)) {
        setFares(res.data);
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingFares(false);
    }
  }, []);

  const loadSchedules = useCallback(async (code: string) => {
    setIsLoadingSchedules(true);
    try {
      const res = await apiService.getAirportSchedule(code);
      if (res && res.success) {
        setSchedules({
          departures: res.departures || [],
          arrivals: res.arrivals || [],
        });
      }
    } catch {
      // Fail silently
    } finally {
      setIsLoadingSchedules(false);
    }
  }, []);

  // ----------------------------------------------------
  // Refresh Active Tab
  // ----------------------------------------------------
  const refreshCurrentTab = useCallback(() => {
    if (!session) return;
    switch (activeTab) {
      case 'overview':
        loadDashboard(session.token);
        loadIntegrations(session.token, false);
        loadDisruptions();
        loadFares();
        break;
      case 'integrations':
      case 'quotas':
        loadIntegrations(session.token, true);
        break;
      case 'flights':
      case 'live-monitoring':
        fetchFlights();
        break;
      case 'disruptions':
        loadDisruptions();
        break;
      case 'schedules':
        loadSchedules(scheduleAirport);
        break;
      case 'fares':
        loadFares();
        break;
      case 'ground-ops':
        loadGroundOps(session.token);
        break;
      case 'airports':
        loadAirports();
        break;
      case 'airlines':
        loadAirlines(session.token);
        break;
      case 'weather':
        loadWeather();
        break;
      case 'notices':
        loadNotices(session.token);
        break;
      case 'logs':
        loadLogs(session.token);
        break;
      case 'audit':
        loadAudit(session.token);
        break;
      case 'database':
        loadDatabase(session.token);
        break;
      case 'config':
        loadConfig(session.token);
        break;
      case 'users':
        loadUsers(session.token);
        break;
      case 'settings':
        loadConfig(session.token);
        loadDatabase(session.token);
        break;
    }
  }, [
    session,
    activeTab,
    scheduleAirport,
    loadDashboard,
    loadIntegrations,
    fetchFlights,
    loadAirports,
    loadAirlines,
    loadWeather,
    loadNotices,
    loadLogs,
    loadAudit,
    loadDatabase,
    loadConfig,
    loadUsers,
    loadDisruptions,
    loadFares,
    loadGroundOps,
    loadSchedules,
  ]);

  // Handle Tab Switch
  const handleTabChange = (tabId: AdminTab | 'logout') => {
    if (tabId === 'logout') {
      handleLogout();
      return;
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);

    if (!session) return;
    if (tabId === 'overview') {
      loadDashboard(session.token);
      loadDisruptions();
      loadFares();
    }
    if (tabId === 'integrations' || tabId === 'quotas') loadIntegrations(session.token, false);
    if (tabId === 'disruptions') loadDisruptions();
    if (tabId === 'schedules') loadSchedules(scheduleAirport);
    if (tabId === 'fares') loadFares();
    if (tabId === 'ground-ops') loadGroundOps(session.token);
    if (tabId === 'notices') loadNotices(session.token);
    if (tabId === 'airports') loadAirports();
    if (tabId === 'airlines') loadAirlines(session.token);
    if (tabId === 'weather') loadWeather();
    if (tabId === 'logs') loadLogs(session.token);
    if (tabId === 'audit') loadAudit(session.token);
    if (tabId === 'database') loadDatabase(session.token);
    if (tabId === 'config') loadConfig(session.token);
    if (tabId === 'users') loadUsers(session.token);
  };

  // Safe return to mobile staff screen
  const handleReturnToApp = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/staff' as any);
    }
  };

  // ----------------------------------------------------
  // Authentication Actions
  // ----------------------------------------------------
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await apiService.adminLogin({
        username: usernameInput.trim(),
        password: passwordInput,
      });

      if (res && res.success && res.token) {
        const newSession: AdminSession = {
          token: res.token,
          username: res.username,
          role: 'admin',
          expiresAt: res.expiresAt,
        };
        setSession(newSession);
        // Load initial operational sets
        loadDashboard(res.token);
        loadIntegrations(res.token, false);
        loadNotices(res.token);
        loadAirports();
        loadAirlines(res.token);
        loadLogs(res.token);
        loadAudit(res.token);
        loadConfig(res.token);
        loadDatabase(res.token);
        loadUsers(res.token);
        loadDisruptions();
        loadFares();
        loadGroundOps(res.token);
        loadSchedules('JFK');
      } else {
        throw new Error(res.message || 'Authentication rejected by security controller.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to AeroNexus Admin Endpoint.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setPasswordInput('');
    setActiveTab('overview');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      // Non-blocking initialization
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ----------------------------------------------------
  // Notice CRUD Actions
  // ----------------------------------------------------
  const openNoticeCreateModal = () => {
    setEditingNotice(null);
    setNoticeFormCategory('SAFETY ADVISORY');
    setNoticeFormTitle('');
    setNoticeFormMessage('');
    setNoticeFormPriority('normal');
    setNoticeModalVisible(true);
  };

  const openNoticeEditModal = (notice: FlightNotice) => {
    setEditingNotice(notice);
    setNoticeFormCategory(notice.category);
    setNoticeFormTitle(notice.title);
    setNoticeFormMessage(notice.message);
    setNoticeFormPriority(notice.priority || 'normal');
    setNoticeModalVisible(true);
  };

  const handleSaveNotice = async () => {
    if (!session) return;
    if (!noticeFormTitle.trim() || !noticeFormMessage.trim()) return;

    try {
      if (editingNotice) {
        await apiService.adminUpdateNotice(session.token, editingNotice.id, {
          category: noticeFormCategory,
          title: noticeFormTitle.trim(),
          message: noticeFormMessage.trim(),
          priority: noticeFormPriority,
        });
      } else {
        await apiService.adminCreateNotice(session.token, {
          category: noticeFormCategory,
          title: noticeFormTitle.trim(),
          message: noticeFormMessage.trim(),
          priority: noticeFormPriority,
          active: true,
        });
      }
      setNoticeModalVisible(false);
      loadNotices(session.token);
      loadAudit(session.token);
    } catch {
      // Handled silently
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!session) return;
    try {
      await apiService.adminDeleteNotice(session.token, id);
      loadNotices(session.token);
      loadAudit(session.token);
    } catch {
      // Handled silently
    }
  };

  const handleToggleNoticeActive = async (notice: FlightNotice) => {
    if (!session) return;
    try {
      await apiService.adminUpdateNotice(session.token, notice.id, {
        active: !notice.active,
      });
      loadNotices(session.token);
    } catch {
      // Handled silently
    }
  };

  // ----------------------------------------------------
  // Configuration Save Action
  // ----------------------------------------------------
  const handleSaveConfig = async () => {
    if (!session || !systemConfig) return;
    setConfigSaving(true);
    setConfigSaveMsg(null);
    try {
      const res = await apiService.adminUpdateConfig(session.token, systemConfig);
      if (res && res.success) {
        setConfigSaveMsg('Configuration saved & audit logged.');
        setTimeout(() => setConfigSaveMsg(null), 4000);
      }
    } catch (err: unknown) {
      setConfigSaveMsg(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  // ----------------------------------------------------
  // Filtered Collections
  // ----------------------------------------------------
  const filteredFlights = useMemo(() => {
    return aircraftList.filter(flight => {
      const originCode = flight.origin?.iata || flight.origin?.icao || '';
      const destCode = flight.destination?.iata || flight.destination?.icao || '';
      const matchesSearch =
        flightSearch === '' ||
        (flight.flightNumber || '').toLowerCase().includes(flightSearch.toLowerCase()) ||
        (flight.callsign || '').toLowerCase().includes(flightSearch.toLowerCase()) ||
        originCode.toLowerCase().includes(flightSearch.toLowerCase()) ||
        destCode.toLowerCase().includes(flightSearch.toLowerCase());

      const isLive = !flight.isDemo;
      const matchesMode =
        flightFilter === 'all' ||
        (flightFilter === 'live' && isLive) ||
        (flightFilter === 'demo' && !isLive);

      return matchesSearch && matchesMode;
    });
  }, [aircraftList, flightSearch, flightFilter]);

  const filteredAirports = useMemo(() => {
    return masterAirports.filter(a => {
      if (!airportSearch) return true;
      const q = airportSearch.toLowerCase();
      return (
        (a.code || '').toLowerCase().includes(q) ||
        (a.icao || '').toLowerCase().includes(q) ||
        (a.name || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q)
      );
    });
  }, [masterAirports, airportSearch]);

  const filteredAirlines = useMemo(() => {
    return airlines.filter(a => {
      if (!airlineSearch) return true;
      const q = airlineSearch.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.icao.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
      );
    });
  }, [airlines, airlineSearch]);

  const filteredDisruptions = useMemo(() => {
    if (disruptionFilter === 'all') return disruptions;
    return disruptions.filter(d => d.incidentType === disruptionFilter);
  }, [disruptions, disruptionFilter]);

  const filteredLogs = useMemo(() => {
    if (logLevelFilter === 'ALL') return systemLogs;
    return systemLogs.filter(l => l.level.toUpperCase() === logLevelFilter);
  }, [systemLogs, logLevelFilter]);

  const filteredAudit = useMemo(() => {
    if (auditFilterCategory === 'ALL') return auditEvents;
    return auditEvents.filter(a => a.category.toUpperCase() === auditFilterCategory);
  }, [auditEvents, auditFilterCategory]);

  // ----------------------------------------------------
  // Unauthenticated: Secure Admin Gate View
  // ----------------------------------------------------
  if (!session) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <View style={styles.loginBackdropGlow} />
        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            <View style={styles.radarLogoBadge}>
              <Ionicons name="shield-checkmark" size={32} color="#00F2FE" />
            </View>
            <Text style={styles.loginBrand}>AERONEXUS</Text>
            <Text style={styles.loginSubtitle}>Central Aviation Intelligence Control</Text>
            <View style={styles.loginSecureTag}>
              <View style={styles.pulseDot} />
              <Text style={styles.loginSecureText}>SECURE AIR-OPS ACCESS ONLY</Text>
            </View>
          </View>

          {loginError && (
            <View style={styles.loginErrorBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF5252" />
              <Text style={styles.loginErrorText}>{loginError}</Text>
            </View>
          )}

          <View style={styles.loginForm}>
            <Text style={styles.inputLabel}>ADMINISTRATOR IDENTIFIER</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={usernameInput}
                onChangeText={setUsernameInput}
                autoCapitalize="none"
                placeholder="Enter admin ID"
                placeholderTextColor="#475569"
              />
            </View>

            <Text style={styles.inputLabel}>SECURITY TOKEN / PASSPHRASE</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry={!showPassword}
                placeholder="Enter passphrase"
                placeholderTextColor="#475569"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, isLoggingIn && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#0B132B" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>AUTHENTICATE INTO CONTROL CENTER</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0B132B" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.returnMobileBtn} onPress={handleReturnToApp}>
              <Ionicons name="arrow-back" size={16} color="#64748B" />
              <Text style={styles.returnMobileText}>Return to Mobile App</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginFooter}>
            <Text style={styles.loginFooterText}>
              Backend Server: <Text style={styles.codeText}>{serverUrl}</Text>
            </Text>
            <Text style={styles.loginFooterNote}>
              Protected by scrypt crypto & HMAC token security. Actions are immutably logged to the persistent audit trail.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // Authenticated: Aviation Operations Central Control
  // ----------------------------------------------------
  return (
    <SafeAreaView style={styles.shell}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {!isDesktop && (
            <TouchableOpacity
              style={styles.mobileHamburger}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Ionicons name={mobileMenuOpen ? 'close' : 'menu'} size={24} color="#00F2FE" />
            </TouchableOpacity>
          )}
          <View style={styles.topLogoCluster}>
            <View style={styles.topRadarIcon}>
              <Ionicons name="radio" size={16} color="#00F2FE" />
            </View>
            <Text style={styles.topBrand}>AERONEXUS</Text>
            <View style={styles.topDivider} />
            <Text style={styles.topBreadcrumb}>
              {SIDEBAR_ITEMS.find(s => s.id === activeTab)?.label.toUpperCase() || 'CONTROL'}
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.liveServerBadge}>
            <View style={styles.pulseDotGreen} />
            <Text style={styles.liveServerText}>SERVER 5000 LIVE</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={refreshCurrentTab}>
            <Ionicons name="refresh" size={16} color="#94A3B8" />
            {isDesktop && <Text style={styles.refreshText}>Sync Telemetry</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToAppPill} onPress={handleReturnToApp}>
            <Ionicons name="phone-portrait-outline" size={15} color="#00F2FE" />
            {isDesktop && <Text style={styles.backToAppText}>Staff Ops</Text>}
          </TouchableOpacity>

          <View style={styles.userProfilePill}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>A</Text>
            </View>
            {isDesktop && (
              <View>
                <Text style={styles.userNameText}>{session.username}</Text>
                <Text style={styles.userRoleText}>SUPERADMIN</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main Layout Body */}
      <View style={styles.bodyWrapper}>
        {/* Left Navigation Sidebar */}
        {(isDesktop || mobileMenuOpen) && (
          <View style={[styles.sidebar, !isDesktop && styles.mobileSidebarDrawer]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarScroll}>
              <Text style={styles.sidebarSectionHeading}>OPERATIONS & RADAR</Text>
              {SIDEBAR_ITEMS.filter(i => i.category === 'OPERATIONS').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, activeTab === item.id && styles.navItemActive]}
                  onPress={() => handleTabChange(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={activeTab === item.id ? '#00F2FE' : '#64748B'}
                  />
                  <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {activeTab === item.id && <View style={styles.activePillIndicator} />}
                </TouchableOpacity>
              ))}

              <Text style={styles.sidebarSectionHeading}>INTELLIGENCE & CONNECTIVITY</Text>
              {SIDEBAR_ITEMS.filter(i => i.category === 'CONNECTIVITY').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, activeTab === item.id && styles.navItemActive]}
                  onPress={() => handleTabChange(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={activeTab === item.id ? '#00F2FE' : '#64748B'}
                  />
                  <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {activeTab === item.id && <View style={styles.activePillIndicator} />}
                </TouchableOpacity>
              ))}

              <Text style={styles.sidebarSectionHeading}>MANAGEMENT & CONTROL</Text>
              {SIDEBAR_ITEMS.filter(i => i.category === 'MANAGEMENT').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.navItem, activeTab === item.id && styles.navItemActive]}
                  onPress={() => handleTabChange(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={activeTab === item.id ? '#00F2FE' : '#64748B'}
                  />
                  <Text style={[styles.navLabel, activeTab === item.id && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {activeTab === item.id && <View style={styles.activePillIndicator} />}
                </TouchableOpacity>
              ))}

              <Text style={styles.sidebarSectionHeading}>SECURITY & AUDIT</Text>
              {SIDEBAR_ITEMS.filter(i => i.category === 'SYSTEM').map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    activeTab === item.id && styles.navItemActive,
                    item.id === 'logout' && styles.navItemLogout,
                  ]}
                  onPress={() => handleTabChange(item.id)}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.id === 'logout' ? '#EF4444' : activeTab === item.id ? '#00F2FE' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.navLabel,
                      activeTab === item.id && styles.navLabelActive,
                      item.id === 'logout' && styles.navLabelLogout,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.sidebarMetaBox}>
                <Text style={styles.sidebarMetaTitle}>AERONEXUS v1.0.0</Text>
                <Text style={styles.sidebarMetaSub}>Central Intel Engine</Text>
              </View>
            </ScrollView>
          </View>
        )}

        {/* Center Main Stage Content */}
        <View style={styles.mainStage}>
          <ScrollView contentContainerStyle={styles.mainStageScroll} showsVerticalScrollIndicator={false}>
            {/* 1. OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      System Operations Overview {isLoadingDashboard ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Live telemetry, disruption monitoring, and operational statistics across all 3 development branches.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => loadIntegrations(session.token, true)}
                    disabled={isCheckingIntegrations}
                  >
                    <Ionicons name="pulse" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>
                      {isCheckingIntegrations ? 'Probing Providers...' : 'Probe All Providers'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Stat Grid */}
                <View style={styles.statGrid}>
                  {/* Total Flights */}
                  <View style={styles.statCard}>
                    <View style={styles.statIconBox}>
                      <Ionicons name="airplane" size={22} color="#00F2FE" />
                    </View>
                    <Text style={styles.statCardValue}>{dashboardData?.metrics.flights.total ?? aircraftList.length}</Text>
                    <Text style={styles.statCardLabel}>Active Flight Telemetry</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotCyan} />
                      <Text style={styles.statCardFooterText}>
                        {dashboardData?.metrics.flights.isDemo ? 'Demo + ADS-B Hybrid' : 'Live MySQL Table'}
                      </Text>
                    </View>
                  </View>

                  {/* ANIMA'S MODULE: Disruption Cases */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(255, 183, 3, 0.15)' }]}>
                      <Ionicons name="warning" size={22} color="#FFB703" />
                    </View>
                    <Text style={styles.statCardValue}>{disruptions.length}</Text>
                    <Text style={styles.statCardLabel}>Active OCC Disruptions</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotYellow} />
                      <Text style={styles.statCardFooterText}>Operations case registry</Text>
                    </View>
                  </View>

                  {/* ANIMA'S MODULE: Transparent Fares */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(56, 239, 125, 0.15)' }]}>
                      <Ionicons name="pricetag" size={22} color="#38EF7D" />
                    </View>
                    <Text style={styles.statCardValue}>{fares.length > 0 ? fares.length : 'UNKNOWN'}</Text>
                    <Text style={styles.statCardLabel}>Monitored Fare Routes</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotGreen} />
                      <Text style={styles.statCardFooterText}>Fare comparison engine</Text>
                    </View>
                  </View>

                  {/* Active Airports */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(56, 239, 125, 0.15)' }]}>
                      <Ionicons name="business" size={22} color="#38EF7D" />
                    </View>
                    <Text style={styles.statCardValue}>{dashboardData?.metrics.airports.total ?? masterAirports.length ?? 16}</Text>
                    <Text style={styles.statCardLabel}>Registered Master Hubs</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotGreen} />
                      <Text style={styles.statCardFooterText}>Airport Master Registry</Text>
                    </View>
                  </View>

                  {/* Monitored Airlines */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(58, 134, 255, 0.15)' }]}>
                      <Ionicons name="git-network" size={22} color="#3A86FF" />
                    </View>
                    <Text style={styles.statCardValue}>{airlines.length > 0 ? airlines.length : 'UNKNOWN'}</Text>
                    <Text style={styles.statCardLabel}>Monitored Airlines</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotBlue} />
                      <Text style={styles.statCardFooterText}>Active Carrier Registry</Text>
                    </View>
                  </View>

                  {/* Registered Users */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(247, 37, 133, 0.15)' }]}>
                      <Ionicons name="people" size={22} color="#F72585" />
                    </View>
                    <Text style={styles.statCardValue}>
                      {dashboardData?.metrics.users.available ? dashboardData.metrics.users.total : 'UNAVAILABLE'}
                    </Text>
                    <Text style={styles.statCardLabel}>Registered End-Users</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotYellow} />
                      <Text style={styles.statCardFooterText}>
                        {dashboardData?.metrics.users.available ? 'MySQL users table' : 'MySQL users table not connected'}
                      </Text>
                    </View>
                  </View>

                  {/* API Providers */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                      <Ionicons name="hardware-chip" size={22} color="#00F2FE" />
                    </View>
                    <Text style={styles.statCardValue}>5</Text>
                    <Text style={styles.statCardLabel}>API Providers Probed</Text>
                    <View style={styles.statCardFooter}>
                      <View style={styles.dotCyan} />
                      <Text style={styles.statCardFooterText}>Amadeus, OpenSky, 3 more</Text>
                    </View>
                  </View>

                  {/* Database Health */}
                  <View style={styles.statCard}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(56, 239, 125, 0.15)' }]}>
                      <Ionicons name="server" size={22} color="#38EF7D" />
                    </View>
                    <Text style={styles.statCardValue}>
                      {dashboardData?.system.database.connected ? 'MYSQL 8.0' : 'DEMO MODE'}
                    </Text>
                    <Text style={styles.statCardLabel}>Data Persistence Engine</Text>
                    <View style={styles.statCardFooter}>
                      <View style={dashboardData?.system.database.connected ? styles.dotGreen : styles.dotYellow} />
                      <Text style={styles.statCardFooterText}>
                        {dashboardData?.system.database.connected ? 'Pool Active (5432)' : 'Graceful Fallback Mode'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Team Multi-Branch Architecture Banner (SHOWING ALL 3 BRANCHES) */}
                <View style={styles.branchIntegrationCard}>
                  <View style={styles.branchCardIconWrap}>
                    <Ionicons name="git-merge-outline" size={26} color="#00F2FE" />
                  </View>
                  <View style={styles.branchCardTextWrap}>
                    <Text style={styles.branchCardTitle}>Multi-Branch Unified Architecture Overview</Text>
                    <Text style={styles.branchCardBody}>
                      The Central Admin Panel dynamically visualizes and integrates modules across all 3 development branches without merging:
                    </Text>
                    <View style={styles.branchPillsRow}>
                      <View style={[styles.branchPill, { borderColor: '#00F2FE' }]}>
                        <Text style={[styles.branchPillLabel, { color: '#00F2FE' }]}>1. Ankana Maity (ankana-project • Current):</Text>
                        <Text style={styles.branchPillStatus}>Radar, Master Aerodrome Registry, Notices, Central Admin</Text>
                      </View>
                      <View style={[styles.branchPill, { borderColor: '#FFB703' }]}>
                        <Text style={[styles.branchPillLabel, { color: '#FFB703' }]}>2. Anima Mahata (anima-aeronexus):</Text>
                        <Text style={styles.branchPillStatus}>OCC Disruptions, Hub Schedule Boards, Unbundled Fares</Text>
                      </View>
                      <View style={[styles.branchPill, { borderColor: '#38EF7D' }]}>
                        <Text style={[styles.branchPillLabel, { color: '#38EF7D' }]}>3. Piali Ghosh (origin/feature/dashboard):</Text>
                        <Text style={styles.branchPillStatus}>Ground Ops, Commercial APIs (Amadeus, FA), User Model</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Provider Health Visualizer Strip */}
                <View style={styles.panelCard}>
                  <View style={styles.panelHeader}>
                    <View>
                      <Text style={styles.panelTitle}>Aviation API Provider Availability</Text>
                      <Text style={styles.panelSubtitle}>Live response latency metrics across 5 external providers</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.smallOutlineBtn}
                      onPress={() => setActiveTab('integrations')}
                    >
                      <Text style={styles.smallOutlineBtnText}>Full Provider Matrix →</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.providerMiniGrid}>
                    {(integrations.length > 0
                      ? integrations
                      : [
                          { id: 'amadeus', name: 'Amadeus Offers API', status: 'not_configured', latencyMs: null },
                          { id: 'openmeteo', name: 'Open-Meteo Weather', status: 'connected', latencyMs: 230 },
                          { id: 'flightaware', name: 'FlightAware AeroAPI', status: 'not_configured', latencyMs: null },
                          { id: 'opensky', name: 'OpenSky Network ADS-B', status: 'connected', latencyMs: 650 },
                          { id: 'freeairportdb', name: 'FreeAirportDB Registry', status: 'connected', latencyMs: 140 },
                        ]
                    ).map(p => {
                      const isOnline = p.status === 'connected';
                      const isUnconfigured = p.status === 'not_configured';
                      return (
                        <View key={p.id} style={styles.providerMiniCard}>
                          <View style={styles.providerMiniTop}>
                            <Text style={styles.providerMiniName}>{p.name}</Text>
                            <View
                              style={[
                                styles.statusBadgeMini,
                                isOnline
                                  ? styles.badgeOnline
                                  : isUnconfigured
                                  ? styles.badgeUnconfigured
                                  : styles.badgeOffline,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeMiniText,
                                  isOnline
                                    ? styles.textGreen
                                    : isUnconfigured
                                    ? styles.textYellow
                                    : styles.textRed,
                                ]}
                              >
                                {isOnline ? 'ONLINE' : isUnconfigured ? 'NOT CONFIGURED' : 'OFFLINE'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.providerLatencyText}>
                            Latency: {p.latencyMs ? `${p.latencyMs}ms` : 'N/A (Keys unconfigured)'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Recent System Activity Preview */}
                <View style={styles.panelCard}>
                  <View style={styles.panelHeader}>
                    <View>
                      <Text style={styles.panelTitle}>Recent Audit Events</Text>
                      <Text style={styles.panelSubtitle}>Immutable administrative actions recorded by backend kernel</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.smallOutlineBtn}
                      onPress={() => setActiveTab('audit')}
                    >
                      <Text style={styles.smallOutlineBtnText}>View Full Trail →</Text>
                    </TouchableOpacity>
                  </View>

                  {auditEvents.slice(0, 4).map(evt => (
                    <View key={evt.id} style={styles.auditMiniRow}>
                      <View style={styles.auditMiniActionBox}>
                        <Text style={styles.auditMiniActionText}>{evt.action}</Text>
                      </View>
                      <View style={styles.auditMiniDetailBox}>
                        <Text style={styles.auditMiniDetailText} numberOfLines={1}>
                          {evt.details}
                        </Text>
                        <Text style={styles.auditMiniTimeText}>
                          {evt.actor} • {new Date(evt.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <View style={styles.auditMiniStatusPill}>
                        <Text style={styles.auditMiniStatusText}>{evt.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 2. ANIMA'S MODULE: OCC DISRUPTIONS */}
            {activeTab === 'disruptions' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Network Irregularity & Disruption Cases (OCC) {isLoadingDisruptions ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Manage operational station disruptions, ramp turnaround delays, and impacted passenger rosters.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {(['all', 'mechanical', 'weather', 'air_traffic_control'] as const).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.filterPill, disruptionFilter === type && styles.filterPillActive]}
                        onPress={() => setDisruptionFilter(type)}
                      >
                        <Text style={[styles.filterPillText, disruptionFilter === type && styles.filterPillTextActive]}>
                          {type === 'air_traffic_control' ? 'ATC' : type.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>CASE NO / FLIGHT</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>ROUTE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>TYPE / SEVERITY</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>PASSENGERS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>MILESTONE / STATUS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {filteredDisruptions.length === 0 ? (
                    <View style={styles.emptyTableState}>
                      <Ionicons name="checkmark-circle-outline" size={36} color="#38EF7D" />
                      <Text style={styles.emptyTableText}>No active disruption cases reported.</Text>
                    </View>
                  ) : (
                    filteredDisruptions.map(c => {
                      const isHigh = c.severity === 'high' || c.severity === 'critical';
                      return (
                        <View key={c.id} style={styles.tableDataRow}>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightPrimaryCode}>{c.caseNumber}</Text>
                            <Text style={styles.flightSecondaryCode}>{c.flightNumber}</Text>
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightRouteText}>{c.route}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={[styles.flightStatusBadge, isHigh ? styles.priorityUrgent : styles.priorityNormal]}>
                              <Text style={[styles.flightStatusBadgeText, isHigh ? styles.textRed : styles.textCyan]}>
                                {c.incidentType.toUpperCase().replace(/_/g, ' ')}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flightMetricText}>{c.impactedPassengers} Pax</Text>
                            <Text style={styles.flightMetricSubText}>Severity: {c.severity.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightMetricText}>Stage: {(c as any).turnaroundMilestone || 'Underway'}</Text>
                            <Text style={[styles.flightMetricSubText, { color: '#38EF7D' }]}>Status: {c.status.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              style={styles.detailActionBtn}
                              onPress={() => setSelectedDisruption(c)}
                            >
                              <Text style={styles.detailActionBtnText}>Inspect</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* FEATURE/DASHBOARD MODULE: GROUND OPERATIONS */}
            {activeTab === 'ground-ops' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Ground Operations & Ramp Turnarounds {isLoadingGround ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Ground handling task workflow. Storage: {groundMeta?.storage || 'UNKNOWN'}.
                      {groundMeta && groundMeta.demoCount > 0
                        ? ` ${groundMeta.demoCount} task(s) are demo seed records and are labelled DEMO.`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.filterPill, groundStatusFilter === s && styles.filterPillActive]}
                        onPress={() => setGroundStatusFilter(s)}
                      >
                        <Text style={[styles.filterPillText, groundStatusFilter === s && styles.filterPillTextActive]}>
                          {s.replace('_', ' ').toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {groundError ? <Text style={[styles.sectionSubtitle, { color: '#EF4444' }]}>{groundError}</Text> : null}

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>TASK NO / FLIGHT</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>TYPE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>ASSIGNED / PRIORITY</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>STATUS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>UPDATED</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {groundTasks.filter(t => groundStatusFilter === 'all' || t.status === groundStatusFilter).length === 0 ? (
                    <View style={styles.emptyTableState}>
                      <Ionicons name="construct-outline" size={36} color="#64748B" />
                      <Text style={styles.emptyTableText}>No ground operations tasks match this filter.</Text>
                    </View>
                  ) : (
                    groundTasks
                      .filter(t => groundStatusFilter === 'all' || t.status === groundStatusFilter)
                      .map(t => (
                        <View key={t.id} style={styles.tableDataRow}>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightPrimaryCode}>{t.taskNumber}</Text>
                            <Text style={styles.flightSecondaryCode}>
                              {t.flightNumber || 'No flight'} {t.isDemo ? '• DEMO' : ''}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flightMetricText}>{t.type.toUpperCase().replace(/_/g, ' ')}</Text>
                            {t.notes ? <Text style={styles.flightMetricSubText}>{t.notes}</Text> : null}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flightMetricText}>{t.assignedTo || 'Unassigned'}</Text>
                            <Text style={styles.flightMetricSubText}>Priority: {t.priority.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={[styles.flightStatusBadge, t.status === 'completed' ? styles.priorityNormal : styles.priorityUrgent]}>
                              <Text style={[styles.flightStatusBadgeText, t.status === 'completed' ? styles.textCyan : styles.textYellow]}>
                                {t.status.replace('_', ' ').toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightMetricSubText}>{new Date(t.updatedAtUtc).toLocaleString()}</Text>
                          </View>
                          <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                            {t.status === 'pending' && session ? (
                              <TouchableOpacity
                                style={styles.detailActionBtn}
                                onPress={() => updateGroundTaskStatus(session.token, t.id, 'in_progress')}
                              >
                                <Text style={styles.detailActionBtnText}>Start</Text>
                              </TouchableOpacity>
                            ) : null}
                            {t.status === 'in_progress' && session ? (
                              <TouchableOpacity
                                style={styles.detailActionBtn}
                                onPress={() => updateGroundTaskStatus(session.token, t.id, 'completed')}
                              >
                                <Text style={styles.detailActionBtnText}>Complete</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      ))
                  )}
                </View>
              </View>
            )}

            {/* 3. ANIMA'S MODULE: AIRPORT SCHEDULE BOARDS */}
            {activeTab === 'schedules' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Airport Terminal Schedule Boards {isLoadingSchedules ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Timetable arrivals and departures boards across global hubs.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {['JFK', 'DEL', 'BOM', 'LHR', 'DXB'].map(hub => (
                      <TouchableOpacity
                        key={hub}
                        style={[styles.filterPill, scheduleAirport === hub && styles.filterPillActive]}
                        onPress={() => {
                          setScheduleAirport(hub);
                          loadSchedules(hub);
                        }}
                      >
                        <Text style={[styles.filterPillText, scheduleAirport === hub && styles.filterPillTextActive]}>
                          {hub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Sub-toggle: Departures vs Arrivals */}
                <View style={[styles.filterPillsRow, { marginBottom: 16 }]}>
                  <TouchableOpacity
                    style={[styles.filterPill, scheduleTabType === 'departures' && styles.filterPillActive]}
                    onPress={() => setScheduleTabType('departures')}
                  >
                    <Text style={[styles.filterPillText, scheduleTabType === 'departures' && styles.filterPillTextActive]}>
                      DEPARTURES ({schedules.departures.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, scheduleTabType === 'arrivals' && styles.filterPillActive]}
                    onPress={() => setScheduleTabType('arrivals')}
                  >
                    <Text style={[styles.filterPillText, scheduleTabType === 'arrivals' && styles.filterPillTextActive]}>
                      ARRIVALS ({schedules.arrivals.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>FLIGHT / AIRLINE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>
                      {scheduleTabType === 'departures' ? 'DESTINATION' : 'ORIGIN'}
                    </Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>SCHEDULED</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>ESTIMATED</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>GATE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>STATUS</Text>
                  </View>

                  {(scheduleTabType === 'departures' ? schedules.departures : schedules.arrivals).map((item, idx) => (
                    <View key={item.id || item.flightNumber + idx} style={styles.tableDataRow}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.flightPrimaryCode}>{item.flightNumber}</Text>
                        <Text style={styles.flightSecondaryCode}>{item.airlineName}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.flightRouteText}>
                          {item.otherAirport?.iata || item.otherAirport?.name || '???'}
                        </Text>
                        <Text style={styles.flightSecondaryCode}>{item.otherAirport?.city || ''}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flightMetricText}>
                          {new Date(item.scheduledTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flightMetricText}>
                          {item.estimatedTimeUtc
                            ? new Date(item.estimatedTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'On Time'}
                        </Text>
                      </View>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.airlineHubText}>{item.gate || 'TBD'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={[styles.flightStatusBadge, item.delayMinutes > 0 && styles.priorityUrgent]}>
                          <Text style={[styles.flightStatusBadgeText, item.delayMinutes > 0 && styles.textRed]}>
                            {item.delayMinutes > 0 ? `+${item.delayMinutes}m DELAY` : item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 4. ANIMA'S MODULE: AIRFARE & PRICING ENGINE */}
            {activeTab === 'fares' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Unbundled Airfare & Pricing Engine {isLoadingFares ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Zero hidden fee transparent fare decomposition engine with live INR/USD currency conversion.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {(['INR', 'USD'] as const).map(curr => (
                      <TouchableOpacity
                        key={curr}
                        style={[styles.filterPill, fareCurrency === curr && styles.filterPillActive]}
                        onPress={() => setFareCurrency(curr)}
                      >
                        <Text style={[styles.filterPillText, fareCurrency === curr && styles.filterPillTextActive]}>
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>FLIGHT / ROUTE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>AIRLINE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>CLASS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>BASE FARE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>TAXES & FEES</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>TOTAL FARE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {fares.map((f, idx) => {
                    const isInr = fareCurrency === 'INR';
                    const base = isInr ? `₹${f.baseFareInr?.toLocaleString()}` : `$${f.baseFareUsd}`;
                    const taxes = isInr ? `₹${f.taxesAndAirportFeesInr?.toLocaleString()}` : `$${f.taxesAndAirportFeesUsd}`;
                    const total = isInr ? `₹${f.totalFareInr?.toLocaleString()}` : `$${f.totalFareUsd}`;

                    return (
                      <View key={f.id || f.flightNumber + idx} style={styles.tableDataRow}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.flightPrimaryCode}>{f.flightNumber}</Text>
                          <Text style={styles.flightRouteText}>{f.originIata} → {f.destinationIata}</Text>
                        </View>
                        <View style={{ flex: 1.2 }}>
                          <Text style={styles.flightPrimaryCode}>{f.airlineName}</Text>
                          <Text style={styles.flightSecondaryCode}>{f.availableSeats} Seats Left</Text>
                        </View>
                        <View style={{ flex: 0.8 }}>
                          <Text style={styles.tableCellText}>{f.travelClass}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.flightMetricText}>{base}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.flightMetricSubText}>{taxes}</Text>
                        </View>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.flightMetricText, { color: '#38EF7D', fontWeight: '800' }]}>{total}</Text>
                          <Text style={[styles.flightMetricSubText, { color: '#00F2FE' }]}>Guaranteed 0 Hidden</Text>
                        </View>
                        <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                          <TouchableOpacity
                            style={styles.detailActionBtn}
                            onPress={() => setSelectedFare(f)}
                          >
                            <Text style={styles.detailActionBtnText}>Breakdown</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 5. FLIGHT MANAGEMENT */}
            {activeTab === 'flights' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Flight Registry & Management</Text>
                    <Text style={styles.sectionSubtitle}>
                      Manage active flights, verify transponder telemetry, and inspect route status.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {(['all', 'live', 'demo'] as const).map(mode => (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.filterPill, flightFilter === mode && styles.filterPillActive]}
                        onPress={() => setFlightFilter(mode)}
                      >
                        <Text style={[styles.filterPillText, flightFilter === mode && styles.filterPillTextActive]}>
                          {mode.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarWrapper}>
                  <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search by flight number (e.g. AI101), callsign, departure or arrival IATA..."
                    placeholderTextColor="#475569"
                    value={flightSearch}
                    onChangeText={setFlightSearch}
                  />
                  {flightSearch !== '' && (
                    <TouchableOpacity onPress={() => setFlightSearch('')}>
                      <Ionicons name="close-circle" size={18} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>FLIGHT NO / CALLSIGN</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>ROUTE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>STATUS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>ALTITUDE / SPEED</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>DATA SOURCE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {filteredFlights.length === 0 ? (
                    <View style={styles.emptyTableState}>
                      <Ionicons name="airplane-outline" size={36} color="#475569" />
                      <Text style={styles.emptyTableText}>No matching flight telemetry records found.</Text>
                    </View>
                  ) : (
                    filteredFlights.slice(0, 30).map((f, idx) => {
                      const isLive = !f.isDemo;
                      return (
                        <View key={f.flightNumber || f.callsign || String(idx)} style={styles.tableDataRow}>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightPrimaryCode}>{f.flightNumber || 'UNKNOWN'}</Text>
                            <Text style={styles.flightSecondaryCode}>{f.callsign || f.registration || 'No Callsign'}</Text>
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <Text style={styles.flightRouteText}>
                              {f.origin?.iata || f.origin?.icao || '???'} → {f.destination?.iata || f.destination?.icao || '???'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={[styles.flightStatusBadge, f.onGround && styles.flightStatusOnGround]}>
                              <Text style={styles.flightStatusBadgeText}>
                                {f.onGround ? 'ON GROUND' : f.status ? f.status.toUpperCase() : 'AIRBORNE'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.flightMetricText}>
                              {f.altitudeFeet ? `${Math.round(f.altitudeFeet).toLocaleString()} ft` : 'Ground'}
                            </Text>
                            <Text style={styles.flightMetricSubText}>
                              {f.groundSpeedKnots ? `${Math.round(f.groundSpeedKnots)} kts` : '—'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={[styles.sourceBadge, isLive ? styles.sourceLive : styles.sourceDemo]}>
                              <Text style={[styles.sourceBadgeText, isLive ? styles.textCyan : styles.textYellow]}>
                                {isLive ? 'LIVE OPEN-SKY' : 'DEMO FLEET'}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              style={styles.detailActionBtn}
                              onPress={() => setSelectedFlight(f)}
                            >
                              <Text style={styles.detailActionBtnText}>Details</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* 6. AIRPORT REGISTRY */}
            {activeTab === 'airports' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Airport Master Registry {isLoadingAirports ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Official validated aerodrome registry with runway coordinates, timezones, and elevation.
                    </Text>
                  </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarWrapper}>
                  <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search airports by IATA (e.g. CCU), ICAO (e.g. VECC), city or airport name..."
                    placeholderTextColor="#475569"
                    value={airportSearch}
                    onChangeText={setAirportSearch}
                  />
                  {airportSearch !== '' && (
                    <TouchableOpacity onPress={() => setAirportSearch('')}>
                      <Ionicons name="close-circle" size={18} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>IATA / ICAO</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.8 }]}>AIRPORT NAME</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>MUNICIPALITY / COUNTRY</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>COORDINATES</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>TIMEZONE</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>ACTIONS</Text>
                  </View>

                  {filteredAirports.slice(0, 30).map(a => (
                    <View key={a.code} style={styles.tableDataRow}>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.airportCodeIata}>{a.code}</Text>
                        <Text style={styles.airportCodeIcao}>{a.icao || '—'}</Text>
                      </View>
                      <View style={{ flex: 1.8 }}>
                        <Text style={styles.airportNameText}>{a.name}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.airportCityText}>{a.city || '—'}</Text>
                        <Text style={styles.airportCountryText}>{a.country || '—'}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.airportCoordText}>
                          {a.latitude !== null && a.longitude !== null
                            ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`
                            : 'N/A'}
                        </Text>
                        <Text style={styles.airportElevText}>
                          {a.elevation ? `${a.elevation} ft MSL` : 'Elevation unlisted'}
                        </Text>
                      </View>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.airportTzText}>{a.timezone || 'UTC'}</Text>
                      </View>
                      <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                        <TouchableOpacity
                          style={styles.detailActionBtn}
                          onPress={() => setSelectedAirport(a)}
                        >
                          <Text style={styles.detailActionBtnText}>Inspect</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 7. AIRLINE REGISTRY */}
            {activeTab === 'airlines' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      AeroNexus Carrier Registry {isLoadingAirlines ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Operating commercial and cargo carriers derived from active flight schedules and routes.
                    </Text>
                  </View>
                </View>

                {/* Honest Banner */}
                <View style={styles.infoNoticeBanner}>
                  <Ionicons name="information-circle-outline" size={18} color="#00F2FE" />
                  <Text style={styles.infoNoticeText}>
                    Carriers shown below are actively operating flights within the AeroNexus registry. Full airline master database management is slated for post-branch merge.
                  </Text>
                </View>

                {/* Search */}
                <View style={styles.searchBarWrapper}>
                  <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchTextInput}
                    placeholder="Search airlines by code, name, country..."
                    placeholderTextColor="#475569"
                    value={airlineSearch}
                    onChangeText={setAirlineSearch}
                  />
                </View>

                {/* Table */}
                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>IATA / ICAO</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.6 }]}>AIRLINE NAME</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>COUNTRY OF REGISTRY</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>PRIMARY HUBS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>ACTIVE FLIGHTS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1 }]}>STATUS</Text>
                  </View>

                  {filteredAirlines.map(airline => (
                    <View key={airline.code} style={styles.tableDataRow}>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.airportCodeIata}>{airline.code}</Text>
                        <Text style={styles.airportCodeIcao}>{airline.icao}</Text>
                      </View>
                      <View style={{ flex: 1.6 }}>
                        <Text style={styles.airlineNameText}>{airline.name}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.airlineCountryText}>{airline.country}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.airlineHubText}>{airline.hub}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.airlineFlightsCount}>{airline.activeFlightsCount} Routes</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeOnline}>
                          <Text style={[styles.statusBadgeMiniText, styles.textGreen]}>ACTIVE</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 8. LIVE FLIGHT MONITORING (RADAR FEED) */}
            {activeTab === 'live-monitoring' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Live ADS-B Radar Feeds</Text>
                    <Text style={styles.sectionSubtitle}>
                      Raw transponder packets received from OpenSky Network and simulated test fleet.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => fetchFlights()}
                  >
                    <Ionicons name="refresh" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>Refresh ADS-B Transponders</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.radarTelemetryGrid}>
                  {aircraftList.slice(0, 8).map((ac, idx) => (
                    <View key={ac.flightNumber || ac.callsign || String(idx)} style={styles.radarTelemetryCard}>
                      <View style={styles.radarCardTop}>
                        <View>
                          <Text style={styles.radarCardCallsign}>{ac.flightNumber || ac.callsign || 'UNKNOWN'}</Text>
                          <Text style={styles.radarCardSub}>TAIL: {ac.registration || 'UNLISTED'}</Text>
                        </View>
                        <View style={[styles.sourceBadge, !ac.isDemo ? styles.sourceLive : styles.sourceDemo]}>
                          <Text style={[styles.sourceBadgeText, !ac.isDemo ? styles.textCyan : styles.textYellow]}>
                            {!ac.isDemo ? 'LIVE ADS-B' : 'DEMO'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.radarCardMetrics}>
                        <View style={styles.radarMetricCol}>
                          <Text style={styles.radarMetricLabel}>ALTITUDE</Text>
                          <Text style={styles.radarMetricVal}>
                            {ac.altitudeFeet ? `${Math.round(ac.altitudeFeet).toLocaleString()} ft` : 'Ground'}
                          </Text>
                        </View>
                        <View style={styles.radarMetricCol}>
                          <Text style={styles.radarMetricLabel}>SPEED</Text>
                          <Text style={styles.radarMetricVal}>
                            {ac.groundSpeedKnots ? `${Math.round(ac.groundSpeedKnots)} kts` : '—'}
                          </Text>
                        </View>
                        <View style={styles.radarMetricCol}>
                          <Text style={styles.radarMetricLabel}>HEADING</Text>
                          <Text style={styles.radarMetricVal}>
                            {ac.headingDegrees !== null ? `${Math.round(ac.headingDegrees)}°` : '—'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.radarCardFooter}>
                        <Text style={styles.radarCoordText}>
                          {ac.latitude !== null && ac.longitude !== null
                            ? `Lat: ${ac.latitude.toFixed(3)} • Lon: ${ac.longitude.toFixed(3)}`
                            : 'Coordinates unlisted'}
                        </Text>
                        <Text style={styles.radarAgeText}>
                          {ac.onGround ? 'Surface' : 'En Route'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 9. WEATHER TELEMETRY */}
            {activeTab === 'weather' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Aviation Weather Telemetry (METAR)</Text>
                    <Text style={styles.sectionSubtitle}>
                      Live meteorological surface observations queried directly from Open-Meteo.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={loadWeather}
                    disabled={isLoadingWeather}
                  >
                    <Ionicons name="refresh" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>
                      {isLoadingWeather ? 'Querying Open-Meteo...' : 'Update Observations'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Disclaimer Strip */}
                <View style={styles.infoNoticeBanner}>
                  <Ionicons name="warning-outline" size={18} color="#FFB703" />
                  <Text style={styles.infoNoticeText}>
                    Aviation Weather Disclaimer: Meteorological data from Open-Meteo is provided for situational awareness and operational planning. Not certified for flight dispatch or sole navigation.
                  </Text>
                </View>

                <View style={styles.weatherCardsGrid}>
                  {hubWeatherList.map(w => {
                    const temp = w.weather?.temperatureC;
                    const wind = w.weather?.windSpeedKnots;
                    const condition = w.weather?.condition || 'Clear Sky';
                    return (
                      <View key={w.airport?.code || w.coordinates.latitude} style={styles.weatherCard}>
                        <View style={styles.weatherCardHeader}>
                          <View>
                            <Text style={styles.weatherAirportCode}>{w.airport?.code || 'HUB'}</Text>
                            <Text style={styles.weatherAirportName}>{w.airport?.name || 'Aviation Hub'}</Text>
                          </View>
                          <View style={styles.weatherConditionPill}>
                            <Text style={styles.weatherConditionText}>{condition}</Text>
                          </View>
                        </View>

                        <View style={styles.weatherMetricsRow}>
                          <View style={styles.weatherMetricBox}>
                            <Text style={styles.weatherMetricValue}>
                              {temp !== null && temp !== undefined ? `${temp}°C` : 'N/A'}
                            </Text>
                            <Text style={styles.weatherMetricSub}>TEMPERATURE</Text>
                          </View>
                          <View style={styles.weatherMetricBox}>
                            <Text style={styles.weatherMetricValue}>
                              {wind !== null && wind !== undefined ? `${wind} kts` : 'N/A'}
                            </Text>
                            <Text style={styles.weatherMetricSub}>WIND SPEED</Text>
                          </View>
                          <View style={styles.weatherMetricBox}>
                            <Text style={styles.weatherMetricValue}>
                              {w.weather?.windDirectionDeg !== null ? `${w.weather.windDirectionDeg}°` : 'VAR'}
                            </Text>
                            <Text style={styles.weatherMetricSub}>BEARING</Text>
                          </View>
                        </View>

                        <View style={styles.weatherFooter}>
                          <Text style={styles.weatherSourceText}>
                            Source: Open-Meteo Public API • Elevation: {w.coordinates.elevation || 0}m
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 10. API & PROVIDER HEALTH */}
            {activeTab === 'integrations' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>API Provider Health Matrix</Text>
                    <Text style={styles.sectionSubtitle}>
                      Real connection status, latency benchmarks, and error diagnostics for all 5 integrations.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => loadIntegrations(session.token, true)}
                    disabled={isCheckingIntegrations}
                  >
                    <Ionicons name="pulse" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>
                      {isCheckingIntegrations ? 'Probing Integrations...' : 'Dispatch Live Probes'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Provider Detail Cards */}
                <View style={styles.providerGrid}>
                  {integrations.map(provider => {
                    const isOnline = provider.status === 'connected';
                    const isUnconfigured = provider.status === 'not_configured';

                    return (
                      <View key={provider.id} style={styles.providerCard}>
                        <View style={styles.providerHeader}>
                          <View style={styles.providerHeaderLeft}>
                            <Text style={styles.providerTitle}>{provider.name}</Text>
                            <Text style={styles.providerPurpose}>{provider.purpose}</Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              isOnline
                                ? styles.badgeOnline
                                : isUnconfigured
                                ? styles.badgeUnconfigured
                                : styles.badgeOffline,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isOnline
                                  ? styles.textGreen
                                  : isUnconfigured
                                  ? styles.textYellow
                                  : styles.textRed,
                              ]}
                            >
                              {isOnline
                                ? 'ONLINE (CONNECTED)'
                                : isUnconfigured
                                ? 'NOT CONFIGURED'
                                : 'UNAVAILABLE / OFFLINE'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.providerDetailsBox}>
                          <View style={styles.providerDetailRow}>
                            <Text style={styles.providerDetailKey}>Check Probe:</Text>
                            <Text style={styles.providerDetailVal}>{provider.checkMethod}</Text>
                          </View>
                          <View style={styles.providerDetailRow}>
                            <Text style={styles.providerDetailKey}>Response Latency:</Text>
                            <Text style={styles.providerDetailVal}>
                              {provider.latencyMs !== null ? `${provider.latencyMs} ms` : 'N/A'}
                            </Text>
                          </View>
                          <View style={styles.providerDetailRow}>
                            <Text style={styles.providerDetailKey}>HTTP Status:</Text>
                            <Text style={styles.providerDetailVal}>
                              {provider.httpStatus !== null ? `HTTP ${provider.httpStatus}` : 'N/A'}
                            </Text>
                          </View>
                          <View style={styles.providerDetailRow}>
                            <Text style={styles.providerDetailKey}>Requires Key:</Text>
                            <Text style={styles.providerDetailVal}>
                              {provider.requiresKey ? 'Yes (Credentials required)' : 'No (Free Public API)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.providerDetailFooter}>
                          <Text style={styles.providerDetailText}>{provider.detail}</Text>
                          {provider.checkedAt && (
                            <Text style={styles.providerCheckedAt}>
                              Last checked: {new Date(provider.checkedAt).toLocaleTimeString()}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 11. API USAGE & RATE LIMITS */}
            {activeTab === 'quotas' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>API Usage & Rate Limit Quotas</Text>
                    <Text style={styles.sectionSubtitle}>
                      Documented provider quotas and request throttling parameters.
                    </Text>
                  </View>
                </View>

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>PROVIDER</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>TIER</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>RATE LIMIT POLICY</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.5 }]}>CURRENT QUOTA REPORT</Text>
                  </View>

                  <View style={styles.tableDataRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.flightPrimaryCode}>Open-Meteo</Text>
                      <Text style={styles.flightSecondaryCode}>Weather Telemetry</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.tableCellText}>Free Non-Commercial</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.tableCellText}>10,000 requests/day</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.quotaAvailableText}>Available (No key required)</Text>
                    </View>
                  </View>

                  <View style={styles.tableDataRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.flightPrimaryCode}>OpenSky Network</Text>
                      <Text style={styles.flightSecondaryCode}>ADS-B Transponder Stream</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.tableCellText}>Anonymous Public Tier</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.tableCellText}>1 request every 10 seconds</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.quotaAvailableText}>Active (Enforced by backend cache)</Text>
                    </View>
                  </View>

                  <View style={styles.tableDataRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.flightPrimaryCode}>FreeAirportDB</Text>
                      <Text style={styles.flightSecondaryCode}>Airports Master Data</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.tableCellText}>Free Public Search</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.tableCellText}>Fair-use policy</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.quotaAvailableText}>Cached locally in memory</Text>
                    </View>
                  </View>

                  <View style={styles.tableDataRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.flightPrimaryCode}>Amadeus Flight Offers</Text>
                      <Text style={styles.flightSecondaryCode}>Commercial Fares</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.tableCellText}>Self-Service Test Tier</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.tableCellText}>2,000 calls / month</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.quotaUnavailableText}>Quota information unavailable (Key unconfigured)</Text>
                    </View>
                  </View>

                  <View style={styles.tableDataRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.flightPrimaryCode}>FlightAware AeroAPI</Text>
                      <Text style={styles.flightSecondaryCode}>Commercial Schedule Feeds</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.tableCellText}>Developer Tier</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.tableCellText}>Pay-per-query tier</Text>
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.quotaUnavailableText}>Quota information unavailable (Key unconfigured)</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 12. USER MANAGEMENT */}
            {activeTab === 'users' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>User & Staff Access Control</Text>
                    <Text style={styles.sectionSubtitle}>
                      Administrator session and registered end-users read from the MySQL users table.
                    </Text>
                  </View>
                </View>

                {/* Current Active Superadmin Card */}
                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Active Administrator Session</Text>
                  <View style={styles.userTable}>
                    <View style={styles.userTableRow}>
                      <Text style={styles.userKey}>User ID:</Text>
                      <Text style={styles.userVal}>usr_admin_01</Text>
                    </View>
                    <View style={styles.userTableRow}>
                      <Text style={styles.userKey}>Username:</Text>
                      <Text style={styles.userVal}>{session.username}</Text>
                    </View>
                    <View style={styles.userTableRow}>
                      <Text style={styles.userKey}>Assigned Role:</Text>
                      <View style={styles.badgeOnline}>
                        <Text style={[styles.statusBadgeMiniText, styles.textGreen]}>SUPERADMIN</Text>
                      </View>
                    </View>
                    <View style={styles.userTableRow}>
                      <Text style={styles.userKey}>Token Expiry:</Text>
                      <Text style={styles.userVal}>{new Date(session.expiresAt).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>

                {/* Registered End-Users (MySQL users table from feature/dashboard schema) */}
                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Registered End-Users</Text>
                  {userDiagnostics?.endUsers?.available ? (
                    <View>
                      <Text style={styles.sectionSubtitle}>
                        Source: {userDiagnostics.endUsers.source} • Total: {userDiagnostics.endUsers.total}
                        {userDiagnostics.endUsers.roleBreakdown
                          ? ' • ' +
                            Object.entries(userDiagnostics.endUsers.roleBreakdown as Record<string, number>)
                              .map(([role, n]) => `${role}: ${n}`)
                              .join(', ')
                          : ''}
                      </Text>
                      <View style={styles.tableHeaderRow}>
                        <Text style={[styles.tableHeadCell, { flex: 1 }]}>USERNAME</Text>
                        <Text style={[styles.tableHeadCell, { flex: 1.4 }]}>EMAIL</Text>
                        <Text style={[styles.tableHeadCell, { flex: 1 }]}>FULL NAME</Text>
                        <Text style={[styles.tableHeadCell, { flex: 0.7 }]}>ROLE</Text>
                        <Text style={[styles.tableHeadCell, { flex: 1 }]}>REGISTERED</Text>
                      </View>
                      {(userDiagnostics.endUsers.records as any[]).length === 0 ? (
                        <Text style={styles.emptyTableText}>No registered users in the users table yet.</Text>
                      ) : (
                        (userDiagnostics.endUsers.records as any[]).map(u => (
                          <View key={u.id} style={styles.tableDataRow}>
                            <Text style={[styles.flightMetricText, { flex: 1 }]}>{u.username}</Text>
                            <Text style={[styles.flightMetricText, { flex: 1.4 }]}>{u.email}</Text>
                            <Text style={[styles.flightMetricText, { flex: 1 }]}>{u.fullName}</Text>
                            <Text style={[styles.flightMetricText, { flex: 0.7 }]}>{String(u.role).toUpperCase()}</Text>
                            <Text style={[styles.flightMetricSubText, { flex: 1 }]}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleString() : 'UNKNOWN'}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  ) : (
                    <View>
                      <Text style={[styles.userVal, { color: '#FFB703' }]}>UNAVAILABLE</Text>
                      <Text style={styles.sectionSubtitle}>
                        {userDiagnostics?.endUsers?.reason || 'End-user data has not been loaded.'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 13. NOTICE MANAGEMENT */}
            {activeTab === 'notices' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Flight Operations Notices (NOTAMs) {isLoadingNotices ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Publish, update, or remove live advisories displayed on the mobile Radar notice carousel.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.primaryActionButton} onPress={openNoticeCreateModal}>
                    <Ionicons name="add" size={18} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>Create Air-Ops Notice</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.noticesGrid}>
                  {notices.map(notice => {
                    const isUrgent = notice.priority === 'urgent';
                    const isHigh = notice.priority === 'high';

                    return (
                      <View key={notice.id} style={styles.noticeCard}>
                        <View style={styles.noticeCardHeader}>
                          <View style={styles.noticeCategoryBadge}>
                            <Text style={styles.noticeCategoryText}>{notice.category}</Text>
                          </View>
                          <View style={styles.noticeHeaderRight}>
                            <View
                              style={[
                                styles.noticePriorityBadge,
                                isUrgent
                                  ? styles.priorityUrgent
                                  : isHigh
                                  ? styles.priorityHigh
                                  : styles.priorityNormal,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.noticePriorityText,
                                  isUrgent ? styles.textRed : isHigh ? styles.textYellow : styles.textCyan,
                                ]}
                              >
                                {(notice.priority || 'NORMAL').toUpperCase()}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={[styles.toggleActiveBtn, notice.active && styles.toggleActiveBtnOn]}
                              onPress={() => handleToggleNoticeActive(notice)}
                            >
                              <Text style={styles.toggleActiveBtnText}>
                                {notice.active ? 'ACTIVE' : 'INACTIVE'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={styles.noticeCardTitle}>{notice.title}</Text>
                        <Text style={styles.noticeCardMessage}>{notice.message}</Text>

                        <View style={styles.noticeCardFooter}>
                          <Text style={styles.noticeTimeText}>
                            {notice.updatedAt ? new Date(notice.updatedAt).toLocaleTimeString() : 'Published'}
                          </Text>
                          <View style={styles.noticeActionsRow}>
                            <TouchableOpacity
                              style={styles.noticeEditBtn}
                              onPress={() => openNoticeEditModal(notice)}
                            >
                              <Ionicons name="create-outline" size={15} color="#00F2FE" />
                              <Text style={styles.noticeEditBtnText}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.noticeDeleteBtn}
                              onPress={() => handleDeleteNotice(notice.id)}
                            >
                              <Ionicons name="trash-outline" size={15} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 14. SYSTEM LOGS */}
            {activeTab === 'logs' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Real-time Backend System Logs {isLoadingLogs ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Unfabricated server operational logs captured in the Express event stream.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {['ALL', 'INFO', 'WARN', 'ERROR'].map(lvl => (
                      <TouchableOpacity
                        key={lvl}
                        style={[styles.filterPill, logLevelFilter === lvl && styles.filterPillActive]}
                        onPress={() => setLogLevelFilter(lvl)}
                      >
                        <Text style={[styles.filterPillText, logLevelFilter === lvl && styles.filterPillTextActive]}>
                          {lvl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.terminalContainer}>
                  <View style={styles.terminalHeader}>
                    <View style={styles.terminalDotRed} />
                    <View style={styles.terminalDotYellow} />
                    <View style={styles.terminalDotGreen} />
                    <Text style={styles.terminalTitle}>kernel.aeronexus.log — live stream</Text>
                  </View>
                  <ScrollView style={styles.terminalBody}>
                    {filteredLogs.map(log => {
                      const isErr = log.level === 'error';
                      const isWarn = log.level === 'warn';
                      return (
                        <View key={log.id} style={styles.terminalLine}>
                          <Text style={styles.terminalTimestamp}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </Text>
                          <Text
                            style={[
                              styles.terminalLevel,
                              isErr ? styles.textRed : isWarn ? styles.textYellow : styles.textCyan,
                            ]}
                          >
                            [{log.level.toUpperCase()}]
                          </Text>
                          <Text style={styles.terminalSource}>[{log.source}]</Text>
                          <Text style={styles.terminalMessage}>{log.message}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 15. AUDIT TRAIL */}
            {activeTab === 'audit' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Immutable Administrator Audit Trail {isLoadingAudit ? '•' : ''}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Persistent record of all configuration changes, logins, and operational notices.
                    </Text>
                  </View>
                  <View style={styles.filterPillsRow}>
                    {['ALL', 'AUTH', 'NOTICE', 'CONFIGURATION', 'INTEGRATION'].map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.filterPill, auditFilterCategory === cat && styles.filterPillActive]}
                        onPress={() => setAuditFilterCategory(cat)}
                      >
                        <Text style={[styles.filterPillText, auditFilterCategory === cat && styles.filterPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.tableCard}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>TIMESTAMP</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>ACTOR</Text>
                    <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>ACTION</Text>
                    <Text style={[styles.tableHeadCell, { flex: 2 }]}>DETAILS</Text>
                    <Text style={[styles.tableHeadCell, { flex: 0.8 }]}>STATUS</Text>
                  </View>

                  {filteredAudit.map(evt => (
                    <View key={evt.id} style={styles.tableDataRow}>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.tableCellText}>{new Date(evt.timestamp).toLocaleString()}</Text>
                      </View>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.flightPrimaryCode}>{evt.actor}</Text>
                      </View>
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.auditActionBadge}>{evt.action}</Text>
                      </View>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.tableCellText}>{evt.details}</Text>
                      </View>
                      <View style={{ flex: 0.8 }}>
                        <Text
                          style={[
                            styles.statusBadgeMiniText,
                            evt.status === 'SUCCESS' ? styles.textGreen : styles.textRed,
                          ]}
                        >
                          {evt.status}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 16. DATABASE MONITORING */}
            {activeTab === 'database' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Database Connectivity Diagnostics</Text>
                    <Text style={styles.sectionSubtitle}>
                      Real-time MySQL 8.0 pool monitoring and in-memory persistence health.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() => loadDatabase(session.token)}
                    disabled={isLoadingDb}
                  >
                    <Ionicons name="refresh" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>Probe Database</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Storage Subsystem State</Text>
                  <View style={styles.dbDetailsGrid}>
                    <View style={styles.dbDetailItem}>
                      <Text style={styles.dbKey}>Connection State:</Text>
                      <Text
                        style={[
                          styles.dbVal,
                          dbDiagnostics?.connected ? styles.textGreen : styles.textYellow,
                        ]}
                      >
                        {dbDiagnostics?.connected ? 'CONNECTED (MySQL 8.0)' : 'STANDALONE DEMO FALLBACK'}
                      </Text>
                    </View>
                    <View style={styles.dbDetailItem}>
                      <Text style={styles.dbKey}>Pool Driver:</Text>
                      <Text style={styles.dbVal}>mysql2/promise</Text>
                    </View>
                    <View style={styles.dbDetailItem}>
                      <Text style={styles.dbKey}>Query Latency:</Text>
                      <Text style={styles.dbVal}>
                        {dbDiagnostics?.queryLatencyMs !== null
                          ? `${dbDiagnostics?.queryLatencyMs} ms`
                          : 'N/A (Graceful fallback active)'}
                      </Text>
                    </View>
                    <View style={styles.dbDetailItem}>
                      <Text style={styles.dbKey}>Diagnosis Message:</Text>
                      <Text style={styles.dbVal}>{dbDiagnostics?.message || 'Inspecting...'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* 17. CONFIGURATION */}
            {activeTab === 'config' && systemConfig && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>System Configuration Control</Text>
                    <Text style={styles.sectionSubtitle}>
                      Fine-tune provider polling intervals, cache timeouts, and quiet hours.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={handleSaveConfig}
                    disabled={configSaving}
                  >
                    <Ionicons name="save" size={16} color="#0B132B" />
                    <Text style={styles.primaryActionButtonText}>
                      {configSaving ? 'Saving...' : 'Save Configuration'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {configSaveMsg && (
                  <View style={styles.infoNoticeBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#38EF7D" />
                    <Text style={styles.infoNoticeText}>{configSaveMsg}</Text>
                  </View>
                )}

                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Engine Performance Settings</Text>

                  <View style={styles.configFieldRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.configLabel}>Polling Interval (seconds)</Text>
                      <Text style={styles.configSubLabel}>Controls background transponder ping frequency (5s - 600s)</Text>
                    </View>
                    <TextInput
                      style={styles.configInput}
                      keyboardType="numeric"
                      value={String(systemConfig.pollingIntervalSeconds)}
                      onChangeText={val =>
                        setSystemConfig({ ...systemConfig, pollingIntervalSeconds: parseInt(val, 10) || 30 })
                      }
                    />
                  </View>

                  <View style={styles.configFieldRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.configLabel}>Cache TTL (seconds)</Text>
                      <Text style={styles.configSubLabel}>Memory caching duration for weather & airport queries</Text>
                    </View>
                    <TextInput
                      style={styles.configInput}
                      keyboardType="numeric"
                      value={String(systemConfig.cacheTtlSeconds)}
                      onChangeText={val =>
                        setSystemConfig({ ...systemConfig, cacheTtlSeconds: parseInt(val, 10) || 300 })
                      }
                    />
                  </View>

                  <View style={styles.configFieldRow}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.configLabel}>Latency Warning Threshold (ms)</Text>
                      <Text style={styles.configSubLabel}>Flags provider responses exceeding this duration as DEGRADED</Text>
                    </View>
                    <TextInput
                      style={styles.configInput}
                      keyboardType="numeric"
                      value={String(systemConfig.alertThresholds?.latencyWarningMs || 1500)}
                      onChangeText={val =>
                        setSystemConfig({
                          ...systemConfig,
                          alertThresholds: {
                            ...systemConfig.alertThresholds,
                            latencyWarningMs: parseInt(val, 10) || 1500,
                          },
                        })
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 18. ADMIN SETTINGS & SECURITY POSTURE */}
            {activeTab === 'settings' && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Security Posture & Admin Settings</Text>
                    <Text style={styles.sectionSubtitle}>
                      Security boundaries, credentials hygiene, and environment configuration.
                    </Text>
                  </View>
                </View>

                <View style={styles.panelCard}>
                  <Text style={styles.panelTitle}>Authentication & Cryptographic Posture</Text>
                  <View style={styles.postureGrid}>
                    <View style={styles.postureItem}>
                      <Ionicons name="shield-checkmark" size={24} color="#38EF7D" />
                      <Text style={styles.postureLabel}>Password Hashing</Text>
                      <Text style={styles.postureValue}>scrypt with random salt</Text>
                    </View>
                    <View style={styles.postureItem}>
                      <Ionicons name="key" size={24} color="#00F2FE" />
                      <Text style={styles.postureLabel}>Token Protocol</Text>
                      <Text style={styles.postureValue}>HMAC-SHA256 Signed Bearer</Text>
                    </View>
                    <View style={styles.postureItem}>
                      <Ionicons name="lock-closed" size={24} color="#FFB703" />
                      <Text style={styles.postureLabel}>Brute Force Guard</Text>
                      <Text style={styles.postureValue}>5 failed attempts = 15m lockout</Text>
                    </View>
                    <View style={styles.postureItem}>
                      <Ionicons name="timer" size={24} color="#3A86FF" />
                      <Text style={styles.postureLabel}>Session Lifetime</Text>
                      <Text style={styles.postureValue}>24 Hours strictly verified</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Notice Create/Edit Modal */}
      <Modal visible={noticeModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNotice ? 'Edit Air-Ops Notice' : 'Publish Air-Ops Notice'}
              </Text>
              <TouchableOpacity onPress={() => setNoticeModalVisible(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryPillsRow}>
                {['SAFETY ADVISORY', 'WEATHER ALERT', 'AIRSPACE NOTICE', 'MAINTENANCE'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryPill, noticeFormCategory === cat && styles.categoryPillActive]}
                    onPress={() => setNoticeFormCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        noticeFormCategory === cat && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>PRIORITY</Text>
              <View style={styles.priorityPillsRow}>
                {(['normal', 'high', 'urgent'] as const).map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityPill, noticeFormPriority === p && styles.priorityPillActive]}
                    onPress={() => setNoticeFormPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityPillText,
                        noticeFormPriority === p && styles.priorityPillTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>HEADLINE TITLE</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Heavy Crosswind Operations at BOM Runway 27"
                placeholderTextColor="#475569"
                value={noticeFormTitle}
                onChangeText={setNoticeFormTitle}
              />

              <Text style={styles.inputLabel}>DETAILED ADVISORY MESSAGE</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
                numberOfLines={4}
                placeholder="Enter full advisory text that will appear in mobile radar screen notices..."
                placeholderTextColor="#475569"
                value={noticeFormMessage}
                onChangeText={setNoticeFormMessage}
              />

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setNoticeModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveNotice}>
                  <Text style={styles.modalSubmitBtnText}>
                    {editingNotice ? 'Update Notice' : 'Publish to Radar Carousel'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Flight Detail Modal */}
      <Modal visible={Boolean(selectedFlight)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Flight Telemetry Inspector</Text>
              <TouchableOpacity onPress={() => setSelectedFlight(null)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedFlight && (
              <View style={styles.modalBody}>
                <View style={styles.flightDetailHeader}>
                  <Text style={styles.flightDetailNum}>{selectedFlight.flightNumber || 'UNKNOWN'}</Text>
                  <Text style={styles.flightDetailCallsign}>{selectedFlight.callsign}</Text>
                </View>
                <View style={styles.flightDetailGrid}>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Tail / Registration</Text>
                    <Text style={styles.flightDetailVal}>{selectedFlight.registration || 'N/A'}</Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Route</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFlight.origin?.iata || selectedFlight.origin?.icao || '???'} → {selectedFlight.destination?.iata || selectedFlight.destination?.icao || '???'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Coordinates</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFlight.latitude !== null && selectedFlight.longitude !== null
                        ? `${selectedFlight.latitude.toFixed(4)}, ${selectedFlight.longitude.toFixed(4)}`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Altitude</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFlight.altitudeFeet ? `${Math.round(selectedFlight.altitudeFeet)} ft` : 'Ground'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Airspeed</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFlight.groundSpeedKnots ? `${Math.round(selectedFlight.groundSpeedKnots)} kts` : '—'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Heading</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFlight.headingDegrees !== null ? `${Math.round(selectedFlight.headingDegrees)}°` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Airport Detail Modal */}
      <Modal visible={Boolean(selectedAirport)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Airport Master Aerodrome Inspector</Text>
              <TouchableOpacity onPress={() => setSelectedAirport(null)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedAirport && (
              <View style={styles.modalBody}>
                <View style={styles.flightDetailHeader}>
                  <Text style={styles.flightDetailNum}>{selectedAirport.code}</Text>
                  <Text style={styles.flightDetailCallsign}>{selectedAirport.name}</Text>
                </View>
                <View style={styles.flightDetailGrid}>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>ICAO Identifier</Text>
                    <Text style={styles.flightDetailVal}>{selectedAirport.icao || 'N/A'}</Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Municipality & Country</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedAirport.city}, {selectedAirport.country}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Runway Coordinates</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedAirport.latitude !== null && selectedAirport.longitude !== null
                        ? `${selectedAirport.latitude.toFixed(4)}, ${selectedAirport.longitude.toFixed(4)}`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Field Elevation</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedAirport.elevation ? `${selectedAirport.elevation} ft MSL` : 'Unlisted'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Local Timezone</Text>
                    <Text style={styles.flightDetailVal}>{selectedAirport.timezone || 'UTC'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ANIMA'S MODULE: Disruption Case Detail Modal */}
      <Modal visible={Boolean(selectedDisruption)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>OCC Disruption Case Analysis</Text>
              <TouchableOpacity onPress={() => setSelectedDisruption(null)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedDisruption && (
              <View style={styles.modalBody}>
                <View style={styles.flightDetailHeader}>
                  <Text style={styles.flightDetailNum}>{selectedDisruption.caseNumber}</Text>
                  <Text style={styles.flightDetailCallsign}>
                    {selectedDisruption.flightNumber} • {selectedDisruption.route}
                  </Text>
                </View>
                <View style={styles.flightDetailGrid}>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Incident Classification</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedDisruption.incidentType.toUpperCase().replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Severity Rating</Text>
                    <Text style={[styles.flightDetailVal, { color: '#EF4444' }]}>
                      {selectedDisruption.severity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Impacted Passengers</Text>
                    <Text style={styles.flightDetailVal}>{selectedDisruption.impactedPassengers} Pax</Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Reported By</Text>
                    <Text style={styles.flightDetailVal}>{(selectedDisruption as any).reportedBy || 'OCC Controller'}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 16 }}>
                  <Text style={styles.inputLabel}>OPERATIONAL SUMMARY</Text>
                  <Text style={[styles.tableCellText, { color: '#F8FAFC', marginBottom: 12 }]}>
                    {(selectedDisruption as any).summary || 'No summary text logged.'}
                  </Text>

                  <Text style={styles.inputLabel}>MITIGATION ACTION PLAN</Text>
                  <Text style={[styles.tableCellText, { color: '#00F2FE' }]}>
                    {(selectedDisruption as any).actionPlan || 'Under investigation.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ANIMA'S MODULE: Fare Breakdown Modal */}
      <Modal visible={Boolean(selectedFare)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unbundled Airfare Cost Decomposition</Text>
              <TouchableOpacity onPress={() => setSelectedFare(null)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {selectedFare && (
              <View style={styles.modalBody}>
                <View style={styles.flightDetailHeader}>
                  <Text style={styles.flightDetailNum}>{selectedFare.flightNumber}</Text>
                  <Text style={styles.flightDetailCallsign}>
                    {selectedFare.originIata} → {selectedFare.destinationIata} • {selectedFare.airlineName}
                  </Text>
                </View>

                <View style={styles.flightDetailGrid}>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Base Airfare (INR / USD)</Text>
                    <Text style={styles.flightDetailVal}>
                      ₹{selectedFare.baseFareInr?.toLocaleString()} / ${selectedFare.baseFareUsd}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Taxes & Mandatory Airport Fees</Text>
                    <Text style={styles.flightDetailVal}>
                      ₹{selectedFare.taxesAndAirportFeesInr?.toLocaleString()} / ${selectedFare.taxesAndAirportFeesUsd}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Total Guaranteed Checkout Fare</Text>
                    <Text style={[styles.flightDetailVal, { color: '#38EF7D', fontWeight: '900' }]}>
                      ₹{selectedFare.totalFareInr?.toLocaleString()} / ${selectedFare.totalFareUsd}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Cabin Baggage Rule</Text>
                    <Text style={styles.flightDetailVal}>
                      {selectedFare.baggage?.cabinBagIncluded ? 'Included in fare' : 'Fee applies'}
                    </Text>
                  </View>
                  <View style={styles.flightDetailItem}>
                    <Text style={styles.flightDetailLabel}>Cancellation Policy</Text>
                    <Text style={styles.flightDetailVal}>{selectedFare.cancellationPolicy}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// Premium Dark Aviation Styles
// ----------------------------------------------------
const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#060B18',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#060B18',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginBackdropGlow: {
    position: 'absolute',
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: 'rgba(0, 242, 254, 0.04)',
  },
  loginCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0B132B',
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  radarLogoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    marginBottom: 16,
  },
  loginBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  loginSecureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 239, 125, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 239, 125, 0.25)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38EF7D',
  },
  loginSecureText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38EF7D',
    letterSpacing: 1,
  },
  loginErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  loginErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#FCA5A5',
  },
  loginForm: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00F2FE',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#0B132B',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
  returnMobileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
  },
  returnMobileText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  loginFooter: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 16,
    alignItems: 'center',
  },
  loginFooterText: {
    color: '#64748B',
    fontSize: 12,
  },
  loginFooterNote: {
    color: '#475569',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  codeText: {
    color: '#00F2FE',
    fontFamily: 'monospace',
  },

  // Top Bar
  topBar: {
    height: 58,
    backgroundColor: '#0B132B',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileHamburger: {
    padding: 6,
  },
  topLogoCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topRadarIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  topBrand: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1.5,
  },
  topDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#334155',
  },
  topBreadcrumb: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F2FE',
    letterSpacing: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveServerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 239, 125, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 239, 125, 0.25)',
  },
  pulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38EF7D',
  },
  liveServerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38EF7D',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  refreshText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  backToAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  backToAppText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F2FE',
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00F2FE',
  },
  userNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  userRoleText: {
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // Body Layout
  bodyWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#091024',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
  },
  mobileSidebarDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  sidebarScroll: {
    paddingVertical: 16,
  },
  sidebarSectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
  },
  navItemLogout: {
    marginTop: 12,
  },
  navLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#00F2FE',
    fontWeight: '700',
  },
  navLabelLogout: {
    color: '#EF4444',
  },
  activePillIndicator: {
    marginLeft: 'auto',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F2FE',
  },
  animaBadgePill: {
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.3)',
    marginLeft: 'auto',
  },
  animaBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB703',
  },
  sidebarMetaBox: {
    marginTop: 32,
    padding: 16,
    marginHorizontal: 12,
    backgroundColor: '#0F1E3D',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sidebarMetaTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  sidebarMetaSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // Main Stage
  mainStage: {
    flex: 1,
    backgroundColor: '#060B18',
  },
  mainStageScroll: {
    padding: 24,
  },
  sectionContainer: {
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  branchBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 183, 3, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  branchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB703',
    letterSpacing: 0.5,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00F2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B132B',
    letterSpacing: 0.5,
  },

  // Stat Grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  statCardLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  statCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  statCardFooterText: {
    fontSize: 11,
    color: '#64748B',
  },
  dotCyan: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00F2FE' },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38EF7D' },
  dotBlue: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A86FF' },
  dotYellow: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFB703' },

  // Multi-Branch Banner
  branchIntegrationCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#0F1E3D',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    marginBottom: 24,
  },
  branchCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchCardTextWrap: {
    flex: 1,
  },
  branchCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  branchCardBody: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 20,
  },
  branchPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  branchPill: {
    backgroundColor: '#091024',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  branchPillLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  branchPillStatus: {
    fontSize: 12,
    color: '#F8FAFC',
    marginTop: 2,
  },

  // Panels
  panelCard: {
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  panelSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  smallOutlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F2FE',
  },
  smallOutlineBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F2FE',
  },

  // Provider Mini
  providerMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerMiniCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#0F1E3D',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  providerMiniTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  providerMiniName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  providerLatencyText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeMiniText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeOnline: { backgroundColor: 'rgba(56, 239, 125, 0.15)' },
  badgeUnconfigured: { backgroundColor: 'rgba(255, 183, 3, 0.15)' },
  badgeOffline: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  textGreen: { color: '#38EF7D' },
  textYellow: { color: '#FFB703' },
  textRed: { color: '#EF4444' },
  textCyan: { color: '#00F2FE' },

  // Mini Audit Rows
  auditMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  auditMiniActionBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#0F1E3D',
  },
  auditMiniActionText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F2FE',
    fontFamily: 'monospace',
  },
  auditMiniDetailBox: {
    flex: 1,
  },
  auditMiniDetailText: {
    fontSize: 12,
    color: '#F8FAFC',
  },
  auditMiniTimeText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  auditMiniStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 239, 125, 0.15)',
  },
  auditMiniStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38EF7D',
  },

  // Search & Filter
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B132B',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchTextInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 12,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0B132B',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: '#00F2FE',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#00F2FE',
  },

  // Tables
  tableCard: {
    backgroundColor: '#0B132B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091024',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tableHeadCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tableCellText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  flightPrimaryCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  flightSecondaryCode: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  flightRouteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F2FE',
  },
  flightStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 239, 125, 0.15)',
    alignSelf: 'flex-start',
  },
  flightStatusOnGround: {
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
  },
  flightStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38EF7D',
  },
  flightMetricText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  flightMetricSubText: {
    fontSize: 10,
    color: '#64748B',
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sourceLive: { backgroundColor: 'rgba(0, 242, 254, 0.15)' },
  sourceDemo: { backgroundColor: 'rgba(255, 183, 3, 0.15)' },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  detailActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F2FE',
  },
  emptyTableState: {
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  emptyTableText: {
    fontSize: 13,
    color: '#64748B',
  },

  // Airport Table Specifics
  airportCodeIata: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00F2FE',
  },
  airportCodeIcao: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  airportNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  airportCityText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  airportCountryText: {
    fontSize: 10,
    color: '#64748B',
  },
  airportCoordText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  airportElevText: {
    fontSize: 10,
    color: '#64748B',
  },
  airportTzText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Airline Specifics
  airlineNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  airlineCountryText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  airlineHubText: {
    fontSize: 11,
    color: '#00F2FE',
    fontFamily: 'monospace',
  },
  airlineFlightsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38EF7D',
  },

  // Radar Grid
  radarTelemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  radarTelemetryCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  radarCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radarCardCallsign: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  radarCardSub: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  radarCardMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#091024',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  radarMetricCol: {
    alignItems: 'center',
  },
  radarMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  radarMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F2FE',
    marginTop: 2,
  },
  radarCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radarCoordText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  radarAgeText: {
    fontSize: 10,
    color: '#38EF7D',
    fontWeight: '700',
  },

  // Weather Cards
  weatherCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  weatherCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherAirportCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00F2FE',
  },
  weatherAirportName: {
    fontSize: 11,
    color: '#94A3B8',
  },
  weatherConditionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  weatherConditionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F2FE',
  },
  weatherMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#091024',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  weatherMetricBox: {
    alignItems: 'center',
  },
  weatherMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  weatherMetricSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  weatherFooter: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  weatherSourceText: {
    fontSize: 10,
    color: '#64748B',
  },

  // Info Notice Banner
  infoNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 18,
  },
  infoNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // Provider Grid & Cards
  providerGrid: {
    gap: 16,
  },
  providerCard: {
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  providerHeaderLeft: {
    flex: 1,
    minWidth: 220,
  },
  providerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  providerPurpose: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  providerDetailsBox: {
    backgroundColor: '#091024',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  providerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  providerDetailKey: {
    fontSize: 12,
    color: '#64748B',
  },
  providerDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  providerDetailFooter: {
    marginTop: 14,
  },
  providerDetailText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  providerCheckedAt: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },

  // Quotas Specifics
  quotaAvailableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38EF7D',
  },
  quotaUnavailableText: {
    fontSize: 11,
    color: '#FFB703',
  },

  // User Section Specifics
  userTable: {
    gap: 12,
    marginTop: 8,
  },
  userTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  userKey: {
    fontSize: 12,
    color: '#64748B',
  },
  userVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  // Notices Grid
  noticesGrid: {
    gap: 16,
  },
  noticeCard: {
    backgroundColor: '#0B132B',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  noticeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  noticeCategoryBadge: {
    backgroundColor: '#0F1E3D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  noticeCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F2FE',
    letterSpacing: 0.5,
  },
  noticeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticePriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityNormal: { backgroundColor: 'rgba(0, 242, 254, 0.15)' },
  priorityHigh: { backgroundColor: 'rgba(255, 183, 3, 0.15)' },
  priorityUrgent: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  noticePriorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  toggleActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#1E293B',
  },
  toggleActiveBtnOn: {
    backgroundColor: 'rgba(56, 239, 125, 0.2)',
  },
  toggleActiveBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38EF7D',
  },
  noticeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  noticeCardMessage: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 18,
  },
  noticeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  noticeTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  noticeActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  noticeEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noticeEditBtnText: {
    fontSize: 12,
    color: '#00F2FE',
    fontWeight: '700',
  },
  noticeDeleteBtn: {
    padding: 2,
  },

  // Terminal Logs
  terminalContainer: {
    backgroundColor: '#02050E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#091024',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  terminalDotRed: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  terminalDotYellow: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFB703' },
  terminalDotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#38EF7D' },
  terminalTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  terminalBody: {
    maxHeight: 500,
    padding: 16,
  },
  terminalLine: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  terminalTimestamp: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
  },
  terminalLevel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  terminalSource: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  terminalMessage: {
    flex: 1,
    fontSize: 11,
    color: '#CBD5E1',
    fontFamily: 'monospace',
  },

  // Audit Actions Badge
  auditActionBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F2FE',
    fontFamily: 'monospace',
  },

  // DB Details
  dbDetailsGrid: {
    gap: 12,
    marginTop: 8,
  },
  dbDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  dbKey: {
    fontSize: 12,
    color: '#64748B',
  },
  dbVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  // Config Inputs
  configFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 16,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  configSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  configInput: {
    width: 120,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 6,
    color: '#00F2FE',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Posture Grid
  postureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  postureItem: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#0F1E3D',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E3A8A',
    gap: 8,
  },
  postureLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  postureValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 11, 24, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#0B132B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#091024',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalBody: {
    padding: 20,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.2)',
    borderColor: '#00F2FE',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  categoryPillTextActive: {
    color: '#00F2FE',
  },
  priorityPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  priorityPillActive: {
    backgroundColor: 'rgba(255, 183, 3, 0.2)',
    borderColor: '#FFB703',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  priorityPillTextActive: {
    color: '#FFB703',
  },
  modalInput: {
    backgroundColor: '#0F1E3D',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    borderRadius: 8,
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalTextArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalSubmitBtn: {
    backgroundColor: '#00F2FE',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B132B',
  },

  // Modal Detail Inspector Specifics
  flightDetailHeader: {
    marginBottom: 16,
  },
  flightDetailNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#00F2FE',
  },
  flightDetailCallsign: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  flightDetailGrid: {
    gap: 12,
  },
  flightDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  flightDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  flightDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
});
