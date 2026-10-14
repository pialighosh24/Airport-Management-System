import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AircraftTelemetry } from '@/types';
import { FreshnessIndicator } from '@/components/common/FreshnessIndicator';
import { useFlight } from '@/context/FlightContext';

interface Props {
  aircraft: AircraftTelemetry | null;
  visible: boolean;
  onClose: () => void;
}

export function FlightDetailModal({ aircraft, visible, onClose }: Props) {
  const { isFlightSaved, toggleSaveFlight, simulateTriggerAlert } = useFlight();

  if (!aircraft) return null;

  const isSaved = isFlightSaved(aircraft.flightNumber);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Sheet Header Handle */}
          <View style={styles.dragHandle} />

          {/* Top Bar */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.flightTitleRow}>
                <Text style={styles.flightNumber}>{aircraft.flightNumber}</Text>
                <View style={styles.callsignBadge}>
                  <Text style={styles.callsignText}>{aircraft.callsign}</Text>
                </View>
                {aircraft.isLive ? (
                  <View style={styles.liveBadgePill}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveBadgeText}>LIVE ADS-B</Text>
                  </View>
                ) : (
                  <View style={styles.demoBadgePill}>
                    <Text style={styles.demoBadgeText}>DEMO FLIGHT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.airlineName}>
                {aircraft.isLive
                  ? 'Commercial Airline: Unavailable (Not Broadcast via ADS-B)'
                  : (aircraft.airline.name || 'Unavailable')}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Route Card / Live Radio Status */}
            {aircraft.isLive ? (
              <View style={styles.liveRouteCard}>
                <View style={styles.liveRouteHeader}>
                  <View style={styles.liveDotRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveRouteTitle}>Live ADS-B Telemetry Tracking</Text>
                  </View>
                  <Text style={styles.statusPillText}>{aircraft.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.liveRouteNotice}>
                  Departure airport, destination airport, gates, and terminals are commercial schedule records and are not transmitted in live ADS-B radio signals.
                </Text>
                <View style={styles.liveMetaStrip}>
                  <View style={styles.liveMetaCol}>
                    <Text style={styles.liveMetaLabel}>REGISTRATION COUNTRY</Text>
                    <Text style={styles.liveMetaVal}>
                      {aircraft.countryOfRegistration || 'Unavailable'}
                    </Text>
                  </View>
                  <View style={[styles.liveMetaCol, { alignItems: 'flex-end' }]}>
                    <Text style={styles.liveMetaLabel}>FLIGHT ROUTE</Text>
                    <Text style={styles.liveMetaVal}>Unavailable via ADS-B</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* Demo Flight Route Card */
              <View style={styles.routeCard}>
                <View style={styles.routeCol}>
                  <Text style={styles.routeIata}>{aircraft.origin?.iata || 'Unavailable'}</Text>
                  <Text style={styles.routeCity}>{aircraft.origin?.city || 'Unavailable'}</Text>
                  <Text style={styles.routeTerminal}>
                    Term: {aircraft.origin?.terminal || 'Unavailable'} • Gate: {aircraft.origin?.gate || 'Unavailable'}
                  </Text>
                </View>

                <View style={styles.flightPath}>
                  <Ionicons name="airplane" size={18} color="#38BDF8" />
                  <View style={styles.pathLine} />
                  <Text style={styles.statusPillText}>{aircraft.status.toUpperCase()}</Text>
                </View>

                <View style={[styles.routeCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.routeIata}>{aircraft.destination?.iata || 'Unavailable'}</Text>
                  <Text style={styles.routeCity}>{aircraft.destination?.city || 'Unavailable'}</Text>
                  <Text style={styles.routeTerminal}>
                    Term: {aircraft.destination?.terminal || 'Unavailable'} • Gate: {aircraft.destination?.gate || 'Unavailable'}
                  </Text>
                </View>
              </View>
            )}

            {/* Telemetry Conflict Warning Banner */}
            {aircraft.telemetryFlags?.hasConflict && (
              <View style={styles.telemetryConflictCard}>
                <View style={styles.conflictTitleRow}>
                  <Ionicons name="warning" size={15} color="#F59E0B" />
                  <Text style={styles.conflictTitle}>Telemetry Inconsistency Detected</Text>
                </View>
                <Text style={styles.conflictDesc}>
                  {aircraft.telemetryFlags.description}
                </Text>
                <Text style={styles.conflictNotice}>
                  Raw transponder observations are preserved as broadcast without synthetic replacement.
                </Text>
              </View>
            )}

            {/* Core Principle Data Freshness Banner */}
            <Text style={styles.sectionHeader}>DATA FRESHNESS & PROVENANCE</Text>
            <FreshnessIndicator freshness={aircraft.freshness} />

            <View style={styles.providerCard}>
              <View style={styles.providerRow}>
                <Ionicons name="server-outline" size={14} color="#94A3B8" />
                <Text style={styles.providerLabel}>Feeder Provider:</Text>
                <Text style={styles.providerValue}>{aircraft.freshness.providerName}</Text>
              </View>
              <View style={styles.providerRow}>
                <Ionicons name="shield-outline" size={14} color="#94A3B8" />
                <Text style={styles.providerLabel}>Telemetry Integrity:</Text>
                <Text
                  style={[
                    styles.providerValue,
                    {
                      color:
                        aircraft.freshness.status === 'valid'
                          ? '#10B981'
                          : aircraft.freshness.status === 'stale'
                          ? '#F59E0B'
                          : '#9CA3AF',
                    },
                  ]}
                >
                  {aircraft.freshness.status.toUpperCase()} (No interpolated guess)
                </Text>
              </View>
            </View>

            {/* Telemetry Grid */}
            <Text style={styles.sectionHeader}>RADAR & SENSOR TELEMETRY</Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>ALTITUDE</Text>
                <Text style={styles.telemetryValue}>
                  {aircraft.altitudeFeet !== null
                    ? `${aircraft.altitudeFeet.toLocaleString()} ft`
                    : 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>
                  {aircraft.altitudeFeet !== null
                    ? `FL${Math.round(aircraft.altitudeFeet / 100)}`
                    : 'Unavailable'}
                </Text>
              </View>

              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>GROUND SPEED</Text>
                <Text style={styles.telemetryValue}>
                  {aircraft.groundSpeedKnots !== null
                    ? `${aircraft.groundSpeedKnots} kts`
                    : 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>
                  {aircraft.groundSpeedKnots !== null
                    ? `~${Math.round(aircraft.groundSpeedKnots * 1.852)} km/h`
                    : 'Unavailable'}
                </Text>
              </View>

              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>VERTICAL RATE</Text>
                <Text
                  style={[
                    styles.telemetryValue,
                    aircraft.verticalRateFpm !== null && aircraft.verticalRateFpm > 200 && { color: '#34D399' },
                    aircraft.verticalRateFpm !== null && aircraft.verticalRateFpm < -200 && { color: '#F87171' },
                  ]}
                >
                  {aircraft.verticalRateFpm !== null
                    ? `${aircraft.verticalRateFpm > 0 ? '+' : ''}${aircraft.verticalRateFpm.toLocaleString()} ft/min`
                    : 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>
                  {aircraft.verticalRateFpm !== null
                    ? (aircraft.verticalRateFpm > 100 ? 'Climbing' : aircraft.verticalRateFpm < -100 ? 'Descending' : 'Level Flight')
                    : 'Unavailable'}
                </Text>
              </View>

              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>HEADING</Text>
                <Text style={styles.telemetryValue}>
                  {aircraft.headingDegrees !== null
                    ? `${aircraft.headingDegrees}°`
                    : 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>True track</Text>
              </View>

              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>SQUAWK CODE</Text>
                <Text style={[styles.telemetryValue, (aircraft.squawkCode === '7600' || aircraft.squawkCode === '7700') && { color: '#EF4444' }]}>
                  {aircraft.squawkCode || 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>
                  {aircraft.squawkCode === '7600'
                    ? '⚠️ Radio Failure'
                    : aircraft.squawkCode === '7700'
                    ? '🚨 General Emergency'
                    : aircraft.squawkCode === '7500'
                    ? '🚨 Unlawful Interference'
                    : aircraft.squawkCode ? 'Assigned transponder' : 'Unavailable'}
                </Text>
              </View>

              <View style={styles.telemetryBox}>
                <Text style={styles.telemetryLabel}>COORDINATES</Text>
                <Text style={styles.telemetryValue}>
                  {aircraft.latitude !== null && aircraft.longitude !== null
                    ? `${aircraft.latitude.toFixed(4)}°`
                    : 'Unavailable'}
                </Text>
                <Text style={styles.telemetrySub}>
                  {aircraft.longitude !== null ? `${aircraft.longitude.toFixed(4)}° WGS-84` : 'Position unavailable'}
                </Text>
              </View>
            </View>

            {/* Aircraft specs */}
            <View style={styles.specsCard}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Aircraft Model</Text>
                <Text style={styles.specVal}>
                  {aircraft.aircraftModel || (aircraft.isLive ? 'Unavailable (Not in ADS-B)' : 'Unavailable')}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Tail Registration</Text>
                <Text style={styles.specVal}>{aircraft.registration || 'Unavailable'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Registration Country</Text>
                <Text style={styles.specVal}>{aircraft.countryOfRegistration || 'Unavailable'}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>On-Ground State</Text>
                <Text
                  style={[
                    styles.specVal,
                    { color: aircraft.onGround ? '#F59E0B' : '#10B981', fontWeight: '700' },
                  ]}
                >
                  {aircraft.onGround !== undefined
                    ? (aircraft.onGround ? 'On Ground (Taxi / Runway)' : 'Airborne (In Flight)')
                    : 'Unavailable'}
                </Text>
              </View>
              {aircraft.icao24 ? (
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>ICAO 24-bit Hex</Text>
                  <Text style={styles.specVal}>{aircraft.icao24.toUpperCase()}</Text>
                </View>
              ) : null}
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Data Feed</Text>
                <Text style={styles.specVal}>
                  {aircraft.isLive ? 'Live OpenSky ADS-B' : 'Simulated Demo Fleet'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, isSaved && styles.actionBtnSaved]}
                onPress={() => toggleSaveFlight(aircraft.flightNumber)}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={isSaved ? '#FFFFFF' : '#38BDF8'}
                />
                <Text style={[styles.actionBtnText, isSaved && styles.actionBtnTextSaved]}>
                  {isSaved ? 'Saved to Watchlist' : 'Add to Flight Watchlist'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testAlertBtn}
                onPress={() => simulateTriggerAlert(aircraft.flightNumber, 'delay')}
              >
                <Ionicons name="notifications-outline" size={16} color="#E0E7FF" />
                <Text style={styles.testAlertText}>Simulate Delay Notification</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0A1329',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  flightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flightNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  callsignBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  callsignText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  demoBadgePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
  },
  airlineName: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  liveRouteCard: {
    backgroundColor: '#0C1A38',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  liveRouteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveRouteTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  liveRouteNotice: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 10,
  },
  liveMetaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#081126',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: '#1E293B',
  },
  liveMetaCol: {
    flex: 1,
  },
  liveMetaLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '800',
  },
  liveMetaVal: {
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: '700',
    marginTop: 2,
  },
  routeCard: {
    backgroundColor: '#111D3D',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  routeCol: {
    flex: 1,
  },
  routeIata: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  routeCity: {
    fontSize: 12,
    color: '#94A3B8',
  },
  routeTerminal: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  flightPath: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  pathLine: {
    width: 50,
    height: 1,
    backgroundColor: '#38BDF8',
    marginVertical: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38BDF8',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  providerCard: {
    backgroundColor: '#0F1A36',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 10,
    gap: 6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  providerValue: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  telemetryBox: {
    width: '48%',
    backgroundColor: '#111D3D',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  telemetryLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '800',
  },
  telemetryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  telemetrySub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  specsCard: {
    backgroundColor: '#0F1A36',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  specLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  specVal: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  actionsContainer: {
    gap: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111D3D',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  actionBtnSaved: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  actionBtnTextSaved: {
    color: '#FFFFFF',
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3730A3',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  testAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  telemetryConflictCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: 10,
    marginBottom: 14,
  },
  conflictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FBBF24',
  },
  conflictDesc: {
    fontSize: 11,
    color: '#FDE68A',
    lineHeight: 16,
  },
  conflictNotice: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
