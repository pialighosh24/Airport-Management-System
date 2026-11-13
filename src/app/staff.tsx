import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Header } from '@/components/common/Header';
import { DisruptionCard } from '@/components/staff/DisruptionCard';
import { CreateDisruptionModal } from '@/components/staff/CreateDisruptionModal';
import { useFlight } from '@/context/FlightContext';
import { DisruptionCase } from '@/types';

export default function StaffScreen() {
  const {
    isStaffAuthenticated,
    loginStaff,
    logoutStaff,
    disruptionCases,
  } = useFlight();

  const [pinInput, setPinInput] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | DisruptionCase['status']>('all');

  const handleLogin = (pinToUse?: string) => {
    const pin = pinToUse || pinInput;
    const success = loginStaff(pin);
    if (!success) {
      Alert.alert('Access Denied', 'Invalid Staff PIN. Demo PIN is: 2026 (or 7700)');
    } else {
      setPinInput('');
    }
  };

  // Filter disruption cases based on tab selection
  const filteredCases = disruptionCases.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const openCount = disruptionCases.filter((c) => c.status === 'open').length;
  const criticalCount = disruptionCases.filter((c) => c.severity === 'critical').length;
  const totalPax = disruptionCases.reduce((sum, c) => sum + (c.impactedPassengers || 0), 0);

  // If not authenticated, render Staff Security Access Gate
  if (!isStaffAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header
            title="Ground Staff Portal"
            subtitle="Authorised Operations Personnel Only"
          />

          <View style={styles.authContainer}>
            <View style={styles.authCard}>
              <View style={styles.authIconRing}>
                <Ionicons name="shield-half-outline" size={32} color="#0284C7" />
              </View>

              <Text style={styles.authTitle}>Restricted Operations Gate</Text>
              <Text style={styles.authSubtitle}>
                Access is monitored and restricted to verified station managers, ramp agents, and OCC coordinators.
              </Text>

              <View style={styles.pinSection}>
                <Text style={styles.pinLabel}>Enter 4-Digit Staff PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  value={pinInput}
                  onChangeText={setPinInput}
                  placeholder="Demo PIN: 2026 (or 7700)"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                />

                <TouchableOpacity style={styles.loginBtn} onPress={() => handleLogin()}>
                  <Text style={styles.loginBtnText}>Unlock Operations Portal</Text>
                </TouchableOpacity>

                {/* 1-Tap Quick Demo Unlock for testing */}
                <TouchableOpacity
                  style={styles.quickUnlockBtn}
                  onPress={() => handleLogin('2026')}
                >
                  <Ionicons name="key-outline" size={14} color="#38BDF8" />
                  <Text style={styles.quickUnlockText}>1-Tap Fast Unlock (PIN: 2026)</Text>
                </TouchableOpacity>

                {/* Admin Portal Shortcut Link */}
                <TouchableOpacity
                  style={styles.adminPortalLinkBtn}
                  onPress={() => router.push('/admin' as any)}
                >
                  <Ionicons name="shield-checkmark" size={14} color="#0284C7" />
                  <Text style={styles.adminPortalLinkText}>Open Admin Dashboard →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Staff Disruption Ops"
          subtitle="Real-time Network Irregularity Management"
        />

        {/* Staff Role & Logout Bar */}
        <View style={styles.staffSessionBar}>
          <View style={styles.sessionInfo}>
            <Ionicons name="person-circle-outline" size={16} color="#059669" />
            <Text style={styles.sessionText}>
              Duty Officer: <Text style={{ color: '#0F172A', fontWeight: '700' }}>Ops Control Center (OCC)</Text>
            </Text>
          </View>

          <View style={styles.sessionActions}>
            <TouchableOpacity style={styles.adminShortcutBtn} onPress={() => router.push('/admin' as any)}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#0284C7" />
              <Text style={styles.adminShortcutBtnText}>Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={logoutStaff}>
              <Ionicons name="log-out-outline" size={14} color="#DC2626" />
              <Text style={styles.logoutBtnText}>Lock</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Operational Metrics Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{openCount}</Text>
            <Text style={styles.metricTitle}>Active Cases</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: '#FECACA' }]}>
            <Text style={[styles.metricVal, { color: '#DC2626' }]}>{criticalCount}</Text>
            <Text style={styles.metricTitle}>Critical Alert</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{totalPax}</Text>
            <Text style={styles.metricTitle}>Affected Pax</Text>
          </View>
        </View>

        {/* Action Header: Create Case & Filter */}
        <View style={styles.actionHeader}>
          <View style={styles.filterSection}>
            <Text style={styles.sectionHeading}>
              Active Station Incidents ({filteredCases.length})
            </Text>

            <View style={styles.filterPillsRow}>
              {(['all', 'open', 'investigating', 'resolved'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterPill, statusFilter === s && styles.filterPillActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text
                    style={[styles.filterPillText, statusFilter === s && styles.filterPillTextActive]}
                  >
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.createCaseBtn}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.createCaseBtnText}>Log New Incident</Text>
          </TouchableOpacity>
        </View>

        {/* Disruption Cases Feed */}
        <ScrollView style={styles.casesList} contentContainerStyle={{ paddingBottom: 24 }}>
          {filteredCases.map((disruption) => (
            <DisruptionCard key={disruption.id} item={disruption} />
          ))}
        </ScrollView>

        {/* Incident Creation Modal Sheet */}
        <CreateDisruptionModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  authIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  pinSection: {
    width: '100%',
    marginTop: 20,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  quickUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    gap: 6,
  },
  quickUnlockText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  adminPortalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  adminPortalLinkText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  staffSessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sessionText: {
    fontSize: 11,
    color: '#475569',
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  adminShortcutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricTitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  actionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  createCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  createCaseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    gap: 6,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  casesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
