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
          color: '#15803D',
          bgColor: '#DCFCE7',
          borderColor: '#86EFAC',
          label: 'VALID / LIVE',
          desc: `Observed ${freshness.ageSeconds}s ago`,
        };
      case 'stale':
        return {
          color: '#B45309',
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
          label: 'STALE DATA',
          desc: `Observed ${Math.round(freshness.ageSeconds / 60)}m ago (Lagging)`,
        };
      case 'missing':
        return {
          color: '#475569',
          bgColor: '#F1F5F9',
          borderColor: '#E2E8F0',
          label: 'INCOMPLETE',
          desc: 'Some telemetry fields missing',
        };
      case 'unavailable':
      default:
        return {
          color: '#B91C1C',
          bgColor: '#FEE2E2',
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    padding: 12,
    borderRadius: 10,
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
    color: '#64748B',
    fontWeight: '600',
  },
  descText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 3,
  },
  notesText: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 10,
    color: '#64748B',
  },
});
