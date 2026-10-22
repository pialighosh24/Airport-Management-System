import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AirportDetail } from '@/types';

interface Props {
  airport: AirportDetail;
  onPress: (airport: AirportDetail) => void;
}

export function AirportCard({ airport, onPress }: Props) {
  const formatType = (type: string | null) => {
    if (!type) return 'Airport';
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatCoordinates = (lat: number | null, lon: number | null) => {
    if (lat == null || lon == null) return null;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
  };

  const coordinatesStr = formatCoordinates(airport.latitude, airport.longitude);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(airport)}
      activeOpacity={0.7}
    >
      {/* Top Header Row: IATA, ICAO, Type badge */}
      <View style={styles.topRow}>
        <View style={styles.codeGroup}>
          {airport.iata ? (
            <View style={styles.iataBadge}>
              <Text style={styles.iataText}>{airport.iata}</Text>
            </View>
          ) : null}

          {airport.icao ? (
            <View style={styles.icaoBadge}>
              <Text style={styles.icaoText}>{airport.icao}</Text>
            </View>
          ) : null}

          {!airport.iata && !airport.icao && airport.code ? (
            <View style={styles.icaoBadge}>
              <Text style={styles.icaoText}>{airport.code}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{formatType(airport.type)}</Text>
        </View>
      </View>

      {/* Airport Name */}
      <Text style={styles.airportName} numberOfLines={2}>
        {airport.name || 'Unnamed Airport'}
      </Text>

      {/* Location Line */}
      <View style={styles.locationRow}>
        <Ionicons name="location-sharp" size={14} color="#38BDF8" style={{ marginRight: 5 }} />
        <Text style={styles.locationText} numberOfLines={1}>
          {[airport.city, airport.region, airport.country].filter(Boolean).join(', ') || 'Location unavailable'}
        </Text>
      </View>

      {/* Bottom Meta Strip: Timezone & Coordinates */}
      <View style={styles.metaStrip}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>
            {airport.timezone || 'Timezone: Unknown'}
          </Text>
        </View>

        {coordinatesStr ? (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>{coordinatesStr}</Text>
          </View>
        ) : null}

        <View style={styles.arrowIcon}>
          <Ionicons name="chevron-forward" size={16} color="#64748B" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iataBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  iataText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  icaoBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  icaoText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  typeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  typeText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '600',
  },
  airportName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  arrowIcon: {
    marginLeft: 'auto',
  },
});
