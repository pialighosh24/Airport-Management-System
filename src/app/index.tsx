import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Header } from '@/components/common/Header';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService } from '@/services/api';
import { buildDisruptionBriefing } from '@/utils/disruptionBriefing';
import { WeatherSummaryResponse, CurrencyResponse } from '@/types';
import { Palette } from '@/constants/theme';

export default function CommandDashboard() {
  const {
    aircraftList,
    isLoadingFlights,
    flightError,
    isBackendConnected,
    fetchFlights,
    radarMode,
    disruptionCases,
    notifications,
  } = useFlight();

  const [weather, setWeather] = useState<WeatherSummaryResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [currency, setCurrency] = useState<CurrencyResponse | null>(null);
  const [currencyLoading, setCurrencyLoading] = useState(true);
  const [currencyError, setCurrencyError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Bootstrap weather + currency once on mount. State updates happen inside
  // async continuations only (never synchronously within the effect body).
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      let weatherResponse: WeatherSummaryResponse | null = null;
      let weatherFetchError: string | null = null;
      try {
        weatherResponse = await apiService.getWeather({ latitude: 40.7128, longitude: -74.006, forecastDays: 2 });
      } catch (err) {
        weatherFetchError = err instanceof Error ? err.message : 'Weather service unavailable';
      }

      let currencyResponse: CurrencyResponse | null = null;
      let currencyFetchError: string | null = null;
      try {
        currencyResponse = await apiService.getCurrency({ base: 'USD', symbols: ['USD', 'INR'] });
      } catch (err) {
        currencyFetchError = err instanceof Error ? err.message : 'Currency service unavailable';
      }

      if (!mounted) return;

      if (weatherResponse) {
        setWeather(weatherResponse);
        setWeatherError(null);
      } else {
        setWeatherError(weatherFetchError);
      }
      if (currencyResponse) {
        setCurrency(currencyResponse);
        setCurrencyError(null);
      } else {
        setCurrencyError(currencyFetchError);
      }
      setWeatherLoading(false);
      setCurrencyLoading(false);
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    let weatherResponse: WeatherSummaryResponse | null = null;
    let weatherFetchError: string | null = null;
    try {
      weatherResponse = await apiService.getWeather({ latitude: 40.7128, longitude: -74.006, forecastDays: 2 });
    } catch (err) {
      weatherFetchError = err instanceof Error ? err.message : 'Weather service unavailable';
    }
    let currencyResponse: CurrencyResponse | null = null;
    let currencyFetchError: string | null = null;
    try {
      currencyResponse = await apiService.getCurrency({ base: 'USD', symbols: ['USD', 'INR'] });
    } catch (err) {
      currencyFetchError = err instanceof Error ? err.message : 'Currency service unavailable';
    }

    if (weatherResponse) {
      setWeather(weatherResponse);
      setWeatherError(null);
    } else {
      setWeatherError(weatherFetchError);
    }
    if (currencyResponse) {
      setCurrency(currencyResponse);
      setCurrencyError(null);
    } else {
      setCurrencyError(currencyFetchError);
    }
    setWeatherLoading(false);
    setCurrencyLoading(false);
    await fetchFlights();
    setRefreshing(false);
  }, [fetchFlights]);

  const briefing = buildDisruptionBriefing(disruptionCases);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const inFlightCount = aircraftList.filter((f) => f.isLive && !f.isDemo && (f.status === 'en_route' || f.status === 'departed' || f.status === 'approaching')).length;

  const weatherCondition = weather?.current?.condition ?? null;
  const weatherTempC = weather?.current?.temperatureC ?? null;
  const weatherMaxTemp = weather?.forecast?.maxTemperatureC ?? null;

  const inrRate = currency?.rates?.INR ? currency.rates.INR : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="AeroNexus" subtitle="Command Centre" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.primary} />
        }
      >
        {/* Operational snapshot strip */}
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>{aircraftList.length}</Text>
            <Text style={styles.snapshotLabel}>Aircraft In Scope</Text>
          </View>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>{inFlightCount}</Text>
            <Text style={styles.snapshotLabel}>En Route Now</Text>
          </View>
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotValue}>{briefing.totalOpen}</Text>
            <Text style={styles.snapshotLabel}>Open Disruptions</Text>
          </View>
        </View>

        {/* Primary KPI grid */}
        <View style={styles.statGrid}>
          <StatCard
            title="Live Fleet"
            value={isLoadingFlights ? '…' : String(aircraftList.length)}
            subtitle={isBackendConnected ? (radarMode === 'live' ? 'OpenSky telemetry stream connected' : 'Demo fleet active') : 'Backend offline'}
            icon="airplane"
            tone="primary"
            onPress={() => router.push('/radar')}
          />
          <StatCard
            title="Weather Outlook"
            value={weatherLoading ? '…' : weatherTempC != null ? `${Math.round(weatherTempC)}°C` : '—'}
            subtitle={weatherCondition ? `${weatherCondition}${weatherMaxTemp != null ? ` • H ${Math.round(weatherMaxTemp)}°` : ''}` : weatherError ?? 'Unavailable'}
            icon="cloud"
            tone="info"
            onPress={() => router.push('/radar')}
          />
          <StatCard
            title="FX Indicative"
            value={currencyLoading ? '…' : inrRate != null ? `₹ ${inrRate.toFixed(2)}` : '—'}
            subtitle={currencyError ?? (currency ? `Base ${currency.base} • via Open ER-API` : 'Unavailable')}
            icon="cash"
            tone="success"
            onPress={() => router.push('/fares')}
          />
          <StatCard
            title="Alerts"
            value={String(unreadCount)}
            subtitle="Unread notifications"
            icon="notifications"
            tone={unreadCount > 0 ? 'warning' : 'default'}
            onPress={() => router.push('/alerts')}
          />
        </View>

        {/* Data sources / confidence strip */}
        <View style={styles.confidenceCard}>
          <View style={styles.confidenceHeader}>
            <Ionicons name="shield-checkmark" size={14} color={Palette.success} />
            <Text style={styles.confidenceTitle}>Data Confidence</Text>
          </View>
          <View style={styles.sourceRow}>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceLabel}>OpenSky</Text>
              <Badge tone={isBackendConnected ? 'success' : 'danger'} label={isBackendConnected ? 'CONNECTED' : 'OFFLINE'} />
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceLabel}>Open-Meteo</Text>
              <Badge tone={weather ? (weather.dataFreshness.status === 'valid' ? 'success' : 'warning') : weatherLoading ? 'info' : 'warning'} label={weather ? (weather.dataFreshness.status === 'valid' ? 'FRESH' : 'STALE') : weatherLoading ? 'CHECKING' : 'UNAVAILABLE'} />
            </View>
            <View style={styles.sourceItem}>
              <Text style={styles.sourceLabel}>Open ER-API</Text>
              <Badge tone={currency ? 'success' : currencyLoading ? 'info' : 'warning'} label={currency ? 'ACTIVE' : currencyLoading ? 'CHECKING' : 'UNAVAILABLE'} />
            </View>
          </View>
          <Text style={styles.confidenceNote}>
            Live feeds are validated against freshness metadata. Cached or unavailable sources are flagged — never silently substituted.
          </Text>
        </View>

        {/* Disruption briefing */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name={briefing.hasOpenDisruptions ? 'alert' : 'checkmark'} size={16} color={briefing.hasOpenDisruptions ? Palette.warning : Palette.success} />
            <Text style={styles.sectionTitle}>Disruption Briefing</Text>
          </View>
          {briefing.hasOpenDisruptions ? (
            <>
              <Text style={styles.briefingSummary}>
                {briefing.topDisruption
                  ? `${briefing.topDisruption.flightNumber} · ${briefing.topDisruption.summary}`
                  : 'Open disruption cases detected.'}
              </Text>
              <View style={styles.actionList}>
                {briefing.recommendedActions.slice(0, 2).map((action, idx) => (
                  <View key={`${action}-${idx}`} style={styles.actionRow}>
                    <Ionicons name="arrow-forward-circle" size={13} color={Palette.primary} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.briefingEmpty}>No open disruptions. Fleet operations nominal.</Text>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={16} color={Palette.primary} />
            <Text style={styles.sectionTitle}>Operations</Text>
          </View>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/radar')}>
              <Ionicons name="radio" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Live Radar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/airports')}>
              <Ionicons name="business" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Airports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/fares')}>
              <Ionicons name="pricetag" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Fares</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/flights')}>
              <Ionicons name="airplane" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Flight Intel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/staff')}>
              <Ionicons name="shield-checkmark" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Staff Ops</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={() => router.push('/settings')}>
              <Ionicons name="settings" size={18} color={Palette.primary} />
              <Text style={styles.quickLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backend status strip */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.backendRow} onPress={() => fetchFlights()} disabled={isLoadingFlights}>
            {isLoadingFlights ? <ActivityIndicator size="small" color={Palette.primary} /> : <Ionicons name="refresh" size={14} color={Palette.primary} />}
            <Text style={styles.backendText}>
              Backend: {isBackendConnected ? 'Operational' : 'Unreachable'} • {isLoadingFlights ? 'Syncing' : 'Synced'}
            </Text>
          </TouchableOpacity>
          {flightError ? <Text style={styles.backendError}>{flightError}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      default: { elevation: 2 },
    }),
  },
  snapshotValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.textPrimary,
  },
  snapshotLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Palette.textMuted,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  confidenceCard: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 12,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  confidenceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: 0.3,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sourceItem: {
    alignItems: 'flex-start',
    gap: 4,
  },
  sourceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Palette.textMuted,
  },
  confidenceNote: {
    fontSize: 10,
    color: Palette.textMuted,
    marginTop: 8,
    lineHeight: 14,
  },
  sectionCard: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: 0.3,
  },
  briefingSummary: {
    fontSize: 12,
    color: Palette.textSecondary,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionList: {
    marginTop: 8,
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  actionText: {
    flex: 1,
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
    lineHeight: 15,
  },
  briefingEmpty: {
    fontSize: 12,
    color: Palette.successText,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTile: {
    width: '31%',
    minWidth: 96,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Palette.surfaceSubtle,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 6,
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: Palette.textSecondary,
  },
  backendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backendText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.textSecondary,
  },
  backendError: {
    fontSize: 11,
    color: Palette.dangerText,
    marginTop: 6,
    fontWeight: '500',
  },
});
