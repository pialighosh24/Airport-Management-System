import React, { useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AircraftTelemetry, FreshnessStatus } from '@/types';
import { FreshnessIndicator } from '@/components/common/FreshnessIndicator';

// Attempt to load react-native-maps only on native platforms to prevent web bundling failures
let MapView: any = null;
let Marker: any = null;
let Callout: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const MapsModule = require('react-native-maps');
    MapView = MapsModule.default || MapsModule.MapView;
    Marker = MapsModule.Marker;
    Callout = MapsModule.Callout;
    PROVIDER_GOOGLE = MapsModule.PROVIDER_GOOGLE;
  } catch (e) {
    // Graceful fallback if native binaries are not yet compiled
    MapView = null;
  }
}

export interface HubAirport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

const DEFAULT_MAP_AIRPORTS: HubAirport[] = [
  { iata: 'DEL', icao: 'VIDP', name: 'Indira Gandhi Intl', city: 'Delhi', country: 'India', latitude: 28.5562, longitude: 77.1000 },
  { iata: 'BOM', icao: 'VABB', name: 'Chhatrapati Shivaji Intl', city: 'Mumbai', country: 'India', latitude: 19.0896, longitude: 72.8656 },
  { iata: 'CCU', icao: 'VECC', name: 'Netaji Subhash Chandra Bose Intl', city: 'Kolkata', country: 'India', latitude: 22.6547, longitude: 88.4467 },
  { iata: 'BLR', icao: 'VOBL', name: 'Kempegowda Intl', city: 'Bengaluru', country: 'India', latitude: 13.1986, longitude: 77.7066 },
  { iata: 'JFK', icao: 'KJFK', name: 'John F. Kennedy Intl', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781 },
  { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow Airport', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543 },
  { iata: 'FRA', icao: 'EDDF', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', latitude: 50.0379, longitude: 8.5622 },
  { iata: 'DXB', icao: 'OMDB', name: 'Dubai International', city: 'Dubai', country: 'UAE', latitude: 25.2532, longitude: 55.3657 },
  { iata: 'SIN', icao: 'WSSS', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
  { iata: 'ZRH', icao: 'LSZH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', latitude: 47.4582, longitude: 8.5555 },
];

interface MobileMapViewProps {
  aircraftList: AircraftTelemetry[];
  selectedAircraft: AircraftTelemetry | null;
  onSelectAircraft: (aircraft: AircraftTelemetry | null) => void;
  onOpenDetails?: (aircraft: AircraftTelemetry) => void;
  airspacePreset?: string;
  isLive?: boolean;
}

export function MobileMapView({
  aircraftList,
  selectedAircraft,
  onSelectAircraft,
  onOpenDetails,
  airspacePreset = 'europe',
  isLive = false,
}: MobileMapViewProps) {
  const mapRef = useRef<any>(null);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');

  // Filter out any aircraft missing valid coordinates (unknown stays unknown)
  const validAircraft = useMemo(() => {
    return aircraftList.filter(
      (a) =>
        typeof a.latitude === 'number' &&
        typeof a.longitude === 'number' &&
        isFinite(a.latitude) &&
        isFinite(a.longitude) &&
        a.latitude >= -90 &&
        a.latitude <= 90 &&
        a.longitude >= -180 &&
        a.longitude <= 180
    );
  }, [aircraftList]);

  // Compute center region based on preset or aircraft coordinates
  const initialRegion = useMemo(() => {
    if (airspacePreset === 'us_east') {
      return {
        latitude: 40.5,
        longitude: -74.5,
        latitudeDelta: 6.0,
        longitudeDelta: 6.0,
      };
    }
    if (airspacePreset === 'india') {
      return {
        latitude: 22.0,
        longitude: 79.0,
        latitudeDelta: 16.0,
        longitudeDelta: 16.0,
      };
    }
    // Default: Central Europe
    return {
      latitude: 49.5,
      longitude: 9.5,
      latitudeDelta: 8.0,
      longitudeDelta: 8.0,
    };
  }, [airspacePreset]);

  const handleFitAllAircraft = () => {
    if (!mapRef.current || validAircraft.length === 0) return;

    const coords = validAircraft.map((a) => ({
      latitude: a.latitude!,
      longitude: a.longitude!,
    }));

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
      animated: true,
    });
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(initialRegion, 800);
  };

  // Determine marker pin color
  const getMarkerColor = (a: AircraftTelemetry) => {
    if (a.freshness?.status === 'stale') return '#F59E0B'; // Amber
    if (a.altitudeFeet != null && a.altitudeFeet < 3000) return '#38BDF8'; // Cyan
    if (a.verticalRateFpm != null && a.verticalRateFpm < -500) return '#EC4899'; // Pink
    return '#10B981'; // Green (cruising / valid)
  };

  // WEB OR FALLBACK VIEW (When native react-native-maps is not mounted)
  if (Platform.OS === 'web' || !MapView) {
    return (
      <View style={styles.webFallbackContainer}>
        <View style={styles.webHeader}>
          <View style={styles.webHeaderLeft}>
            <Ionicons name="map-outline" size={20} color="#38BDF8" />
            <Text style={styles.webHeaderTitle}>Geographic GIS Map View</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.badgePill, { backgroundColor: '#0284C7' }]}>
              <Text style={styles.badgeText}>REACT NATIVE MAPS</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: isLive ? '#059669' : '#D97706' }]}>
              <Text style={styles.badgeText}>{isLive ? 'LIVE OPENSKY' : 'DEMO FLEET'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.webNoticeBox}>
          <Ionicons name="information-circle" size={16} color="#38BDF8" />
          <Text style={styles.webNoticeText}>
            Native vector mapping (Google Maps & Apple Maps) is active for mobile builds.
            Below is the real-time geographic coordinate projection for {validAircraft.length} active aircraft.
          </Text>
        </View>

        <ScrollView style={styles.geoList}>
          {validAircraft.map((a, idx) => (
            <TouchableOpacity
              key={a.icao24 || a.callsign || idx}
              style={[
                styles.geoCard,
                selectedAircraft?.icao24 === a.icao24 && styles.geoCardSelected,
              ]}
              onPress={() => {
                onSelectAircraft(a);
                if (onOpenDetails) onOpenDetails(a);
              }}
            >
              <View style={styles.geoCardTop}>
                <View style={styles.geoCallsignCol}>
                  <Text style={styles.geoCallsign}>{a.callsign || a.flightNumber || 'UNTITLED'}</Text>
                  <Text style={styles.geoIcao}>ICAO24: {a.icao24?.toUpperCase() || 'UNKNOWN'}</Text>
                </View>
                <View style={styles.geoStatusCol}>
                  <Text style={[styles.geoStatusBadge, { color: getMarkerColor(a) }]}>
                    {a.altitudeFeet != null ? `${a.altitudeFeet.toLocaleString()} FT` : 'ALT UNK'}
                  </Text>
                  <Text style={styles.geoSpeedText}>
                    {a.groundSpeedKnots != null ? `${a.groundSpeedKnots} KTS` : 'SPD UNK'}
                  </Text>
                </View>
              </View>

              <View style={styles.geoCoordsRow}>
                <Ionicons name="location-outline" size={13} color="#94A3B8" />
                <Text style={styles.geoCoordsText}>
                  Lat: {a.latitude?.toFixed(4)}° • Lon: {a.longitude?.toFixed(4)}°
                  {a.headingDegrees != null ? ` • Heading: ${a.headingDegrees}°` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // NATIVE MOBILE MAP VIEW (iOS & Android)
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={initialRegion}
        mapType={mapType}
        showsCompass={true}
        showsScale={true}
      >
        {/* Render Airport Hub Pins */}
        {DEFAULT_MAP_AIRPORTS.map((apt) => (
          <Marker
            key={`apt-${apt.iata}`}
            coordinate={{ latitude: apt.latitude, longitude: apt.longitude }}
            title={`${apt.iata} — ${apt.name}`}
            description={`${apt.city}, ${apt.country} (${apt.icao})`}
            pinColor="#38BDF8"
          >
            <View style={styles.airportMarkerBadge}>
              <Ionicons name="business" size={11} color="#FFFFFF" />
              <Text style={styles.airportMarkerText}>{apt.iata}</Text>
            </View>
          </Marker>
        ))}

        {/* Render Aircraft Position Markers */}
        {validAircraft.map((aircraft, index) => {
          const isSelected = selectedAircraft?.icao24 === aircraft.icao24;
          const pinColor = getMarkerColor(aircraft);
          const rotation = aircraft.headingDegrees || 0;

          return (
            <Marker
              key={aircraft.icao24 || `ac-${index}`}
              coordinate={{
                latitude: aircraft.latitude!,
                longitude: aircraft.longitude!,
              }}
              onPress={() => onSelectAircraft(aircraft)}
              tracksViewChanges={false}
            >
              <View style={[styles.aircraftPinContainer, isSelected && styles.aircraftPinSelected]}>
                <View
                  style={[
                    styles.aircraftIconCircle,
                    { backgroundColor: pinColor },
                    isSelected && { borderColor: '#FFFFFF', borderWidth: 2 },
                  ]}
                >
                  <Ionicons
                    name="airplane"
                    size={14}
                    color="#FFFFFF"
                    style={{ transform: [{ rotate: `${rotation}deg` }] }}
                  />
                </View>

                <View style={styles.aircraftCallsignTag}>
                  <Text style={styles.aircraftCallsignTagText} numberOfLines={1}>
                    {aircraft.callsign || aircraft.flightNumber || 'FLT'}
                  </Text>
                </View>
              </View>

              {Callout && (
                <Callout
                  tooltip={false}
                  onPress={() => {
                    if (onOpenDetails) onOpenDetails(aircraft);
                  }}
                >
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle}>
                      {aircraft.callsign || aircraft.flightNumber || 'Aircraft'}
                    </Text>
                    <Text style={styles.calloutSubtitle}>
                      ICAO24: {aircraft.icao24?.toUpperCase()} • {aircraft.countryOfRegistration || 'Unknown'}
                    </Text>

                    <View style={styles.calloutMetricsRow}>
                      <Text style={styles.calloutMetric}>
                        Alt: {aircraft.altitudeFeet != null ? `${aircraft.altitudeFeet.toLocaleString()} ft` : 'N/A'}
                      </Text>
                      <Text style={styles.calloutMetric}>
                        Speed: {aircraft.groundSpeedKnots != null ? `${aircraft.groundSpeedKnots} kts` : 'N/A'}
                      </Text>
                    </View>

                    <Text style={styles.calloutActionText}>Tap for Full Telemetry Sheet →</Text>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}
      </MapView>

      {/* Map Control Buttons Overlay */}
      <View style={styles.controlsOverlay}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleRecenter}
          accessibilityLabel="Recenter Map"
        >
          <Ionicons name="navigate-outline" size={18} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={handleFitAllAircraft}
          accessibilityLabel="Fit Active Aircraft"
        >
          <Ionicons name="scan-outline" size={18} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, mapType === 'hybrid' && styles.controlBtnActive]}
          onPress={() => setMapType((prev) => (prev === 'standard' ? 'hybrid' : 'standard'))}
          accessibilityLabel="Toggle Satellite View"
        >
          <Ionicons name="earth" size={18} color={mapType === 'hybrid' ? '#FFFFFF' : '#0F172A'} />
        </TouchableOpacity>
      </View>

      {/* Bottom Summary Strip */}
      <View style={styles.mapInfoStrip}>
        <View style={styles.stripLeft}>
          <Ionicons name="radio" size={14} color="#059669" />
          <Text style={styles.stripText}>
            {validAircraft.length} Aircraft Plotted • {DEFAULT_MAP_AIRPORTS.length} Hubs
          </Text>
        </View>
        <Text style={styles.stripModeText}>
          {isLive ? 'LIVE ADS-B' : 'SIMULATED DEMO'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  airportMarkerBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  airportMarkerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  aircraftPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aircraftPinSelected: {
    transform: [{ scale: 1.25 }],
  },
  aircraftIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 3,
    elevation: 4,
  },
  aircraftCallsignTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  aircraftCallsignTagText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '800',
  },
  calloutCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    minWidth: 175,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  calloutTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  calloutSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  calloutMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  calloutMetric: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  calloutActionText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  controlBtn: {
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  controlBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#0284C7',
  },
  mapInfoStrip: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  stripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  stripModeText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Web Fallback styles
  webFallbackContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webHeaderTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  webNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  webNoticeText: {
    color: '#0369A1',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  geoList: {
    flex: 1,
  },
  geoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  geoCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  geoCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  geoCallsignCol: {
    flex: 1,
  },
  geoCallsign: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  geoIcao: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  geoStatusCol: {
    alignItems: 'flex-end',
  },
  geoStatusBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  geoSpeedText: {
    color: '#475569',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '600',
  },
  geoCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  geoCoordsText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
