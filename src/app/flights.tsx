import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { FreshnessIndicator } from '@/components/common/FreshnessIndicator';
import { useFlight } from '@/context/FlightContext';
import { AircraftTelemetry } from '@/types';
import { Palette } from '@/constants/theme';

function formatAltitude(feet: number | null): string {
  if (feet == null) return '—';
  if (feet < 1000) return `${Math.round(feet)} ft`;
  return `${(feet / 1000).toFixed(1)}k ft`;
}

function formatSpeed(knots: number | null): string {
  if (knots == null) return '—';
  return `${Math.round(knots)} kts`;
}

function formatHeading(deg: number | null): string {
  if (deg == null) return '—';
  const compass = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(deg / 22.5) % 16];
  return `${Math.round(deg)}° ${compass}`;
}

export default function FlightIntelligenceScreen() {
  const { aircraftList, isLoadingFlights, flightError, isBackendConnected, fetchFlights, radarMode, liveMetadata } = useFlight();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFlights();
    setRefreshing(false);
  }, [fetchFlights]);

  const renderAircraftRow = (aircraft: AircraftTelemetry) => (
    <View key={aircraft.icao24 ?? aircraft.flightNumber} style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.rowTitle}>
          <Text style={styles.flightNumber}>{aircraft.flightNumber}</Text>
          <Text style={styles.callsign}>{aircraft.callsign ?? '—'}</Text>
        </View>
        <Text style={styles.route}>
          {aircraft.origin?.iata ?? '???'} → {aircraft.destination?.iata ?? '???'}
        </Text>
      </View>
      <View style={styles.rowMetrics}>
        <Text style={styles.metric}>{formatAltitude(aircraft.altitudeFeet)}</Text>
        <Text style={styles.metric}>{formatSpeed(aircraft.groundSpeedKnots)}</Text>
        <Text style={styles.metric}>{formatHeading(aircraft.headingDegrees)}</Text>
      </View>
      <FreshnessIndicator freshness={aircraft.freshness} compact />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Flight Intelligence" subtitle="Live Aircraft Telemetry & Tracking" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Palette.primary} />
        }
      >
        {/* Source status */}
        <View style={styles.sourceCard}>
          <Ionicons name={isBackendConnected ? 'cloud-done-outline' : 'cloud-offline-outline'} size={14} color={isBackendConnected ? '#059669' : '#DC2626'} />
          <Text style={styles.sourceText}>
            {radarMode === 'live'
              ? liveMetadata?.providerName ?? 'OpenSky Network'
              : 'Demo Fleet'} • {isBackendConnected ? 'Backend reachable' : 'Backend unreachable'}
          </Text>
        </View>

        {isLoadingFlights ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingTitle}>Streaming Aircraft Telemetry</Text>
          </View>
        ) : flightError && aircraftList.length === 0 ? (
          <View style={styles.centeredState}>
            <Ionicons name="cloud-offline-outline" size={36} color="#DC2626" />
            <Text style={styles.errorTitle}>Telemetry Unavailable</Text>
            <Text style={styles.errorText}>{flightError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : aircraftList.length === 0 ? (
          <View style={styles.centeredState}>
            <Ionicons name="airplane-outline" size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>No Aircraft In Scope</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {aircraftList.map(renderAircraftRow)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 10,
    marginBottom: 12,
  },
  sourceText: { marginLeft: 8, fontSize: 11, fontWeight: '600', color: Palette.textSecondary },
  centeredState: { alignItems: 'center', paddingVertical: 48 },
  loadingTitle: { marginTop: 12, fontSize: 14, fontWeight: '700', color: Palette.textPrimary },
  errorTitle: { marginTop: 10, fontSize: 15, fontWeight: '800', color: Palette.textPrimary },
  errorText: { marginTop: 6, fontSize: 12, color: Palette.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  retryBtn: { marginTop: 14, backgroundColor: Palette.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '700', color: Palette.textPrimary },
  list: { gap: 8 },
  row: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 12,
  },
  rowMain: { flex: 1 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flightNumber: { fontSize: 15, fontWeight: '800', color: Palette.textPrimary },
  callsign: { fontSize: 12, fontWeight: '700', color: Palette.textSecondary },
  route: { fontSize: 11, color: Palette.textMuted, fontWeight: '600', marginTop: 2 },
  rowMetrics: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metric: { fontSize: 11, fontWeight: '700', color: Palette.textSecondary },
});
