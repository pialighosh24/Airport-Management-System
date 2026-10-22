import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlightFare } from '@/types';

interface Props {
  fare: FlightFare;
  onViewBreakdown: (fare: FlightFare) => void;
}

export function FareCard({ fare, onViewBreakdown }: Props) {
  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const depTime = new Date(fare.departureTimeUtc).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const arrTime = new Date(fare.arrivalTimeUtc).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.airlineBadge}>
          <Text style={styles.airlineText}>{fare.airlineName}</Text>
          <Text style={styles.flightNumberText}>{fare.flightNumber}</Text>
        </View>

        <View style={styles.classBadge}>
          <Text style={styles.classText}>{fare.travelClass}</Text>
        </View>
      </View>

      {/* Flight Timing & Stops */}
      <View style={styles.itineraryRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.clockText}>{depTime}</Text>
          <Text style={styles.iataText}>{fare.originIata}</Text>
        </View>

        <View style={styles.flightDurationBlock}>
          <Text style={styles.durationText}>{formatDuration(fare.durationMinutes)}</Text>
          <View style={styles.flightLine}>
            <View style={styles.flightLineBar} />
            <Ionicons name="airplane" size={14} color="#0284C7" style={styles.planeIcon} />
          </View>
          <Text style={[styles.stopsText, fare.stopsCount === 0 && { color: '#059669' }]}>
            {fare.stopsCount === 0 ? 'Non-stop' : `${fare.stopsCount} stop`}
          </Text>
        </View>

        <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.clockText}>{arrTime}</Text>
          <Text style={styles.iataText}>{fare.destinationIata}</Text>
        </View>
      </View>

      {/* Explicit Baggage Transparency Section */}
      <View style={styles.baggageSection}>
        <Text style={styles.baggageHeader}>EXPLICIT BAGGAGE POLICY</Text>

        <View style={styles.baggageItemsRow}>
          {/* Personal Item */}
          <View style={styles.baggageItem}>
            <Ionicons
              name={fare.baggage.personalItemIncluded ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={fare.baggage.personalItemIncluded ? '#059669' : '#DC2626'}
            />
            <Text style={styles.baggageLabel}>Personal Item: Free</Text>
          </View>

          {/* Cabin Bag */}
          <View style={styles.baggageItem}>
            <Ionicons
              name={fare.baggage.cabinBagIncluded ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={fare.baggage.cabinBagIncluded ? '#059669' : '#D97706'}
            />
            <Text style={styles.baggageLabel}>
              {fare.baggage.cabinBagIncluded
                ? `Cabin Bag (${fare.baggage.cabinBagWeightKg}kg)`
                : 'No Cabin Bag'}
            </Text>
          </View>

          {/* Checked Bag */}
          <View style={styles.baggageItem}>
            <Ionicons
              name={fare.baggage.checkedBagIncluded ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={fare.baggage.checkedBagIncluded ? '#059669' : '#D97706'}
            />
            <Text
              style={[
                styles.baggageLabel,
                !fare.baggage.checkedBagIncluded && { color: '#D97706', fontWeight: '600' },
              ]}
            >
              {fare.baggage.checkedBagIncluded
                ? `Checked Bag (${fare.baggage.checkedBagWeightKg}kg)`
                : `No Checked Bag (+$${fare.baggage.extraCheckedBagFeeUsd})`}
            </Text>
          </View>
        </View>
      </View>

      {/* Pricing & Transparency Guarantee */}
      <View style={styles.priceFooterRow}>
        <View>
          <View style={styles.guaranteeRow}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text style={styles.guaranteeText}>Zero Hidden Fees Guarantee</Text>
          </View>
          <Text style={styles.seatsLeftText}>Only {fare.availableSeats} seats remaining</Text>
        </View>

        <View style={styles.priceRightBlock}>
          <Text style={styles.totalPriceText}>${fare.totalFareUsd}</Text>
          <TouchableOpacity
            style={styles.breakdownLink}
            onPress={() => onViewBreakdown(fare)}
          >
            <Text style={styles.breakdownLinkText}>View Breakdown</Text>
            <Ionicons name="chevron-forward" size={12} color="#0284C7" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  airlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  flightNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  itineraryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeBlock: {
    minWidth: 64,
  },
  clockText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  iataText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  flightDurationBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  durationText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  flightLine: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  flightLineBar: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#CBD5E1',
  },
  planeIcon: {
    position: 'absolute',
  },
  stopsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  baggageSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  baggageHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  baggageItemsRow: {
    gap: 5,
  },
  baggageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  baggageLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  priceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guaranteeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  seatsLeftText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  priceRightBlock: {
    alignItems: 'flex-end',
  },
  totalPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  breakdownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  breakdownLinkText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
});
