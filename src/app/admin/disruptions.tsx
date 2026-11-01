import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminGate } from '@/components/admin/AdminGate';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService } from '@/services/api';
import { DisruptionCase } from '@/types';
import { Palette } from '@/constants/theme';

const DISRUPTION_STATUSES = ['all', 'open', 'investigating', 'resolved'];

export default function AdminDisruptionsScreen() {
  const { isStaffAuthenticated, staffToken } = useFlight();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<DisruptionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadCases = useCallback(async () => {
    try {
      const response = await apiService.getAdminDisruptions();
      if (response.success) {
        setCases(response.data ?? []);
        setError(null);
      } else {
        setError(response.message ?? 'Failed to load disruption cases.');
      }
    } catch {
      setError('Unable to reach the AeroNexus backend. Verify server availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadCases();
  }, [loadCases]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await apiService.getAdminDisruptions();
        if (!mounted) return;
        if (response.success) {
          setCases(response.data ?? []);
          setError(null);
        } else {
          setError(response.message ?? 'Failed to load disruption cases.');
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
  }, [isStaffAuthenticated]);

  const updateStatus = async (item: DisruptionCase, status: 'open' | 'investigating' | 'resolved') => {
    try {
      const response = await apiService.updateAdminDisruptionStatus(item.id, { status }, staffToken ?? undefined);
      if (response.success) {
        await loadCases();
      } else {
        Alert.alert('Update Failed', response.message ?? 'Failed to update disruption status.');
      }
    } catch {
      Alert.alert('Update Failed', 'Unable to reach the backend to update disruption status.');
    }
  };

  const severityTone = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'danger' as const;
      case 'high':
        return 'danger' as const;
      case 'medium':
        return 'warning' as const;
      case 'low':
        return 'info' as const;
      default:
        return 'neutral' as const;
    }
  };

  const filteredCases = statusFilter === 'all' ? cases : cases.filter((item) => item.status === statusFilter);

  return (
    <AdminGate>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 32) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void handleRefresh()} tintColor={Palette.primary} />}
        >
          <Text style={styles.heading}>Disruption Management</Text>
          <Text style={styles.subheading}>Review, investigate and resolve flight disruption cases.</Text>

          <View style={styles.filterRow}>
            {DISRUPTION_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterPill, statusFilter === status && styles.filterPillActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.filterPillText, statusFilter === status && styles.filterPillTextActive]}>
                  {status === 'all' ? 'ALL' : status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadCases()}>
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !cases.length ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
            </View>
          ) : null}

          {!loading && !error && !filteredCases.length ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>No disruption cases found for the selected filter.</Text>
            </View>
          ) : null}

          {!loading && filteredCases.map((item) => (
            <View key={item.id} style={styles.caseCard}>
              <View style={styles.caseRow}>
                <View style={styles.caseMain}>
                  <Text style={styles.caseTitle}>{item.flightNumber}</Text>
                  <Text style={styles.caseMeta}>
                    {item.incidentType} · Status: {item.status}
                  </Text>
                </View>
                <Badge tone={severityTone(item.severity)} label={(item.severity ?? 'info').toUpperCase()} />
              </View>
              <Text style={styles.caseSummary}>{item.summary}</Text>
              <View style={styles.caseBadges}>
                <Badge tone={item.status === 'open' ? 'danger' : item.status === 'resolved' ? 'success' : 'warning'} label={(item.status ?? 'open').toUpperCase()} />
                <Badge tone="neutral" label={`${item.impactedPassengers ?? 0} Pax impacted`} />
              </View>
              <View style={styles.caseActions}>
                {item.status === 'open' ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => void updateStatus(item, 'investigating')}>
                    <Text style={styles.actionBtnText}>Start Investigation</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status === 'investigating' ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => void updateStatus(item, 'resolved')}>
                    <Text style={styles.actionBtnText}>Resolve Case</Text>
                  </TouchableOpacity>
                ) : null}
                {item.status === 'resolved' ? (
                  <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => void updateStatus(item, 'open')}>
                    <Text style={styles.actionBtnSecondaryText}>Reopen Case</Text>
                  </TouchableOpacity>
                ) : null}
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  filterPill: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  filterPillActive: { backgroundColor: Palette.primary, borderColor: Palette.primary },
  filterPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: Palette.textSecondary, textTransform: 'uppercase' },
  filterPillTextActive: { color: '#FFFFFF' },
  stateCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  stateText: { fontSize: 12, color: Palette.textSecondary, textAlign: 'center', marginBottom: 10 },
  secondaryBtn: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  caseCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  caseRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  caseMain: { flex: 1 },
  caseTitle: { fontSize: 14, fontWeight: '800', color: Palette.textPrimary },
  caseMeta: { fontSize: 11, fontWeight: '700', color: Palette.textSecondary, marginTop: 2 },
  caseSummary: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary, lineHeight: 17, marginTop: 8 },
  caseBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  caseActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 11 },
  actionBtnSecondary: { backgroundColor: Palette.surfaceSubtle, borderWidth: 1, borderColor: Palette.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionBtnSecondaryText: { color: Palette.textSecondary, fontWeight: '700', fontSize: 11 },
});
