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
        return { bg: '#7F1D1D', border: '#DC2626', text: '#FCA5A5', label: 'CRITICAL' };
      case 'high':
        return { bg: '#7C2D12', border: '#EA580C', text: '#FDBA74', label: 'HIGH' };
      case 'medium':
        return { bg: '#78350F', border: '#D97706', text: '#FDE68A', label: 'MEDIUM' };
      case 'low':
      default:
        return { bg: '#1E293B', border: '#475569', text: '#94A3B8', label: 'LOW' };
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
    <View style={[styles.card, { borderColor: sevStyle.border }]}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.typeBlock}>
          <Ionicons name={getIncidentIcon(item.incidentType)} size={16} color="#38BDF8" />
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
          👥 <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>{item.impactedPassengers}</Text> pax affected
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryBlock}>
        <Text style={styles.summaryTitle}>Root Cause & Situation</Text>
        <Text style={styles.summaryBody}>{item.summary}</Text>
      </View>

      {/* Action Plan */}
      <View style={styles.actionPlanBlock}>
        <Text style={styles.actionPlanTitle}>Operational Action Plan</Text>
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
                item.status === 'open' && { color: '#EF4444', fontWeight: '800' },
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
                item.status === 'investigating' && { color: '#F59E0B', fontWeight: '800' },
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
                item.status === 'resolved' && { color: '#10B981', fontWeight: '800' },
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
    backgroundColor: '#0F1A36',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
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
    color: '#F8FAFC',
  },
  flightCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: '#1E293B',
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
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  routeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  paxText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  summaryBlock: {
    backgroundColor: '#0A1329',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
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
    color: '#E2E8F0',
    lineHeight: 18,
  },
  actionPlanBlock: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  actionPlanTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionPlanBody: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  statusBtnActiveOpen: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusBtnActiveInvestigating: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBtnActiveResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reportedTime: {
    fontSize: 11,
    color: '#64748B',
  },
});
