import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { AircraftRadarView } from '@/components/map/AircraftRadarView';
import { FlightDetailModal } from '@/components/map/FlightDetailModal';
import { useFlight } from '@/context/FlightContext';
import { AircraftTelemetry } from '@/types';

export default function LiveRadarScreen() {
  const {
    aircraftList,
    selectedAircraft,
    setSelectedAircraft,
    isLoadingFlights,
    flightError,
    isBackendConnected,
    fetchFlights,
    serverUrl,
    updateServerUrl,
    radarMode,
    setRadarMode,
    airspacePreset,
    setAirspacePreset,
    liveMetadata,
  } = useFlight();

  const [modalVisible, setModalVisible] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(serverUrl);

  const handleSelectAircraft = (aircraft: AircraftTelemetry | null) => {
    setSelectedAircraft(aircraft);
  };

  const handleOpenDetailModal = (aircraft: AircraftTelemetry) => {
    setSelectedAircraft(aircraft);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleSaveCustomUrl = () => {
    if (customUrlInput.trim().length > 0) {
      updateServerUrl(customUrlInput.trim());
      setShowServerConfig(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Live Radar"
          subtitle={
            radarMode === 'live'
              ? 'Real-Time ADS-B Aircraft Telemetry Feed'
              : 'Simulated Demo Aircraft Telemetry Feed'
          }
        />

        {/* Live OpenSky vs Demo Fleet Mode Selector */}
        <View style={styles.modeBar}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              radarMode === 'live' && styles.modeTabActiveLive,
            ]}
            onPress={() => setRadarMode('live')}
            disabled={isLoadingFlights}
          >
            <View style={[styles.modeDot, { backgroundColor: '#10B981' }]} />
            <Text
              style={[
                styles.modeTabText,
                radarMode === 'live' && styles.modeTabTextActive,
              ]}
            >
              Live OpenSky
            </Text>
            {radarMode === 'live' && (
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>REAL</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeTab,
              radarMode === 'demo' && styles.modeTabActiveDemo,
            ]}
            onPress={() => setRadarMode('demo')}
            disabled={isLoadingFlights}
          >
            <View style={[styles.modeDot, { backgroundColor: '#F59E0B' }]} />
            <Text
              style={[
                styles.modeTabText,
                radarMode === 'demo' && styles.modeTabTextActive,
              ]}
            >
              Demo Fleet
            </Text>
            {radarMode === 'demo' && (
              <View style={styles.demoTag}>
                <Text style={styles.demoTagText}>SIMULATED</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Airspace Selector & Provenance Banner */}
        {radarMode === 'live' ? (
          <View style={styles.liveHeaderCard}>
            <View style={styles.airspaceRow}>
              <Text style={styles.airspaceLabel}>Airspace:</Text>
              <TouchableOpacity
                style={[
                  styles.presetPill,
                  airspacePreset === 'europe' && styles.presetPillActive,
                ]}
                onPress={() => setAirspacePreset('europe')}
                disabled={isLoadingFlights}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    airspacePreset === 'europe' && styles.presetPillTextActive,
                  ]}
                >
                  Central Europe
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.presetPill,
                  airspacePreset === 'us_east' && styles.presetPillActive,
                ]}
                onPress={() => setAirspacePreset('us_east')}
                disabled={isLoadingFlights}
              >
                <Text
                  style={[
                    styles.presetPillText,
                    airspacePreset === 'us_east' && styles.presetPillTextActive,
                  ]}
                >
                  US East Coast
                </Text>
              </TouchableOpacity>
            </View>

            {liveMetadata?.warning && (
              <View style={styles.warningStrip}>
                <Ionicons name="information-circle" size={13} color="#FBBF24" />
                <Text style={styles.warningStripText}>{liveMetadata.warning}</Text>
              </View>
            )}

            <Text style={styles.adsbDisclaimer}>
              ⚠️ OpenSky broadcasts raw ADS-B radio signals. Airline gates and terminals are not transmitted over ADS-B.
            </Text>
          </View>
        ) : (
          <View style={styles.demoHeaderCard}>
            <Ionicons name="flask-outline" size={14} color="#F59E0B" />
            <Text style={styles.demoDisclaimerText}>
              Simulated Demo Flights • MySQL 8.0 / Offline Test Dataset
            </Text>
          </View>
        )}

        {/* Backend Connection Status Banner */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <Ionicons
              name={isBackendConnected ? 'cloud-done-outline' : 'cloud-offline-outline'}
              size={14}
              color={isBackendConnected ? '#34D399' : '#F87171'}
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {isBackendConnected ? 'Flight Service Online' : 'Flight Service Offline'}
            </Text>
          </View>

          <View style={styles.statusActions}>
            <TouchableOpacity
              style={styles.configBtn}
              onPress={() => setShowServerConfig((prev) => !prev)}
            >
              <Ionicons name="settings-outline" size={13} color="#94A3B8" />
              <Text style={styles.configBtnText}>Host</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => fetchFlights()}
              disabled={isLoadingFlights}
            >
              {isLoadingFlights ? (
                <ActivityIndicator size="small" color="#38BDF8" />
              ) : (
                <Ionicons name="refresh" size={14} color="#38BDF8" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Optional Host Configuration Drawer */}
        {showServerConfig && (
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Backend Server Address</Text>
            <Text style={styles.configHelp}>
              • Android Emulator: http://10.0.2.2:5000{'\n'}
              • Physical Phone on WiFi: http://&lt;your-laptop-ip&gt;:5000{'\n'}
              • Web Browser: http://localhost:5000
            </Text>
            <View style={styles.configInputRow}>
              <TextInput
                style={styles.configInput}
                value={customUrlInput}
                onChangeText={setCustomUrlInput}
                placeholder="http://192.168.x.x:5000"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveCustomUrl}>
                <Text style={styles.configSaveText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error Banner when background fetch failed but we have cached flights */}
        {flightError && aircraftList.length > 0 && (
          <View style={styles.errorToast}>
            <Ionicons name="warning-outline" size={14} color="#FBBF24" />
            <Text style={styles.errorToastText} numberOfLines={1}>
              Unable to refresh flight information. Please try again.
            </Text>
            <TouchableOpacity onPress={() => fetchFlights()} style={styles.toastRetryBtn}>
              <Text style={styles.toastRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Core Content: Loading, Error, Empty, or Radar View */}
        {isLoadingFlights && aircraftList.length === 0 ? (
          /* Loading State */
          <View style={styles.centeredStateContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingTitle}>
              {radarMode === 'live' ? 'Contacting OpenSky Network' : 'Loading Demo Flights'}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {radarMode === 'live' ? 'Contacting live flight service...' : 'Loading flight records...'}
            </Text>
          </View>
        ) : flightError && aircraftList.length === 0 ? (
          /* Error State */
          <ScrollView contentContainerStyle={styles.centeredStateContainer}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Cannot Connect to Server</Text>
            <Text style={styles.errorMessage}>Unable to refresh flight information. Please try again.</Text>
            <Text style={styles.errorHint}>
              Make sure the flight service is reachable and that this device has a valid network connection. Check your backend connection and try again.
            </Text>

            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFlights()}>
              <Ionicons name="reload" size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeIpBtn}
              onPress={() => setShowServerConfig(true)}
            >
              <Text style={styles.changeIpText}>Change Host / IP Address</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : aircraftList.length === 0 ? (
          /* Empty State */
          <View style={styles.centeredStateContainer}>
            <Ionicons name="airplane-outline" size={40} color="#64748B" />
            <Text style={styles.emptyTitle}>No Flight Records</Text>
            <Text style={styles.emptySubtitle}>
              No flight records were returned for the current filter.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFlights()}>
              <Text style={styles.retryBtnText}>Reload Flights</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Success: Radar & Flight List View */
          <AircraftRadarView
            aircraftList={aircraftList}
            onSelectAircraft={handleSelectAircraft}
            selectedAircraft={selectedAircraft}
            onOpenDetails={handleOpenDetailModal}
          />
        )}

        {/* Modal Sheet for Flight Telemetry */}
        <FlightDetailModal
          aircraft={selectedAircraft}
          visible={modalVisible}
          onClose={handleCloseModal}
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  configBtnText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
  },
  refreshBtn: {
    padding: 4,
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  configHelp: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  configInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  configInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  configSaveBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
  },
  configSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    gap: 8,
  },
  errorToastText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  toastRetryBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  toastRetryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  centeredStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
  errorHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  changeIpBtn: {
    marginTop: 12,
    padding: 6,
  },
  changeIpText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  modeTabActiveLive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modeTabActiveDemo: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D97706',
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  liveTag: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  demoTag: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  demoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  liveHeaderCard: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
    gap: 6,
  },
  airspaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airspaceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  presetPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  presetPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0369A1',
  },
  presetPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  warningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
  },
  warningStripText: {
    flex: 1,
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
  adsbDisclaimer: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
    fontStyle: 'italic',
  },
  demoHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    gap: 6,
  },
  demoDisclaimerText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
});
