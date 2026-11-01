import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFlight } from '@/context/FlightContext';
import { Palette } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

/**
 * Admin Panel access gate.
 * Renders an administrator-only lock surface until the user has completed
 * the Staff Operations authentication flow. Backend endpoints remain the
 * source of truth (admin JWT required) — this gate only controls navigation.
 */
export function AdminGate({ children }: Props) {
  const { isStaffAuthenticated } = useFlight();
  const router = useRouter();

  if (!isStaffAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.lockCard}>
            <View style={styles.lockIconCircle}>
              <Ionicons name="shield-checkmark" size={30} color={Palette.primary} />
            </View>
            <Text style={styles.lockTitle}>Administrator Access Required</Text>
            <Text style={styles.lockDesc}>
              The AeroNexus Admin Panel is restricted to authenticated operations administrators. Please authenticate through the Staff Operations portal to continue.
            </Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/staff')}>
              <Ionicons name="shield-half" size={14} color="#FFFFFF" />
              <Text style={styles.loginBtnText}>Open Staff Operations</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  lockCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockDesc: {
    fontSize: 12,
    color: Palette.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
