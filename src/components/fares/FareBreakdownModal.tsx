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
              <Ionicons name="close" size={20} color="#64748B" />
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
                <Text style={[styles.itemValue, { color: '#059669', fontWeight: '700' }]}>$0.00 (No markup)</Text>
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
                <Ionicons name="bag-handle-outline" size={15} color="#0284C7" />
                <Text style={styles.ruleText}>
                  Personal Bag: {fare.baggage.personalItemRule}
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="briefcase-outline" size={15} color="#0284C7" />
                <Text style={styles.ruleText}>
                  Cabin Overhead: {fare.baggage.cabinBagIncluded ? `${fare.baggage.cabinBagWeightKg}kg max` : 'Not included in basic fare'}
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="cube-outline" size={15} color="#0284C7" />
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
              <Ionicons name="shield-checkmark" size={16} color="#059669" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
  },
  content: {
    marginVertical: 12,
  },
  lineItemsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  itemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
  },
  detailSection: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ruleText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  policyText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  guaranteeDesc: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
    fontWeight: '500',
  },
  doneBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
