import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminGate } from '@/components/admin/AdminGate';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService, AdminMonitoringSnapshot } from '@/services/api';
import { Palette } from '@/constants/theme';

export default function AdminMonitoringScreen() {
  const { isStaffAuthenticated } = useFlight();
  const insets = useSafeAreaInsets();
  const [snapshot, setSnapshot] = useState<AdminMonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonitoring = useCallback(async () => {
    try {
      const response = await apiService.getAdminMonitoring();
      if (response.success) {
        setSnapshot(response.data);
        setError(null);
      } else {
        setError(response.message ?? 'Failed to load monitoring data.');
      }
    } catch {
      setError('Unable to reach the AeroNexus backend. Verify server availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadMonitoring();
  }, [loadMonitoring]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await apiService.getAdminMonitoring();
        if (!mounted) return;
        if (response.success) {
          setSnapshot(response.data);
          setError(null);
        } else {
          setError(response.message ?? 'Failed to load monitoring data.');
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

  const externalApis = Object.entries(snapshot?.externalApis ?? {}) as [string, { source?: string; providerName?: string; status?: string; authConfigured?: boolean }][];

  return (
    <AdminGate>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 32) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void handleRefresh()} tintColor={Palette.primary} />}
        >
          <Text style={styles.heading}>System Monitoring</Text>
          <Text style={styles.subheading}>Backend health, database connectivity and external API readiness.</Text>

          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadMonitoring()}>
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !snapshot ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
            </View>
          ) : null}

          {snapshot ? (
            <>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>Backend Status</Text>
                  <Badge tone={snapshot.status === 'healthy' ? 'success' : 'danger'} label={(snapshot.status ?? 'unknown').toUpperCase()} />
                </View>
                <Text style={styles.cardText}>{snapshot.message}</Text>
                <Text style={styles.cardMeta}>Environment: {snapshot.environment}</Text>
                <Text style={styles.cardMeta}>Uptime: {snapshot.uptimeSeconds}s</Text>
                <Text style={styles.cardMeta}>Checked: {snapshot.timestamp}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Database</Text>
                <Text style={styles.cardText}>{snapshot.database?.message ?? 'Database status unavailable.'}</Text>
                <Text style={styles.cardMeta}>State: {snapshot.database?.state ?? 'unknown'}</Text>
                <Text style={styles.cardMeta}>Connected: {String(Boolean(snapshot.database?.connected))}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>External API Availability</Text>
                {externalApis.length ? (
                  externalApis.map(([key, api]) => (
                    <View key={key} style={styles.apiRow}>
                      <View style={styles.apiMain}>
                        <Text style={styles.apiName}>{api.providerName ?? key}</Text>
                        <Text style={styles.apiMeta}>{api.source}</Text>
                      </View>
                      <Badge tone={api.status === 'configured' || api.status === 'public' ? 'success' : 'warning'} label={(api.status ?? 'unknown').toUpperCase()} />
                    </View>
                  ))
                ) : (
                  <Text style={styles.cardText}>No external API status available.</Text>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Operations Summary</Text>
                <Text style={styles.cardText}>
                  Active flights: {snapshot.summary?.flights?.active ?? 0} · Total tracked: {snapshot.summary?.flights?.total ?? 0} · Open disruptions:{' '}
                  {snapshot.summary?.openDisruptions ?? 0} · Registered users: {snapshot.summary?.registeredUsers ?? 0}
                </Text>
              </View>
            </>
          ) : null}
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
  stateCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  stateText: { fontSize: 12, color: Palette.textSecondary, textAlign: 'center', marginBottom: 10 },
  secondaryBtn: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Palette.textPrimary },
  cardText: { fontSize: 12, fontWeight: '600', color: Palette.textSecondary, lineHeight: 17 },
  cardMeta: { fontSize: 11, fontWeight: '600', color: Palette.textMuted, marginTop: 4 },
  apiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Palette.borderSubtle },
  apiMain: { flex: 1 },
  apiName: { fontSize: 12, fontWeight: '700', color: Palette.textPrimary },
  apiMeta: { fontSize: 10, fontWeight: '600', color: Palette.textMuted, marginTop: 2 },
});
