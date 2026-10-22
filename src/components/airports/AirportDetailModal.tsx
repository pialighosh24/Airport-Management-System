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
import { AirportDetail } from '@/types';

interface Props {
  airport: AirportDetail | null;
  visible: boolean;
  onClose: () => void;
  onViewTimetable?: (iataCode: string) => void;
}

export function AirportDetailModal({
  airport,
  visible,
  onClose,
  onViewTimetable,
}: Props) {
  if (!airport) return null;

  const formatType = (type: string | null) => {
    if (!type) return 'Unavailable';
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatCoordinates = (lat: number | null, lon: number | null) => {
    if (lat == null || lon == null) return 'Unavailable';
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
  };

  const formatElevation = (elevM: number | null, elevFt: number | null) => {
    if (elevM == null && elevFt == null) return 'Unavailable';
    if (elevM != null && elevFt != null) {
      return `${elevM} m (${elevFt} ft)`;
    }
    if (elevM != null) return `${elevM} m`;
    return `${elevFt} ft`;
  };

  const coordinatesDisplay = formatCoordinates(airport.latitude, airport.longitude);
  const elevationDisplay = formatElevation(airport.elevation, airport.elevationFt);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                {airport.iata ? (
                  <View style={styles.iataPill}>
                    <Text style={styles.iataPillText}>{airport.iata}</Text>
                  </View>
                ) : null}

                {airport.icao ? (
                  <View style={styles.icaoPill}>
                    <Text style={styles.icaoPillText}>{airport.icao}</Text>
                  </View>
                ) : null}

                <View style={styles.sourcePill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.sourceText}>FREEAIRPORTDB VERIFIED</Text>
                </View>
              </View>

              <Text style={styles.airportTitle}>{airport.name || 'Unnamed Airport'}</Text>
              <Text style={styles.airportSubTitle}>
                {[airport.city, airport.country].filter(Boolean).join(', ') || 'Location Unspecified'}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Identity & Classification Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="airplane-outline" size={16} color="#0284C7" />
                <Text style={styles.sectionTitle}>Airport Classification & Registry</Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>IATA CODE</Text>
                  <Text style={[styles.metricValue, { color: '#0284C7' }]}>
                    {airport.iata || 'Unavailable'}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>ICAO CODE</Text>
                  <Text style={styles.metricValue}>
                    {airport.icao || 'Unavailable'}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>AIRPORT TYPE</Text>
                  <Text style={styles.metricValue}>
                    {formatType(airport.type)}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>DATABASE ID</Text>
                  <Text style={styles.metricValue}>
                    {airport.code || 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Geographical Location Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe-outline" size={16} color="#0284C7" />
                <Text style={styles.sectionTitle}>Geographic & Regional Data</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>City / Municipality</Text>
                <Text style={styles.infoValue}>{airport.city || 'Unavailable'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Region / State</Text>
                <Text style={styles.infoValue}>
                  {airport.region
                    ? `${airport.region}${airport.regionCode ? ` (${airport.regionCode})` : ''}`
                    : 'Unavailable'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Country</Text>
                <Text style={styles.infoValue}>
                  {airport.country
                    ? `${airport.country}${airport.countryCode ? ` (${airport.countryCode})` : ''}`
                    : 'Unavailable'}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Continent</Text>
                <Text style={styles.infoValue}>
                  {airport.continent
                    ? `${airport.continent}${airport.continentCode ? ` (${airport.continentCode})` : ''}`
                    : 'Unavailable'}
                </Text>
              </View>
            </View>

            {/* Navigation & Radar Coordinates Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="compass-outline" size={16} color="#0284C7" />
                <Text style={styles.sectionTitle}>Radar & Elevation Metrics</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Coordinates (GPS)</Text>
                <Text style={[styles.infoValue, { color: '#0284C7', fontFamily: 'monospace' }]}>
                  {coordinatesDisplay}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Elevation AMSL</Text>
                <Text style={styles.infoValue}>{elevationDisplay}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Operational Timezone</Text>
                <Text style={styles.infoValue}>
                  {airport.timezone || 'Unavailable'}
                </Text>
              </View>
            </View>

            {/* Accuracy & Integrity Notice */}
            <View style={styles.noticeCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.noticeTitle}>Authentic Aviation Telemetry</Text>
                <Text style={styles.noticeBody}>
                  Records are fetched directly from the FreeAirportDB public global database. Any missing fields remain strictly null without simulated placeholders.
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {onViewTimetable && airport.iata && (
              <TouchableOpacity
                style={styles.timetableActionBtn}
                onPress={() => {
                  onClose();
                  onViewTimetable(airport.iata!);
                }}
              >
                <Ionicons name="time-outline" size={18} color="#FFFFFF" />
                <Text style={styles.timetableActionBtnText}>
                  View Timetable for {airport.iata}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  iataPill: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  iataPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  icaoPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  icaoPillText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#059669',
    marginRight: 4,
  },
  sourceText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  airportTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  airportSubTitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  noticeTitle: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeBody: {
    color: '#047857',
    fontSize: 11,
    lineHeight: 16,
  },
  timetableActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  timetableActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
