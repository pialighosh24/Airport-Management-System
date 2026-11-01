import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminGate } from '@/components/admin/AdminGate';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService } from '@/services/api';
import { AircraftTelemetry } from '@/types';
import { Palette } from '@/constants/theme';

const FLIGHT_STATUSES = ['scheduled', 'en_route', 'delayed', 'cancelled', 'departed', 'approaching', 'boarding', 'landed'];

export default function AdminFlightsScreen() {
  const { isStaffAuthenticated, staffToken } = useFlight();
  const insets = useSafeAreaInsets();
  const [flights, setFlights] = useState<AircraftTelemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadFlights = useCallback(async () => {
    try {
      const response = await apiService.getAdminFlights({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
      });
      if (response.success) {
        setFlights(response.data ?? []);
        setError(null);
      } else {
        setError(response.message ?? 'Failed to load flights.');
      }
    } catch {
      setError('Unable to reach the AeroNexus backend. Verify server availability.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadFlights();
  }, [loadFlights]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await apiService.getAdminFlights({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: search.trim() || undefined,
        });
        if (!mounted) return;
        if (response.success) {
          setFlights(response.data ?? []);
          setError(null);
        } else {
          setError(response.message ?? 'Failed to load flights.');
        }
      } catch {
        if (!mounted) return;
        setError('Unable to reach the AeroNexus backend. Verify server availability.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (isStaffAuthenticated) {
      void bootstrap();
    }

    return () => {
      mounted = false;
    };
  }, [isStaffAuthenticated, statusFilter, search]);

  const updateFlightStatus = async (flightNumber: string, status: string) => {
    try {
      const response = await apiService.updateAdminFlightStatus(flightNumber, status, staffToken ?? undefined);
      if (response.success) {
        await loadFlights();
      } else {
        Alert.alert('Update Failed', response.message ?? 'Failed to update flight status.');
      }
    } catch {
      Alert.alert('Update Failed', 'Unable to reach the backend to update flight status.');
    }
  };

  const statusTone = (status: string) => {
    switch (status) {
      case 'en_route':
      case 'boarding':
      case 'departed':
        return 'info' as const;
      case 'delayed':
        return 'warning' as const;
      case 'cancelled':
        return 'danger' as const;
      case 'scheduled':
        return 'neutral' as const;
      default:
        return 'success' as const;
    }
  };

  return (
    <AdminGate>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 32) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void handleRefresh()} tintColor={Palette.primary} />}
        >
          <Text style={styles.heading}>Flight Management</Text>
          <Text style={styles.subheading}>Search, review and update operational flight status.</Text>

          <View style={styles.searchCard}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search flight number or callsign"
              placeholderTextColor={Palette.textMuted}
            />
          </View>

          <View style={styles.filterRow}>
            {['all', ...FLIGHT_STATUSES].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterPill, statusFilter === status && styles.filterPillActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterPillText, statusFilter === status && styles.filterPillTextActive]}>
                  {status === 'all' ? 'ALL' : status.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadFlights()}>
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !flights.length ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
            </View>
          ) : null}

          {!loading && !error && !flights.length ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>No flights match the current filters.</Text>
            </View>
          ) : null}

          {!loading && flights.map((flight) => (
            <View key={flight.flightNumber} style={styles.flightCard}>
              <View style={styles.flightRow}>
                <View style={styles.flightMain}>
                  <Text style={styles.flightNumber}>{flight.flightNumber}</Text>
                  <Text style={styles.flightRoute}>
                    {flight.origin?.iata ?? 'N/A'} → {flight.destination?.iata ?? 'N/A'}
                  </Text>
                  <Text style={styles.flightMeta}>
                    {flight.airline?.name ?? 'Unknown Airline'} · {flight.callsign ?? '—'}
                  </Text>
                </View>
                <Badge tone={statusTone(flight.status)} label={(flight.status ?? 'unknown').replace('_', ' ').toUpperCase()} />
              </View>
              <View style={styles.statusActions}>
                {FLIGHT_STATUSES.filter((s) => s !== flight.status).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.statusActionBtn}
                    onPress={() => void updateFlightStatus(flight.flightNumber, s)}
                  >
                    <Text style={styles.statusActionText}>{s.replace('_', ' ').toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  scroll: { flex: 1, backgroundColor: Palette.background },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '800', color: Palette.textPrimary, letterSpacing: -0.3, marginTop: 8 },
  subheading: { fontSize: 12, fontWeight: '600', color: Palette.textMuted, marginBottom: 14 },
  searchCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 10, marginBottom: 10 },
  searchInput: { color: Palette.textPrimary, fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  filterPill: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  filterPillActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  filterPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: Palette.textSecondary, textTransform: 'uppercase' },
  filterPillTextActive: { color: '#FFFFFF' },
  stateCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  stateText: { fontSize: 12, color: Palette.textSecondary, textAlign: 'center', marginBottom: 10 },
  secondaryBtn: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  flightCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  flightRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  flightMain: { flex: 1 },
  flightNumber: { fontSize: 15, fontWeight: '800', color: Palette.textPrimary },
  flightRoute: { fontSize: 12, fontWeight: '700', color: Palette.textSecondary, marginTop: 2 },
  flightMeta: { fontSize: 10, fontWeight: '600', color: Palette.textMuted, marginTop: 2 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: Palette.borderSubtle, paddingTop: 10 },
  statusActionBtn: { backgroundColor: Palette.surfaceSubtle, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Palette.border },
  statusActionText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: Palette.textSecondary, textTransform: 'uppercase' },
});
