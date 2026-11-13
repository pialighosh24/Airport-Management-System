import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisruptionCase } from '@/types';
import { useFlight } from '@/context/FlightContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function CreateDisruptionModal({ visible, onClose }: Props) {
  const { addDisruptionCase } = useFlight();

  const [flightNumber, setFlightNumber] = useState('DL402');
  const [route, setRoute] = useState('JFK ➔ CDG');
  const [incidentType, setIncidentType] = useState<DisruptionCase['incidentType']>('weather');
  const [severity, setSeverity] = useState<DisruptionCase['severity']>('high');
  const [paxCount, setPaxCount] = useState('210');
  const [summary, setSummary] = useState(
    'Severe convective line storm crossing eastbound departure gate.'
  );
  const [actionPlan, setActionPlan] = useState(
    'Holding at taxiway Bravo. Re-routing via southern waypoint corridor with +30 min fuel reserve.'
  );

  const handleSubmit = () => {
    if (!flightNumber.trim() || !summary.trim()) {
      Alert.alert('Required Fields', 'Please provide at least a flight number and summary.');
      return;
    }

    const caseNum = `DIS-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    addDisruptionCase({
      caseNumber: caseNum,
      flightNumber: flightNumber.trim().toUpperCase(),
      route: route.trim(),
      incidentType,
      severity,
      impactedPassengers: parseInt(paxCount, 10) || 0,
      status: 'open',
      reportedBy: 'Operations Duty Dispatcher',
      summary: summary.trim(),
      actionPlan: actionPlan.trim(),
      rebookingStatus: 'in_progress',
    });

    Alert.alert('Case Created', `Disruption case ${caseNum} has been broadcast to ops queue.`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Disruption Case</Text>
              <Text style={styles.subtitle}>Log operational event & dispatch action plan</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
            {/* Flight & Route */}
            <View style={styles.row}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Flight Number</Text>
                <TextInput
                  style={styles.input}
                  value={flightNumber}
                  onChangeText={setFlightNumber}
                  placeholder="e.g. DL402"
                  placeholderTextColor="#64748B"
                  autoCapitalize="characters"
                />
              </View>

              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Route</Text>
                <TextInput
                  style={styles.input}
                  value={route}
                  onChangeText={setRoute}
                  placeholder="e.g. JFK -> CDG"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Incident Type */}
            <Text style={styles.label}>Incident Category</Text>
            <View style={styles.selectorRow}>
              {(['weather', 'mechanical', 'air_traffic_control', 'crew_duty'] as const).map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectorPill,
                      incidentType === type && styles.selectorPillActive,
                    ]}
                    onPress={() => setIncidentType(type)}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        incidentType === type && styles.selectorTextActive,
                      ]}
                    >
                      {type === 'air_traffic_control' ? 'ATC' : type === 'crew_duty' ? 'Crew' : type}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Severity */}
            <Text style={styles.label}>Severity Level</Text>
            <View style={styles.selectorRow}>
              {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[
                    styles.selectorPill,
                    severity === sev && styles.selectorPillActive,
                  ]}
                  onPress={() => setSeverity(sev)}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      severity === sev && styles.selectorTextActive,
                    ]}
                  >
                    {sev.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Impacted Passengers */}
            <View style={styles.field}>
              <Text style={styles.label}>Impacted Passengers (Count)</Text>
              <TextInput
                style={styles.input}
                value={paxCount}
                onChangeText={setPaxCount}
                keyboardType="numeric"
                placeholder="Number of passengers"
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Summary */}
            <View style={styles.field}>
              <Text style={styles.label}>Root Cause & Situation Summary</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={summary}
                onChangeText={setSummary}
                multiline
                numberOfLines={3}
                placeholder="Describe disruption cause..."
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Action Plan */}
            <View style={styles.field}>
              <Text style={styles.label}>Operational Action Plan</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={actionPlan}
                onChangeText={setActionPlan}
                multiline
                numberOfLines={3}
                placeholder="Mitigation, rebooking or turnaround action..."
                placeholderTextColor="#64748B"
              />
            </View>
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Broadcast Disruption</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formContent: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  selectorPill: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  selectorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'capitalize',
  },
  selectorTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
