import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Elevation } from '@/constants/theme';

export type StatCardTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: StatCardTone;
  onPress?: () => void;
}

/**
 * Shared KPI / metric card used across the Command Centre surfaces.
 * Follows the design system: white surface, 1px border, 12px radius, soft elevation.
 */
export function StatCard({ title, value, subtitle, icon, tone = 'default', onPress }: Props) {
  const accentColor =
    tone === 'primary'
      ? Palette.primary
      : tone === 'success'
        ? Palette.success
        : tone === 'warning'
          ? Palette.warning
          : tone === 'danger'
            ? Palette.danger
            : tone === 'info'
              ? Palette.info
              : Palette.primary;

  const content = (
    <View
      style={[
        styles.card,
        {
          borderTopColor: tone === 'default' ? Palette.border : accentColor,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {icon ? (
          <View style={[styles.iconCircle, { backgroundColor: `${accentColor}1A` }]}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: accentColor }]} numberOfLines={2}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.pressable}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 12,
  },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderTopWidth: 3,
    borderTopColor: Palette.border,
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      default: { elevation: Elevation.card },
    }),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Palette.textMuted,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 14,
  },
});
