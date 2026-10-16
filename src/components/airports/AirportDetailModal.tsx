import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AirportDetail, AirportWeather } from '@/types';
import { apiService } from '@/services/api';

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
  const [weatherData, setWeatherData] = useState<AirportWeather | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !airport) {
      setWeatherData(null);
      setWeatherError(null);
      return;
    }

    let isMounted = true;
    setIsLoadingWeather(true);
    setWeatherError(null);

    const query: { lat?: number; lon?: number; airport?: string } = {};
    if (airport.latitude != null && airport.longitude != null) {
      query.lat = airport.latitude;
      query.lon = airport.longitude;
    }
    if (airport.iata) {
      query.airport = airport.iata;
    } else if (airport.icao) {
      query.airport = airport.icao;
    }

    apiService
      .getAirportWeather(query)
      .then((res) => {
        if (isMounted) {
          if (res && res.success) {
            setWeatherData(res);
          } else {
            setWeatherError('Weather data unavailable for this location.');
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Could not fetch weather.';
          setWeatherError(msg);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingWeather(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible, airport]);

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
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Identity & Classification Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="airplane-outline" size={16} color="#38BDF8" />
                <Text style={styles.sectionTitle}>Airport Classification & Registry</Text>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricLabel}>IATA CODE</Text>
                  <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
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

            {/* Live Open-Meteo Weather Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="partly-sunny-outline" size={16} color="#38BDF8" />
                <Text style={styles.sectionTitle}>Live Meteorological Forecast</Text>
                <View style={styles.weatherBadge}>
                  <View style={[styles.pulseDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={styles.weatherBadgeText}>OPEN-METEO LIVE</Text>
                </View>
              </View>

              {isLoadingWeather ? (
                <View style={styles.weatherLoadingContainer}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.weatherLoadingText}>Retrieving surface conditions...</Text>
                </View>
              ) : weatherData ? (
                <View>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>SURFACE TEMP</Text>
                      <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                        {weatherData.weather.temperatureC != null
                          ? `${weatherData.weather.temperatureC}°C`
                          : 'Unavailable'}
                      </Text>
                    </View>

                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>SURFACE WIND</Text>
                      <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                        {weatherData.weather.windSpeedKnots != null
                          ? `${weatherData.weather.windSpeedKnots} kts`
                          : 'Unavailable'}
                        {weatherData.weather.windDirectionDeg != null
                          ? ` @ ${weatherData.weather.windDirectionDeg}°`
                          : ''}
                      </Text>
                    </View>

                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>CONDITION</Text>
                      <Text style={styles.metricValue}>
                        {weatherData.weather.condition || 'Fair'}
                      </Text>
                    </View>

                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>HUMIDITY</Text>
                      <Text style={styles.metricValue}>
                        {weatherData.weather.relativeHumidityPct != null
                          ? `${weatherData.weather.relativeHumidityPct}%`
                          : 'Unavailable'}
                      </Text>
                    </View>
                  </View>

                  {/* Weather Disclaimer */}
                  <View style={styles.weatherDisclaimerBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
                    <Text style={styles.weatherDisclaimerText}>
                      {weatherData.disclaimer}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.weatherUnavailableText}>
                  {weatherError || 'Weather data unavailable for this airport.'}
                </Text>
              )}
            </View>

            {/* Geographical Location Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe-outline" size={16} color="#38BDF8" />
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
                <Ionicons name="compass-outline" size={16} color="#38BDF8" />
                <Text style={styles.sectionTitle}>Radar & Elevation Metrics</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Coordinates (GPS)</Text>
                <Text style={[styles.infoValue, { color: '#38BDF8', fontFamily: 'monospace' }]}>
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
              <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" style={{ marginTop: 2 }} />
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
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                <Text style={styles.timetableActionBtnText}>
                  View {airport.iata} Hub Flight Timetables
                </Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: '#0A1128',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  icaoPillText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 12,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  sourceText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  airportTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 2,
  },
  airportSubTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  scrollContent: {
    flexGrow: 0,
  },
  sectionCard: {
    backgroundColor: '#0F1A36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  weatherBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  weatherBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weatherLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  weatherLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  weatherUnavailableText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  weatherDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    gap: 6,
  },
  weatherDisclaimerText: {
    color: '#64748B',
    fontSize: 10,
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#131D38',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  infoLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6, 78, 59, 0.2)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 14,
  },
  noticeTitle: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeBody: {
    color: '#94A3B8',
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
