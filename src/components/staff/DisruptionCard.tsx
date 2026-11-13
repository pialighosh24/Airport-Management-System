import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisruptionCase } from '@/types';
import { useFlight } from '@/context/FlightContext';

interface Props {
  item: DisruptionCase;
}

export function DisruptionCard({ item }: Props) {
  const { updateDisruptionStatus } = useFlight();

  const getSeverityStyle = (severity: DisruptionCase['severity']) => {
    switch (severity) {
      case 'critical':
        return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C', label: 'CRITICAL' };
      case 'high':
        return { bg: '#FFEDD5', border: '#FED7AA', text: '#C2410C', label: 'HIGH' };
      case 'medium':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: 'MEDIUM' };
      case 'low':
      default:
        return { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569', label: 'LOW' };
    }
  };

  const getIncidentIcon = (type: DisruptionCase['incidentType']) => {
    switch (type) {
      case 'weather':
        return 'thunderstorm-outline';
      case 'mechanical':
        return 'construct-outline';
      case 'air_traffic_control':
        return 'radio-outline';
      case 'crew_duty':
        return 'time-outline';
      default:
        return 'warning-outline';
    }
  };

  const sevStyle = getSeverityStyle(item.severity);

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.typeBlock}>
          <Ionicons name={getIncidentIcon(item.incidentType)} size={16} color="#0284C7" />
          <Text style={styles.caseNumber}>{item.caseNumber}</Text>
          <Text style={styles.flightCode}>{item.flightNumber}</Text>
        </View>

        <View style={[styles.severityPill, { backgroundColor: sevStyle.bg, borderColor: sevStyle.border }]}>
          <Text style={[styles.severityText, { color: sevStyle.text }]}>{sevStyle.label}</Text>
        </View>
      </View>

      {/* Route & Impact Count */}
      <View style={styles.routeRow}>
        <Text style={styles.routeText}>Route: {item.route}</Text>
        <Text style={styles.paxText}>
          👥 <Text style={{ fontWeight: '700', color: '#0F172A' }}>{item.impactedPassengers}</Text> pax affected
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryTitle}>ROOT CAUSE & SITUATION</Text>
        <Text style={styles.summaryBody}>{item.summary}</Text>
      </View>

      {/* Action Plan */}
      <View style={styles.actionPlanBlock}>
        <Text style={styles.actionPlanTitle}>OPERATIONAL ACTION PLAN</Text>
        <Text style={styles.actionPlanBody}>{item.actionPlan}</Text>
      </View>

      {/* Footer & Status Toggles */}
      <View style={styles.footerRow}>
        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[
              styles.statusBtn,
              item.status === 'open' && styles.statusBtnActiveOpen,
            ]}
            onPress={() => updateDisruptionStatus(item.id, 'open')}
          >
            <Text
              style={[
                styles.statusBtnText,
                item.status === 'open' && { color: '#B91C1C', fontWeight: '800' },
              ]}
            >
              Open
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusBtn,
              item.status === 'investigating' && styles.statusBtnActiveInvestigating,
            ]}
            onPress={() => updateDisruptionStatus(item.id, 'investigating')}
          >
            <Text
              style={[
                styles.statusBtnText,
                item.status === 'investigating' && { color: '#B45309', fontWeight: '800' },
              ]}
            >
              Investigating
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusBtn,
              item.status === 'resolved' && styles.statusBtnActiveResolved,
            ]}
            onPress={() => updateDisruptionStatus(item.id, 'resolved')}
          >
            <Text
              style={[
                styles.statusBtnText,
                item.status === 'resolved' && { color: '#15803D', fontWeight: '800' },
              ]}
            >
              Resolved
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.reportedTime}>
          {new Date(item.createdAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caseNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  flightCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  paxText: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  actionPlanBlock: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionPlanTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionPlanBody: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnActiveOpen: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusBtnActiveInvestigating: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBtnActiveResolved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBtnText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  reportedTime: {
    fontSize: 11,
    color: '#64748B',
  },
});
