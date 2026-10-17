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
            <Ionicons name="airplane" size={14} color="#0284C7" style={styles.planeIcon} />
          </View>
          <Text style={[styles.stopsText, fare.stopsCount === 0 && { color: '#059669' }]}>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  airlineText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  flightNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supplierPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  supplierText: {
    fontSize: 10,
    color: '#0284C7',
    fontWeight: '700',
  },
  classBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  itineraryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  timeBlock: {
    minWidth: 70,
  },
  clockText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  iataText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  cityText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  flightDurationBlock: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  durationText: {
    fontSize: 11,
    color: '#64748B',
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
    backgroundColor: '#CBD5E1',
  },
  planeIcon: {
    position: 'absolute',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 3,
  },
  stopsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  baggageSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  baggageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  baggageHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  baggageSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
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
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
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
    marginBottom: 2,
  },
  guaranteeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  seatsLeftText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  priceRightBlock: {
    alignItems: 'flex-end',
  },
  totalPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 4,
  },
  verifyBtnText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
  },
  breakdownLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
  },
  breakdownLinkText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '700',
  },
});
