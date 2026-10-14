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
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
      <View style={styles.topRow}>
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <Ionicons name="airplane" size={18} color="#38BDF8" />
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
                  ? '#10B981'
                  : isLoadingFlights
                  ? '#F59E0B'
                  : '#EF4444',
              },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isBackendConnected
                  ? '#34D399'
                  : isLoadingFlights
                  ? '#FBBF24'
                  : '#F87171',
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
        <Ionicons name="link-outline" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
        <Text style={styles.principleText} numberOfLines={1}>
          API: {serverUrl} • Demo Mode Active
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B132B',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2541',
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2541',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A506B',
  },
  badgeConnected: {
    borderColor: '#059669',
    backgroundColor: 'rgba(6, 78, 59, 0.5)',
  },
  badgeDisconnected: {
    borderColor: '#7F1D1D',
    backgroundColor: 'rgba(127, 29, 29, 0.5)',
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
    backgroundColor: 'rgba(28, 37, 65, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  principleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
});
