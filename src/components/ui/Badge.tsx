import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette, Radii } from '@/constants/theme';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface Props {
  tone?: BadgeTone;
  label: string;
  compact?: boolean;
}

const toneColors: Record<
  BadgeTone,
  { color: string; bgColor: string; borderColor: string }
> = {
  primary: { color: Palette.primaryDark, bgColor: Palette.primaryLight, borderColor: '#BAE6FD' },
  success: { color: Palette.successText, bgColor: Palette.successBg, borderColor: '#A7F3D0' },
  warning: { color: Palette.warningText, bgColor: Palette.warningBg, borderColor: '#FDE68A' },
  danger: { color: Palette.dangerText, bgColor: Palette.dangerBg, borderColor: '#FECACA' },
  info: { color: Palette.infoText, bgColor: Palette.infoBg, borderColor: '#BFDBFE' },
  neutral: { color: Palette.textSecondary, bgColor: Palette.surfaceSubtle, borderColor: Palette.border },
};

/**
 * Compact semantic status pill used across dashboard, radar and ops surfaces.
 */
export function Badge({ tone = 'neutral', label, compact = false }: Props) {
  const colors = toneColors[tone];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.bgColor, borderColor: colors.borderColor }]}>
        <View style={[styles.dot, { backgroundColor: colors.color }]} />
        <Text style={[styles.compactText, { color: colors.color }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgColor, borderColor: colors.borderColor }]}>
      <View style={[styles.dot, { backgroundColor: colors.color }]} />
      <Text style={[styles.label, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
