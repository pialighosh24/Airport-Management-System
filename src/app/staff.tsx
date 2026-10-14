import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
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
      Alert.alert('Access Denied', 'Invalid Staff PIN. Demo PIN is: 7700 (or 1234)');
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
                  placeholder="Demo PIN: 7700"
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
                  onPress={() => handleLogin('7700')}
                >
                  <Ionicons name="key-outline" size={14} color="#38BDF8" />
                  <Text style={styles.quickUnlockText}>1-Tap Fast Unlock (PIN: 7700)</Text>
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
            <Ionicons name="person-circle-outline" size={16} color="#10B981" />
            <Text style={styles.sessionText}>
              Duty Officer: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>Ops Control Center (OCC)</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logoutStaff}>
            <Ionicons name="log-out-outline" size={14} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Lock</Text>
          </TouchableOpacity>
        </View>

        {/* Operational Metrics Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{openCount}</Text>
            <Text style={styles.metricTitle}>Active Cases</Text>
          </View>

          <View style={[styles.metricCard, { borderColor: '#DC2626' }]}>
            <Text style={[styles.metricVal, { color: '#EF4444' }]}>{criticalCount}</Text>
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
    backgroundColor: '#0B132B',
  },
  container: {
    flex: 1,
    backgroundColor: '#070D1E',
  },
  loginCardWrapper: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  loginCard: {
    backgroundColor: '#0F1A36',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  lockIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  loginDesc: {
    fontSize: 12,
    color: '#94A3B8',
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
    color: '#94A3B8',
    marginBottom: 6,
  },
  pinInput: {
    backgroundColor: '#0A1329',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  quickUnlockText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  staffSessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A1329',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0F1A36',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38BDF8',
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
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
    backgroundColor: '#131D38',
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  filterPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#38BDF8',
  },
  filterPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterPillTextActive: {
    color: '#38BDF8',
  },
  casesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
