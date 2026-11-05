import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlight } from '@/context/FlightContext';

interface Props {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'AeroNexus', subtitle = 'Smart Flight Tracking' }: Props) {
  const { isBackendConnected, isLoadingFlights, fetchFlights, serverUrl } = useFlight();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.topRow}>
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <Ionicons name="airplane" size={18} color="#0284C7" />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.badge, 
            isBackendConnected ? styles.badgeConnected : styles.badgeDisconnected
          ]}
          onPress={() => fetchFlights()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: isBackendConnected
                  ? '#059669'
                  : isLoadingFlights
                  ? '#D97706'
                  : '#DC2626',
              },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isBackendConnected
                  ? '#15803D'
                  : isLoadingFlights
                  ? '#B45309'
                  : '#B91C1C',
              },
            ]}
          >
            {isBackendConnected
              ? 'BACKEND 200'
              : isLoadingFlights
              ? 'CONNECTING'
              : 'OFFLINE'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.principlePill}>
        <Ionicons name="link-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
        <Text style={styles.principleText} numberOfLines={1}>
          API: {serverUrl} • Demo Mode Active
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeConnected: {
    borderColor: '#86EFAC',
    backgroundColor: '#DCFCE7',
  },
  badgeDisconnected: {
    borderColor: '#FECACA',
    backgroundColor: '#FEE2E2',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  principlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  principleText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
});
