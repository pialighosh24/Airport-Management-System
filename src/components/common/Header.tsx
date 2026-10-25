import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlight } from '@/context/FlightContext';
import { Palette } from '@/constants/theme';

interface Props {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'AeroNexus', subtitle = 'Smart Flight Tracking' }: Props) {
  const { isBackendConnected, isLoadingFlights, fetchFlights, serverUrl } = useFlight();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.topRow}>
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <Ionicons name="airplane" size={18} color={Palette.primary} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.badge, 
            isBackendConnected
              ? styles.badgeConnected
              : isLoadingFlights
              ? styles.badgeConnecting
              : styles.badgeDisconnected
          ]}
          onPress={() => fetchFlights()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: isBackendConnected
                  ? Palette.success
                  : isLoadingFlights
                  ? Palette.warning
                  : Palette.danger,
              },
            ]}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isBackendConnected
                  ? Palette.successText
                  : isLoadingFlights
                  ? Palette.warningText
                  : Palette.dangerText,
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
        <Ionicons name="link-outline" size={13} color={Palette.primary} style={{ marginRight: 6 }} />
        <Text style={styles.principleText} numberOfLines={1}>
          API: {serverUrl} • Solid State Sync Active
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surface,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
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
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeConnected: {
    borderColor: '#A7F3D0',
    backgroundColor: Palette.successBg,
  },
  badgeConnecting: {
    borderColor: '#FDE68A',
    backgroundColor: Palette.warningBg,
  },
  badgeDisconnected: {
    borderColor: '#FECACA',
    backgroundColor: Palette.dangerBg,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  principlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  principleText: {
    color: Palette.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
});
