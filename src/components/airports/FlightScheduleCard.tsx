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
  const { isFlightSaved, toggleSaveFlight, simulateTriggerAlert } = useFlight();
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
        return { bg: '#065F46', text: '#34D399', label: 'BOARDING' };
      case 'delayed':
        return { bg: '#78350F', text: '#FBBF24', label: `DELAYED (+${item.delayMinutes}m)` };
      case 'landed':
        return { bg: '#1E3A8A', text: '#60A5FA', label: 'LANDED' };
      case 'departed':
        return { bg: '#312E81', text: '#A5B4FC', label: 'DEPARTED' };
      case 'cancelled':
        return { bg: '#7F1D1D', text: '#F87171', label: 'CANCELLED' };
      case 'scheduled':
      default:
        return { bg: '#1E293B', text: '#94A3B8', label: 'ON TIME' };
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
              color={isSaved ? '#38BDF8' : '#64748B'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Destination / Origin Line */}
      <View style={styles.destinationRow}>
        <Ionicons
          name={item.type === 'departure' ? 'airplane-outline' : 'airplane'}
          size={16}
          color="#38BDF8"
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

        <Ionicons name="arrow-forward" size={14} color="#64748B" style={{ marginTop: 12 }} />

        {/* Estimated / Revised Time */}
        <View style={styles.timeBlock}>
          <Text style={styles.timeBlockLabel}>ESTIMATED</Text>
          <Text
            style={[
              styles.timeBlockValue,
              isDelayed && { color: '#F59E0B' },
              !item.estimatedTimeUtc && { color: '#94A3B8' },
            ]}
          >
            {item.estimatedTimeUtc ? formatClock(item.estimatedTimeUtc) : 'Unavailable'}
          </Text>
        </View>

        {/* Actual Time if departed/landed */}
        {item.actualTimeUtc ? (
          <>
            <Ionicons name="checkmark-done" size={14} color="#10B981" style={{ marginTop: 12 }} />
            <View style={styles.timeBlock}>
              <Text style={styles.timeBlockLabel}>ACTUAL</Text>
              <Text style={[styles.timeBlockValue, { color: '#10B981' }]}>
                {formatClock(item.actualTimeUtc)}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Facility locations: Terminal, Gate, Carousel */}
      <View style={styles.facilitiesRow}>
        <View style={styles.facilityItem}>
          <Ionicons name="business-outline" size={12} color="#94A3B8" />
          <Text style={styles.facilityLabel}>Terminal:</Text>
          <Text style={styles.facilityValue}>{item.terminal || 'Unavailable'}</Text>
        </View>

        <View style={styles.facilityItem}>
          <Ionicons name="enter-outline" size={12} color="#94A3B8" />
          <Text style={styles.facilityLabel}>Gate:</Text>
          <Text
            style={[
              styles.facilityValue,
              !item.gate && { color: '#F59E0B', fontStyle: 'italic' },
            ]}
          >
            {item.gate || 'Pending Ops'}
          </Text>
        </View>

        {item.type === 'arrival' ? (
          <View style={styles.facilityItem}>
            <Ionicons name="bag-handle-outline" size={12} color="#94A3B8" />
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

      {/* Data Freshness & Alert Quick Action Row */}
      <View style={styles.actionRow}>
        <View style={styles.freshnessGroup}>
          <FreshnessIndicator freshness={item.freshness} compact />
          <Text style={styles.providerTag}>{item.freshness.providerName}</Text>
        </View>

        <TouchableOpacity
          style={[styles.alertActionBtn, isSaved && styles.alertActionBtnActive]}
          onPress={() => {
            if (!isSaved) {
              toggleSaveFlight(item.flightNumber);
            }
            simulateTriggerAlert(item.flightNumber, 'delay');
          }}
        >
          <Ionicons
            name={isSaved ? 'notifications' : 'notifications-outline'}
            size={12}
            color={isSaved ? '#38BDF8' : '#94A3B8'}
          />
          <Text style={[styles.alertActionBtnText, isSaved && { color: '#38BDF8' }]}>
            {isSaved ? 'Alert Active' : 'Set Delay Alert'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F1A36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#F8FAFC',
  },
  airlineName: {
    fontSize: 12,
    color: '#94A3B8',
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
    letterSpacing: 0.5,
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
    color: '#94A3B8',
  },
  destinationCity: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  destinationIata: {
    fontWeight: '800',
    color: '#38BDF8',
  },
  timeComparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0A1329',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 10,
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
    color: '#F8FAFC',
  },
  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 4,
  },
  freshnessGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerTag: {
    fontSize: 10,
    color: '#64748B',
  },
  alertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertActionBtnActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  alertActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
});

