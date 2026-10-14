import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DataFreshness, FreshnessStatus } from '@/types';

interface Props {
  freshness: DataFreshness;
  compact?: boolean;
}

export function FreshnessIndicator({ freshness, compact = false }: Props) {
  const getBadgeConfig = (status: FreshnessStatus) => {
    switch (status) {
      case 'valid':
        return {
          color: '#10B981', // Emerald green
          bgColor: '#064E3B',
          borderColor: '#059669',
          label: 'VALID / LIVE',
          desc: `Observed ${freshness.ageSeconds}s ago`,
        };
      case 'stale':
        return {
          color: '#F59E0B', // Amber warning
          bgColor: '#78350F',
          borderColor: '#D97706',
          label: 'STALE DATA',
          desc: `Observed ${Math.round(freshness.ageSeconds / 60)}m ago (Lagging)`,
        };
      case 'missing':
        return {
          color: '#9CA3AF', // Muted gray
          bgColor: '#374151',
          borderColor: '#6B7280',
          label: 'INCOMPLETE',
          desc: 'Some telemetry fields missing',
        };
      case 'unavailable':
      default:
        return {
          color: '#EF4444', // Red
          bgColor: '#7F1D1D',
          borderColor: '#DC2626',
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
        <Text style={[styles.compactText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
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
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    letterSpacing: 0.5,
  },
  timeTag: {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#D1D5DB',
  },
  descText: {
    fontSize: 11,
    color: '#F3F4F6',
    marginTop: 3,
  },
  notesText: {
    fontSize: 11,
    color: '#FDE68A',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timesContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
