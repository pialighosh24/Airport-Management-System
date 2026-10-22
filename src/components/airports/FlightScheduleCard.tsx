import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AirportScheduleItem } from '@/types';
import { FreshnessIndicator } from '@/components/common/FreshnessIndicator';
import { useFlight } from '@/context/FlightContext';

interface Props {
  item: AirportScheduleItem;
}

export function FlightScheduleCard({ item }: Props) {
  const { isFlightSaved, toggleSaveFlight } = useFlight();
  const isSaved = isFlightSaved(item.flightNumber);

  const formatClock = (isoString: string | null) => {
    if (!isoString) return 'Unavailable';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isDelayed = item.delayMinutes > 0;

  const getStatusBadge = () => {
    switch (item.status) {
      case 'boarding':
        return { bg: '#ECFDF5', text: '#065F46', label: 'BOARDING' };
      case 'delayed':
        return { bg: '#FFFBEB', text: '#92400E', label: `DELAYED (+${item.delayMinutes}m)` };
      case 'landed':
        return { bg: '#EFF6FF', text: '#1E40AF', label: 'LANDED' };
      case 'departed':
        return { bg: '#F5F3FF', text: '#5B21B6', label: 'DEPARTED' };
      case 'cancelled':
        return { bg: '#FEF2F2', text: '#991B1B', label: 'CANCELLED' };
      case 'scheduled':
      default:
        return { bg: '#F1F5F9', text: '#334155', label: 'ON TIME' };
    }
  };

  const badge = getStatusBadge();

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.flightInfo}>
          <Text style={styles.flightNumber}>{item.flightNumber}</Text>
          <Text style={styles.airlineName}>{item.airlineName}</Text>
        </View>

        <View style={styles.badgesRight}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>

          <TouchableOpacity
            onPress={() => toggleSaveFlight(item.flightNumber)}
            style={styles.saveBtn}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? '#0284C7' : '#94A3B8'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Destination / Origin Line */}
      <View style={styles.destinationRow}>
        <Ionicons
          name={item.type === 'departure' ? 'airplane-outline' : 'airplane'}
          size={16}
          color="#0284C7"
          style={{ transform: [{ rotate: item.type === 'departure' ? '45deg' : '-45deg' }] }}
        />
        <Text style={styles.destinationText}>
          {item.type === 'departure' ? 'To: ' : 'From: '}
          <Text style={styles.destinationCity}>{item.otherAirport.city} </Text>
          <Text style={styles.destinationIata}>({item.otherAirport.iata})</Text>
        </Text>
      </View>

      {/* Timetable Times Comparison */}
      <View style={styles.timeComparisonContainer}>
        {/* Scheduled Time */}
        <View style={styles.timeBlock}>
          <Text style={styles.timeBlockLabel}>SCHEDULED</Text>
          <Text style={styles.timeBlockValue}>{formatClock(item.scheduledTimeUtc)}</Text>
        </View>

        <Ionicons name="arrow-forward" size={14} color="#94A3B8" style={{ marginTop: 12 }} />

        {/* Estimated / Revised Time */}
        <View style={styles.timeBlock}>
          <Text style={styles.timeBlockLabel}>ESTIMATED</Text>
          <Text
            style={[
              styles.timeBlockValue,
              isDelayed && { color: '#D97706' },
              !item.estimatedTimeUtc && { color: '#94A3B8' },
            ]}
          >
            {item.estimatedTimeUtc ? formatClock(item.estimatedTimeUtc) : 'Unavailable'}
          </Text>
        </View>

        {/* Actual Time if departed/landed */}
        {item.actualTimeUtc ? (
          <>
            <Ionicons name="checkmark-done" size={14} color="#059669" style={{ marginTop: 12 }} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>ACTUAL</Text>
              <Text style={[styles.timeBlockValue, { color: '#059669' }]}>
                {formatClock(item.actualTimeUtc)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Facility locations: Terminal, Gate, Carousel */}
      <View style={styles.facilitiesRow}>
        <View style={styles.facilityItem}>
          <Ionicons name="business-outline" size={12} color="#64748B" />
          <Text style={styles.facilityLabel}>Terminal:</Text>
          <Text style={styles.facilityValue}>{item.terminal || 'Unavailable'}</Text>
        </View>

        <View style={styles.facilityItem}>
          <Ionicons name="enter-outline" size={12} color="#64748B" />
          <Text style={styles.facilityLabel}>Gate:</Text>
          <Text
            style={[
              styles.facilityValue,
              !item.gate && { color: '#D97706', fontStyle: 'italic' },
            ]}
          >
            {item.gate || 'Pending Ops'}
          </Text>
        </View>

        {item.type === 'arrival' ? (
          <View style={styles.facilityItem}>
            <Ionicons name="bag-handle-outline" size={12} color="#64748B" />
            <Text style={styles.facilityLabel}>Belt:</Text>
            <Text
              style={[
                styles.facilityValue,
                !item.baggageCarousel && { color: '#94A3B8' },
              ]}
            >
              {item.baggageCarousel || 'Unavailable'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Data Freshness Indicator */}
      <View style={styles.freshnessRow}>
        <FreshnessIndicator freshness={item.freshness} compact />
        <Text style={styles.providerTag}>{item.freshness.providerName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  flightInfo: {
    flex: 1,
  },
  flightNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  airlineName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badgesRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  saveBtn: {
    padding: 4,
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  destinationText: {
    fontSize: 13,
    color: '#64748B',
  },
  destinationCity: {
    fontWeight: '700',
    color: '#0F172A',
  },
  destinationIata: {
    fontWeight: '800',
    color: '#0284C7',
  },
  timeComparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeBlockLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  timeBlockValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  facilityLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  facilityValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  providerTag: {
    fontSize: 10,
    color: '#64748B',
  },
});
