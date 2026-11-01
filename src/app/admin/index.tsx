import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AdminGate } from '@/components/admin/AdminGate';
import { StatCard, StatCardTone } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService, AdminOpsStats } from '@/services/api';
import { Palette } from '@/constants/theme';

export default function AdminDashboardScreen() {
  const { isStaffAuthenticated } = useFlight();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminOpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const response = await apiService.getAdminStats();
      if (response.success) {
        setStats(response.data);
        setError(null);
      } else {
        setError(response.message ?? 'Unable to load administrative statistics.');
      }
    } catch {
      setError('Unable to reach the AeroNexus backend. Verify server availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadStats();
  }, [loadStats]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await apiService.getAdminStats();
        if (!mounted) return;
        if (response.success) {
          setStats(response.data);
          setError(null);
        } else {
          setError(response.message ?? 'Unable to load administrative statistics.');
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

  const kpiCards: { title: string; value: string; tone: StatCardTone; icon: keyof typeof Ionicons.glyphMap }[] = stats
    ? [
        { title: 'Total Flights', value: String(stats.flights.total), tone: 'default' as StatCardTone, icon: 'airplane' as keyof typeof Ionicons.glyphMap },
        { title: 'Active Flights', value: String(stats.flights.active), tone: 'primary' as StatCardTone, icon: 'radar' as keyof typeof Ionicons.glyphMap },
        { title: 'Delayed', value: String(stats.flights.delayed), tone: 'warning' as StatCardTone, icon: 'time' as keyof typeof Ionicons.glyphMap },
        { title: 'Cancelled', value: String(stats.flights.cancelled), tone: 'danger' as StatCardTone, icon: 'close-circle' as keyof typeof Ionicons.glyphMap },
        { title: 'Open Disruptions', value: String(stats.openDisruptions), tone: 'danger' as StatCardTone, icon: 'alert' as keyof typeof Ionicons.glyphMap },
        { title: 'Registered Users', value: String(stats.registeredUsers), tone: 'info' as StatCardTone, icon: 'people' as keyof typeof Ionicons.glyphMap },
      ]
    : [];

  return (
    <AdminGate>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 32) }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void handleRefresh()} tintColor={Palette.primary} />}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Admin Panel</Text>
              <Text style={styles.subtitle}>Operations Administration</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadStats()} disabled={loading}>
              <Ionicons name="refresh" size={16} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadStats()}>
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !stats ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
            </View>
          ) : null}

          {!loading && stats ? (
            <View style={styles.kpiGrid}>
              {kpiCards.map((card) => (
                <View key={card.title} style={styles.kpiCard}>
                  <StatCard title={card.title} value={card.value} icon={card.icon} tone={card.tone} />
                </View>
              ))}
            </View>
          ) : null}

          {!loading && stats ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Admin Modules</Text>
              <View style={styles.quickGrid}>
                <TouchableOpacity style={styles.quickBtn} onPress={() => router.push({ pathname: '/admin/flights' })}>
                  <Ionicons name="airplane" size={18} color={Palette.primary} />
                  <Text style={styles.quickBtnText}>Flight Management</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => router.push({ pathname: '/admin/disruptions' })}>
                  <Ionicons name="alert" size={18} color={Palette.warning} />
                  <Text style={styles.quickBtnText}>Disruption Management</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => router.push({ pathname: '/admin/users' })}>
                  <Ionicons name="people" size={18} color={Palette.info} />
                  <Text style={styles.quickBtnText}>User Management</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickBtn} onPress={() => router.push({ pathname: '/admin/monitoring' })}>
                  <Ionicons name="pulse" size={18} color={Palette.success} />
                  <Text style={styles.quickBtnText}>System Monitoring</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {!loading && stats?.recentActivities?.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Disruption Activity</Text>
              {stats.recentActivities.slice(0, 5).map((activity) => (
                <View key={activity.id} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityMeta}>
                      {activity.flightNumber} · Severity: {activity.severity}
                    </Text>
                  </View>
                  {activity.status ? <Badge tone={activity.status === 'open' ? 'danger' : activity.status === 'resolved' ? 'success' : 'warning'} label={activity.status.toUpperCase()} /> : null}
                </View>
              ))}
            </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: Palette.textPrimary, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, fontWeight: '600', color: Palette.textMuted, marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, alignItems: 'center', justifyContent: 'center' },
  stateCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  stateText: { fontSize: 12, color: Palette.textSecondary, textAlign: 'center', marginBottom: 10 },
  secondaryBtn: { backgroundColor: Palette.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  secondaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { flexGrow: 1, flexBasis: '45%', minWidth: 160 },
  card: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 14, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Palette.textPrimary, marginBottom: 12, letterSpacing: 0.2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { flexGrow: 1, flexBasis: '45%', minWidth: 140, backgroundColor: Palette.surfaceSubtle, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Palette.border },
  quickBtnText: { fontSize: 11, fontWeight: '700', color: Palette.textPrimary, marginTop: 6, textAlign: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Palette.borderSubtle },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.warning, marginRight: 10, marginTop: 5 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 12, fontWeight: '700', color: Palette.textPrimary },
  activityMeta: { fontSize: 10, fontWeight: '600', color: Palette.textMuted, marginTop: 2 },
});
