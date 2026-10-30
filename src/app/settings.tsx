import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { useFlight } from '@/context/FlightContext';
import { apiService } from '@/services/api';
import { Palette } from '@/constants/theme';

export default function SettingsScreen() {
  const { serverUrl, updateServerUrl, isBackendConnected } = useFlight();
  const [customUrlInput, setCustomUrlInput] = useState(serverUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string>('unknown');

  const handleApply = async () => {
    const trimmed = customUrlInput.trim();
    if (trimmed.length === 0) return;
    setIsSaving(true);
    updateServerUrl(trimmed);
    try {
      const health = await apiService.getHealth();
      setHealthStatus(health.status);
    } catch {
      setHealthStatus('unreachable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Settings" subtitle="Backend Connection & Data Sources" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server" size={16} color={Palette.primary} />
            <Text style={styles.cardTitle}>Backend Server</Text>
          </View>
          <Text style={styles.cardText}>
            AeroNexus talks to a local Express API. Point this device at the machine running the backend:
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={customUrlInput}
              onChangeText={setCustomUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.x.x:5000"
              placeholderTextColor={Palette.textPlaceholder}
              keyboardType="url"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleApply} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveText}>Apply</Text>}
            </TouchableOpacity>
          </View>
          <Text style={styles.cardText}>
            • Android Emulator: http://10.0.2.2:5000
            {'\n'}• Physical Phone on WiFi: http://&lt;your-laptop-ip&gt;:5000
            {'\n'}• Web Browser: http://localhost:5000
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud" size={16} color={Palette.primary} />
            <Text style={styles.cardTitle}>Health & Connectivity</Text>
          </View>
          <Text style={styles.statusLine}>
            Current status: <Text style={{ fontWeight: '800', color: isBackendConnected ? Palette.successText : Palette.dangerText }}>{isBackendConnected ? 'Connected' : 'Disconnected'}</Text>
          </Text>
          <Text style={styles.statusLine}>Connection check: {healthStatus === 'healthy' ? 'Passed' : healthStatus === 'unreachable' ? 'Failed' : 'Pending'}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={16} color={Palette.primary} />
            <Text style={styles.cardTitle}>Data Sources</Text>
          </View>
          <Text style={styles.cardText}>AeroNexus aggregates public, free aviation data APIs.</Text>
          <Text style={styles.bullet}>• OpenSky Network — Live ADS-B telemetry (no auth required).</Text>
          <Text style={styles.bullet}>• Open-Meteo — Meteorological observations & forecasts.</Text>
          <Text style={styles.bullet}>• Open Exchange Rate API — Indicative foreign exchange rates.</Text>
          <Text style={styles.disclaimer}>AeroNexus is not an official aviation authority or data provider.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Palette.textPrimary, letterSpacing: 0.3 },
  cardText: { fontSize: 12, color: Palette.textSecondary, lineHeight: 17, marginBottom: 10 },
  bullet: { fontSize: 11, color: Palette.textSecondary, marginTop: 4, lineHeight: 15 },
  disclaimer: { fontSize: 10, color: Palette.textMuted, marginTop: 10, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: Palette.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: Palette.textPrimary,
    fontSize: 12,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  saveBtn: { backgroundColor: Palette.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  statusLine: { fontSize: 12, color: Palette.textSecondary, marginTop: 4 },
});
