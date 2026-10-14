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
import { FlightFare } from '@/types';

interface Props {
  fare: FlightFare | null;
  visible: boolean;
  onClose: () => void;
}

export function FareBreakdownModal({ fare, visible, onClose }: Props) {
  if (!fare) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Transparent Fee Breakdown</Text>
              <Text style={styles.subtitle}>
                {fare.airlineName} • {fare.flightNumber} ({fare.originIata} ➔ {fare.destinationIata})
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Price line items */}
            <View style={styles.lineItemsContainer}>
              <View style={styles.lineItem}>
                <Text style={styles.itemLabel}>Base Airfare ({fare.travelClass})</Text>
                <Text style={styles.itemValue}>${fare.baseFareUsd}.00</Text>
              </View>

              <View style={styles.lineItem}>
                <Text style={styles.itemLabel}>Govt & Airport Passenger Facility Fee</Text>
                <Text style={styles.itemValue}>${fare.taxesAndAirportFeesUsd}.00</Text>
              </View>

              <View style={styles.lineItem}>
                <Text style={styles.itemLabel}>Fuel & Emission Surcharge</Text>
                <Text style={styles.itemValue}>Included ($0.00)</Text>
              </View>

              <View style={styles.lineItem}>
                <Text style={styles.itemLabel}>Credit Card Booking Fee</Text>
                <Text style={[styles.itemValue, { color: '#10B981' }]}>$0.00 (No markup)</Text>
              </View>

              <View style={[styles.lineItem, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL PRICE PER ADULT</Text>
                <Text style={styles.totalValue}>${fare.totalFareUsd}.00</Text>
              </View>
            </View>

            {/* Baggage terms */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Baggage Rules & Allowance</Text>
              <View style={styles.ruleItem}>
                <Ionicons name="bag-handle-outline" size={14} color="#38BDF8" />
                <Text style={styles.ruleText}>
                  Personal Bag: {fare.baggage.personalItemRule}
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="briefcase-outline" size={14} color="#38BDF8" />
                <Text style={styles.ruleText}>
                  Cabin Overhead: {fare.baggage.cabinBagIncluded ? `${fare.baggage.cabinBagWeightKg}kg max` : 'Not included in basic fare'}
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="cube-outline" size={14} color="#38BDF8" />
                <Text style={styles.ruleText}>
                  Checked Luggage: {fare.baggage.checkedBagIncluded ? `${fare.baggage.checkedBagWeightKg}kg included` : `Not included (+$${fare.baggage.extraCheckedBagFeeUsd} fee)`}
                </Text>
              </View>
            </View>

            {/* Flexibility & Cancellation policy */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Cancellation & Flexibility</Text>
              <Text style={styles.policyText}>{fare.cancellationPolicy}</Text>
            </View>

            {/* Guarantee note */}
            <View style={styles.guaranteeBox}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.guaranteeDesc}>
                AeroNexus Guarantee: The price shown is the final price charged. We do not support hidden ancillary fees, seat selection traps, or unbundled currency markups.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F1A36',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    backgroundColor: '#1E293B',
    borderRadius: 16,
  },
  content: {
    marginVertical: 12,
  },
  lineItemsContainer: {
    backgroundColor: '#0A1329',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  itemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38BDF8',
  },
  detailSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  policyText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  guaranteeDesc: {
    flex: 1,
    fontSize: 11,
    color: '#A7F3D0',
    lineHeight: 16,
  },
  doneBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
