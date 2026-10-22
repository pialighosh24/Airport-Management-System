import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DataFreshness, FreshnessStatus } from '@/types';
import { Palette } from '@/constants/theme';

interface Props {
  freshness: DataFreshness;
  compact?: boolean;
}

export function FreshnessIndicator({ freshness, compact = false }: Props) {
  const getBadgeConfig = (status: FreshnessStatus) => {
    switch (status) {
      case 'valid':
        return {
          color: Palette.success,
          textColor: Palette.successText,
          bgColor: Palette.successBg,
          borderColor: '#A7F3D0',
          label: 'VALID / LIVE',
          desc: `Observed ${freshness.ageSeconds}s ago`,
        };
      case 'stale':
        return {
          color: Palette.warning,
          textColor: Palette.warningText,
          bgColor: Palette.warningBg,
          borderColor: '#FDE68A',
          label: 'STALE DATA',
          desc: `Observed ${Math.round(freshness.ageSeconds / 60)}m ago (Lagging)`,
        };
      case 'missing':
        return {
          color: Palette.textMuted,
          textColor: Palette.textSecondary,
          bgColor: Palette.surfaceSubtle,
          borderColor: Palette.border,
          label: 'INCOMPLETE',
          desc: 'Some telemetry fields missing',
        };
      case 'unavailable':
      default:
        return {
          color: Palette.danger,
          textColor: Palette.dangerText,
          bgColor: Palette.dangerBg,
          borderColor: '#FECACA',
          label: 'UNAVAILABLE',
          desc: 'No live telemetry link',
        };
    }
  };

  const config = getBadgeConfig(freshness.status);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.compactText, { color: config.textColor }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusLabel, { color: config.textColor }]}>{config.label}</Text>
        <Text style={styles.timeTag}>Age: {freshness.ageSeconds}s</Text>
      </View>
      <Text style={styles.descText}>{config.desc}</Text>
      {freshness.notes ? <Text style={styles.notesText}>⚠️ {freshness.notes}</Text> : null}
      <View style={styles.timesContainer}>
        <Text style={styles.metaText}>
          Observed: {new Date(freshness.observationTimeUtc).toLocaleTimeString()}
        </Text>
        <Text style={styles.metaText}>
          Server Fetched: {new Date(freshness.retrievalTimeUtc).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeTag: {
    marginLeft: 'auto',
    fontSize: 11,
    color: Palette.textSecondary,
    fontWeight: '500',
  },
  descText: {
    fontSize: 11,
    color: Palette.textSecondary,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: Palette.warningText,
    marginTop: 4,
    fontWeight: '500',
  },
  timesContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 10,
    color: Palette.textMuted,
  },
});
