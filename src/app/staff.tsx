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

  const filteredCases = disruptionCases.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.status === statusFilter;
  });

  const totalPax = disruptionCases.reduce((sum, item) => sum + item.impactedPassengers, 0);
  const criticalCount = disruptionCases.filter((item) => item.severity === 'critical').length;
  const openCount = disruptionCases.filter((item) => item.status === 'open').length;

  if (!isStaffAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Header
            title="AeroNexus Ops Portal"
            subtitle="Staff Authentication & Disruption Control"
          />

          <View style={styles.loginCardWrapper}>
            <View style={styles.loginCard}>
              <View style={styles.lockIconCircle}>
                <Ionicons name="shield-half" size={32} color="#38BDF8" />
              </View>

              <Text style={styles.loginTitle}>Secure Staff Operations</Text>
              <Text style={styles.loginDesc}>
                Restricted portal for Network Duty Managers, Station Ops, and Dispatchers to manage live flight disruption cases.
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

          <TouchableOpacity style={styles.logoutBtn} onPress={logoutStaff}>
            <Ionicons name="log-out-outline" size={14} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Lock</Text>
          </TouchableOpacity>
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

        {/* Action Button & Filters */}
        <View style={styles.actionHeader}>
          <TouchableOpacity
            style={styles.createCaseBtn}
            onPress={() => setCreateModalVisible(true)}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.createCaseBtnText}>Create Disruption Case</Text>
          </TouchableOpacity>

          <View style={styles.filterPillsRow}>
            {(['all', 'open', 'investigating', 'resolved'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterPill,
                  statusFilter === status && styles.filterPillActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    statusFilter === status && styles.filterPillTextActive,
                  ]}
                >
                  {status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Disruption Cases List */}
        <ScrollView style={styles.casesList} showsVerticalScrollIndicator={false}>
          {filteredCases.map((item) => (
            <DisruptionCard key={item.id} item={item} />
          ))}
        </ScrollView>

        {/* Create Case Modal Form */}
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
  loginCardWrapper: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lockIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  loginDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  pinSection: {
    width: '100%',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pinInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  loginBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  quickUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickUnlockText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  staffSessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionText: {
    fontSize: 12,
    color: '#64748B',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
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
    paddingTop: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0284C7',
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  createCaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  createCaseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
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
