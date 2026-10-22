import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { useFlight } from '@/context/FlightContext';

export default function AlertsScreen() {
  const {
    savedFlightNumbers,
    toggleSaveFlight,
    userEmail,
    setUserEmail,
    alertOnGateChange,
    setAlertOnGateChange,
    alertOnBoarding,
    setAlertOnBoarding,
    alertsDelayThresholdMins,
    setAlertsDelayThresholdMins,
    notifications,
    dismissNotification,
    simulateTriggerAlert,
    aircraftList,
  } = useFlight();

  const [inputEmail, setInputEmail] = useState(userEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const handleSaveEmail = () => {
    if (!inputEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setUserEmail(inputEmail);
    setIsEditingEmail(false);
    Alert.alert('Email Updated', `Flight alerts will be sent to: ${inputEmail}`);
  };

  const savedAircraft = aircraftList.filter((ac) =>
    savedFlightNumbers.includes(ac.flightNumber)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Flight Alerts & Watchlist"
          subtitle="Real-time Status Changes & Email Notifications"
        />

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Email Notification Channel Card */}
          <View style={styles.emailCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.iconTitleRow}>
                <Ionicons name="mail-unread-outline" size={18} color="#0284C7" />
                <Text style={styles.cardTitle}>Email Notification Channel</Text>
              </View>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>CONNECTED</Text>
              </View>
            </View>

            <Text style={styles.emailExplainer}>
              Critical status events (delays, gate reassignment, boarding, cancellations) are sent to this address.
            </Text>

            {isEditingEmail ? (
              <View style={styles.emailEditRow}>
                <TextInput
                  style={styles.emailInput}
                  value={inputEmail}
                  onChangeText={setInputEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter alert email"
                  placeholderTextColor="#64748B"
                />
                <TouchableOpacity style={styles.saveEmailBtn} onPress={handleSaveEmail}>
                  <Text style={styles.saveEmailBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emailDisplayRow}>
                <Text style={styles.emailDisplayText}>{userEmail}</Text>
                <TouchableOpacity
                  style={styles.editEmailBtn}
                  onPress={() => setIsEditingEmail(true)}
                >
                  <Text style={styles.editEmailBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Alert Preferences */}
          <View style={styles.settingsCard}>
            <Text style={styles.sectionHeader}>ALERT TRIGGER PREFERENCES</Text>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Gate Change Notification</Text>
                <Text style={styles.settingSub}>
                  Instant alert when airport operations change departure gate
                </Text>
              </View>
              <Switch
                value={alertOnGateChange}
                onValueChange={setAlertOnGateChange}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                thumbColor={alertOnGateChange ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Boarding Group Call</Text>
                <Text style={styles.settingSub}>
                  Notify immediately when gate attendants begin boarding
                </Text>
              </View>
              <Switch
                value={alertOnBoarding}
                onValueChange={setAlertOnBoarding}
                trackColor={{ false: '#CBD5E1', true: '#0284C7' }}
                thumbColor={alertOnBoarding ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Delay Threshold Trigger</Text>
                <Text style={styles.settingSub}>
                  Alert only if flight is delayed by at least {alertsDelayThresholdMins} minutes
                </Text>
              </View>
              <View style={styles.thresholdPills}>
                {[15, 30, 45].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.thresholdPill,
                      alertsDelayThresholdMins === mins && styles.thresholdPillActive,
                    ]}
                    onPress={() => setAlertsDelayThresholdMins(mins)}
                  >
                    <Text
                      style={[
                        styles.thresholdPillText,
                        alertsDelayThresholdMins === mins && styles.thresholdPillTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Watchlist Section */}
          <View style={styles.watchlistCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionHeader}>
                MONITORED FLIGHTS ({savedFlightNumbers.length})
              </Text>
            </View>

            {savedAircraft.length > 0 ? (
              savedAircraft.map((ac) => (
                <View key={ac.flightNumber} style={styles.watchlistItem}>
                  <View style={styles.watchItemInfo}>
                    <Text style={styles.watchFlightNumber}>{ac.flightNumber}</Text>
                    <Text style={styles.watchRoute}>
                      {ac.isLive
                        ? (ac.countryOfRegistration ? `Registered: ${ac.countryOfRegistration} • Live ADS-B` : 'Live ADS-B Telemetry')
                        : `${ac.origin?.iata || '---'} ➔ ${ac.destination?.iata || '---'} (${ac.airline.name})`}
                    </Text>
                    <Text style={styles.watchStatus}>
                      Status: {ac.status.toUpperCase()} • Telemetry: {ac.freshness.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.watchItemActions}>
                    <TouchableOpacity
                      style={styles.testAlertPill}
                      onPress={() => simulateTriggerAlert(ac.flightNumber, 'delay')}
                    >
                      <Ionicons name="flash" size={12} color="#D97706" />
                      <Text style={styles.testAlertPillText}>Simulate Delay</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeWatchBtn}
                      onPress={() => toggleSaveFlight(ac.flightNumber)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyWatchlist}>
                <Ionicons name="bookmark-outline" size={32} color="#CBD5E1" />
                <Text style={styles.emptyWatchlistText}>No flights saved to your watchlist yet</Text>
                <Text style={styles.emptyWatchlistSub}>
                  Tap the bookmark icon on any flight in Radar or Airport Timetables to track it here
                </Text>
              </View>
            )}
          </View>

          {/* Live Notification Timeline Log */}
          <View style={styles.timelineCard}>
            <Text style={styles.sectionHeader}>ALERT NOTIFICATION HISTORY</Text>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <View key={notif.id} style={styles.notifItem}>
                  <View style={styles.notifIconCircle}>
                    <Ionicons
                      name={
                        notif.type === 'delay'
                          ? 'time-outline'
                          : notif.type === 'gate_change'
                          ? 'enter-outline'
                          : 'megaphone-outline'
                      }
                      size={16}
                      color="#0284C7"
                    />
                  </View>

                  <View style={styles.notifContent}>
                    <View style={styles.notifTopRow}>
                      <Text style={styles.notifTitle}>{notif.title}</Text>
                      <TouchableOpacity onPress={() => dismissNotification(notif.id)}>
                        <Ionicons name="close" size={14} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.notifMessage}>{notif.message}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.timestampUtc).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noNotifsText}>No notification events yet.</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  emailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  emailExplainer: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  emailDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emailDisplayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  editEmailBtn: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editEmailBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  emailEditRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  saveEmailBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  saveEmailBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  thresholdPills: {
    flexDirection: 'row',
    gap: 6,
  },
  thresholdPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  thresholdPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  thresholdPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  thresholdPillTextActive: {
    color: '#FFFFFF',
  },
  watchlistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  watchItemInfo: {
    flex: 1,
  },
  watchFlightNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  watchRoute: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  watchStatus: {
    fontSize: 10,
    color: '#0284C7',
    marginTop: 2,
    fontWeight: '600',
  },
  watchItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  testAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  testAlertPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  removeWatchBtn: {
    padding: 6,
  },
  emptyWatchlist: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyWatchlistText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  emptyWatchlistSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifMessage: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  notifTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  noNotifsText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});
