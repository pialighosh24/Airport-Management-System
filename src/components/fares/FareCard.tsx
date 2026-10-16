import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlightFare } from '@/types';

interface Props {
  fare: FlightFare;
  currency?: 'INR' | 'USD';
  onViewBreakdown: (fare: FlightFare) => void;
  onPriceCheck?: (fare: FlightFare) => void;
}

export function FareCard({ fare, currency = 'INR', onViewBreakdown, onPriceCheck }: Props) {
  const isUSD = currency === 'USD';

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

  const displayTotal = isUSD
    ? `$${fare.totalFareUsd}`
    : `₹${(fare.totalFareInr || fare.totalFareUsd * 84).toLocaleString('en-IN')}`;

  const extraBagText = isUSD
    ? `No Checked Bag (+$${fare.baggage.extraCheckedBagFeeUsd || 50})`
    : `No Checked Bag (+₹${(fare.baggage.extraCheckedBagFeeInr || (fare.baggage.extraCheckedBagFeeUsd || 50) * 84).toLocaleString('en-IN')})`;

  return (
    <View style={styles.card}>
      {/* Top Header: Airline, Flight No, Supplier & Class */}
      <View style={styles.headerRow}>
        <View style={styles.airlineBadge}>
          <Text style={styles.airlineText}>{fare.airlineName}</Text>
          <Text style={styles.flightNumberText}>{fare.flightNumber}</Text>
          {fare.supplierName && (
            <View style={styles.supplierPill}>
              <Text style={styles.supplierText}>{fare.supplierName}</Text>
            </View>
          )}
        </View>

        <View style={styles.classBadge}>
          <Text style={styles.classText}>{fare.travelClass}</Text>
        </View>
      </View>

      {/* Flight Timing, Route & Stops */}
      <View style={styles.itineraryRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.clockText}>{depTime}</Text>
          <Text style={styles.iataText}>{fare.originIata}</Text>
          {fare.originCity && (
            <Text style={styles.cityText} numberOfLines={1}>{fare.originCity}</Text>
          )}
        </View>

        <View style={styles.flightDurationBlock}>
          <Text style={styles.durationText}>{formatDuration(fare.durationMinutes)}</Text>
          <View style={styles.flightLine}>
            <View style={styles.flightLineBar} />
            <Ionicons name="airplane" size={14} color="#38BDF8" style={styles.planeIcon} />
          </View>
          <Text style={[styles.stopsText, fare.stopsCount === 0 && { color: '#10B981' }]}>
            {fare.stopsCount === 0 ? 'Non-stop' : `${fare.stopsCount} stop`}
          </Text>
        </View>

        <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
          <Text style={styles.clockText}>{arrTime}</Text>
          <Text style={styles.iataText}>{fare.destinationIata}</Text>
          {fare.destinationCity && (
            <Text style={styles.cityText} numberOfLines={1}>{fare.destinationCity}</Text>
          )}
        </View>
      </View>

      {/* Explicit Baggage Transparency Section */}
      <View style={styles.baggageSection}>
        <View style={styles.baggageHeaderRow}>
          <Text style={styles.baggageHeader}>EXPLICIT BAGGAGE ALLOWANCE</Text>
          <Text style={styles.baggageSub}>Zero Unbundled Surprises</Text>
        </View>

        <View style={styles.baggageItemsRow}>
          {/* Personal Item */}
          <View style={styles.baggageItem}>
            <Ionicons
              name={fare.baggage.personalItemIncluded ? 'checkmark-circle' : 'close-circle'}
              size={13}
              color={fare.baggage.personalItemIncluded ? '#10B981' : '#EF4444'}
            />
            <Text style={styles.baggageLabel}>Personal: Free</Text>
          </View>

          {/* Cabin Bag */}
          <View style={styles.baggageItem}>
            <Ionicons
              name={fare.baggage.cabinBagIncluded ? 'checkmark-circle' : 'close-circle'}
              size={13}
              color={fare.baggage.cabinBagIncluded ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.baggageLabel}>
              {fare.baggage.cabinBagIncluded
                ? `Cabin (${fare.baggage.cabinBagWeightKg}kg)`
                : 'No Cabin Bag'}
            </Text>
          </View>

          {/* Checked Bag */}
          <View style={[styles.baggageItem, { flex: 1.4 }]}>
            <Ionicons
              name={fare.baggage.checkedBagIncluded ? 'checkmark-circle' : 'alert-circle'}
              size={13}
              color={fare.baggage.checkedBagIncluded ? '#10B981' : '#F59E0B'}
            />
            <Text
              style={[
                styles.baggageLabel,
                !fare.baggage.checkedBagIncluded && { color: '#F59E0B' },
              ]}
              numberOfLines={1}
            >
              {fare.baggage.checkedBagIncluded
                ? `Checked (${fare.baggage.checkedBagWeightKg}kg incl.)`
                : extraBagText}
            </Text>
          </View>
        </View>
      </View>

      {/* Pricing, Verification & Transparency Guarantee */}
      <View style={styles.priceFooterRow}>
        <View>
          <View style={styles.guaranteeRow}>
            <Ionicons name="shield-checkmark" size={13} color="#10B981" />
            <Text style={styles.guaranteeText}>Zero Hidden Fees Guarantee</Text>
          </View>
          <Text style={styles.seatsLeftText}>Only {fare.availableSeats} seats at this tier</Text>
        </View>

        <View style={styles.priceRightBlock}>
          <Text style={styles.totalPriceText}>{displayTotal}</Text>
          
          <View style={styles.actionButtonsRow}>
            {onPriceCheck && (
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => onPriceCheck(fare)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={12} color="#10B981" />
                <Text style={styles.verifyBtnText}>Revalidate</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.breakdownLink}
              onPress={() => onViewBreakdown(fare)}
              activeOpacity={0.7}
            >
              <Text style={styles.breakdownLinkText}>Breakdown</Text>
              <Ionicons name="chevron-forward" size={12} color="#38BDF8" />
            </TouchableOpacity>
          </View>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  airlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  airlineText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  flightNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  supplierPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  supplierText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '600',
  },
  classBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  itineraryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A1329',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  timeBlock: {
    minWidth: 70,
  },
  clockText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  iataText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#38BDF8',
    marginTop: 2,
  },
  cityText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  flightDurationBlock: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  flightLine: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
    position: 'relative',
  },
  flightLineBar: {
    width: '100%',
    height: 1.5,
    backgroundColor: '#1E293B',
  },
  planeIcon: {
    position: 'absolute',
    backgroundColor: '#0A1329',
    paddingHorizontal: 2,
  },
  stopsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 4,
  },
  baggageSection: {
    backgroundColor: '#0B152E',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#182444',
  },
  baggageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  baggageHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  baggageSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#10B981',
  },
  baggageItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baggageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  baggageLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  priceFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  guaranteeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  seatsLeftText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priceRightBlock: {
    alignItems: 'flex-end',
  },
  totalPriceText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 3,
  },
  verifyBtnText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  breakdownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  breakdownLinkText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
  },
});
