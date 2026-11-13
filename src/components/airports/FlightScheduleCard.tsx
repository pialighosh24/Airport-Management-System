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
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', label: 'BOARDING' };
      case 'delayed':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: `DELAYED (+${item.delayMinutes}m)` };
      case 'landed':
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: 'LANDED' };
      case 'departed':
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', label: 'DEPARTED' };
      case 'cancelled':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', label: 'CANCELLED' };
      case 'scheduled':
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label: 'ON TIME' };
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
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
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
              isDelayed && { color: '#B45309', fontWeight: '800' },
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
          <Ionicons name="business-outline" size={13} color="#64748B" />
          <Text style={styles.facilityLabel}>Terminal:</Text>
          <Text style={styles.facilityValue}>{item.terminal || 'Unavailable'}</Text>
        </View>

        <View style={styles.facilityItem}>
          <Ionicons name="enter-outline" size={13} color="#64748B" />
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
            <Ionicons name="bag-handle-outline" size={13} color="#64748B" />
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
            size={13}
            color={isSaved ? '#0284C7' : '#64748B'}
          />
          <Text style={[styles.alertActionBtnText, isSaved && { color: '#0284C7' }]}>
            {isSaved ? 'Alert Active' : 'Set Delay Alert'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    borderWidth: 1,
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
    color: '#475569',
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 12,
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
    gap: 14,
    paddingBottom: 10,
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
    color: '#1E293B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
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
    fontWeight: '500',
  },
  alertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertActionBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  alertActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});

