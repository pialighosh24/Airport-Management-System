import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdminGate } from '@/components/admin/AdminGate';
import { Badge } from '@/components/ui/Badge';
import { useFlight } from '@/context/FlightContext';
import { apiService, AdminUser } from '@/services/api';
import { Palette } from '@/constants/theme';

const USER_ROLES = ['all', 'passenger', 'staff', 'admin'];

export default function AdminUsersScreen() {
  const { isStaffAuthenticated } = useFlight();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const loadUsers = useCallback(async () => {
    try {
      const response = await apiService.getAdminUsers();
      if (response.success) {
        setUsers(response.data ?? []);
        setError(null);
      } else {
        setError(response.message ?? 'Failed to load users.');
      }
    } catch {
      setError('Unable to reach the AeroNexus backend. Verify server availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const response = await apiService.getAdminUsers();
        if (!mounted) return;
        if (response.success) {
          setUsers(response.data ?? []);
          setError(null);
        } else {
          setError(response.message ?? 'Failed to load users.');
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

  const filteredUsers = roleFilter === 'all' ? users : users.filter((user) => user.role === roleFilter);

  const roleTone = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'danger' as const;
      case 'staff':
        return 'warning' as const;
      case 'passenger':
        return 'info' as const;
      default:
        return 'neutral' as const;
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
          <Text style={styles.heading}>User Management</Text>
          <Text style={styles.subheading}>Registered AeroNexus accounts and access roles.</Text>

          <View style={styles.filterRow}>
            {USER_ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.filterPill, roleFilter === role && styles.filterPillActive]}
                onPress={() => setRoleFilter(role)}
              >
                <Text style={[styles.filterPillText, roleFilter === role && styles.filterPillTextActive]}>
                  {role === 'all' ? 'ALL' : role.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>{error}</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => void loadUsers()}>
                <Text style={styles.secondaryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && !users.length ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={Palette.primary} />
            </View>
          ) : null}

          {!loading && !error && !filteredUsers.length ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>No registered users match the selected filter.</Text>
            </View>
          ) : null}

          {!loading && filteredUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userRow}>
                <View style={styles.userMain}>
                  <Text style={styles.userName}>{user.fullName || user.username}</Text>
                  <Text style={styles.userMeta}>{user.email}</Text>
                </View>
                <Badge tone={roleTone(user.role)} label={(user.role ?? 'passenger').toUpperCase()} />
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
  userCard: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  userMain: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '800', color: Palette.textPrimary },
  userMeta: { fontSize: 11, fontWeight: '600', color: Palette.textMuted, marginTop: 2 },
});
