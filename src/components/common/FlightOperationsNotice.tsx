import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFlight } from '@/context/FlightContext';
import { apiService } from '@/services/api';

interface NoticeItem {
  id: string;
  category: string;
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
  categoryColor: string;
  categoryBg: string;
  categoryBorder: string;
  cardBorderLeft: string;
}

const NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    category: 'DATA QUALITY',
    title: 'Aircraft Data Freshness',
    message:
      'Aircraft position data may be delayed, incomplete, or unavailable. Check the last-updated time and data status before interpreting aircraft positions.',
    icon: 'time-outline',
    categoryColor: '#0284C7',
    categoryBg: '#E0F2FE',
    categoryBorder: '#BAE6FD',
    cardBorderLeft: '#0284C7',
  },
  {
    id: 'notice-2',
    category: 'TRACKING INFO',
    title: 'Aircraft Visibility',
    message:
      'Aircraft visibility depends on data availability, coverage, and provider limitations. Not all aircraft may appear on the radar.',
    icon: 'locate-outline',
    categoryColor: '#0D9488',
    categoryBg: '#CCFBF1',
    categoryBorder: '#99F6E4',
    cardBorderLeft: '#0D9488',
  },
  {
    id: 'notice-3',
    category: 'AIRPORT INFO',
    title: 'Airport Data Information',
    message:
      'Airport information depends on the configured data source. Verify important details with the relevant airport or official source.',
    icon: 'business-outline',
    categoryColor: '#6366F1',
    categoryBg: '#EEF2FF',
    categoryBorder: '#C7D2FE',
    cardBorderLeft: '#6366F1',
  },
  {
    id: 'notice-4',
    category: 'WEATHER INFO',
    title: 'Weather Information',
    message:
      'Weather information is for general awareness only. Consult official aviation weather reports for operational decisions.',
    icon: 'cloudy-outline',
    categoryColor: '#D97706',
    categoryBg: '#FEF3C7',
    categoryBorder: '#FDE68A',
    cardBorderLeft: '#D97706',
  },
];

interface Props {
  serverUrl?: string;
  radarMode?: 'live' | 'demo';
}

export function FlightOperationsNotice({ serverUrl: propServerUrl, radarMode: propRadarMode }: Props) {
  const flight = useFlight();
  const serverUrl = propServerUrl || flight?.serverUrl || 'http://localhost:5000';
  const radarMode = propRadarMode || flight?.radarMode || 'demo';
  const aircraftList = flight?.aircraftList || [];
  const isLoadingFlights = flight?.isLoadingFlights ?? false;
  const flightError = flight?.flightError || null;

  // Notice card carousel index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Real backend health verification
  const [backendStatus, setBackendStatus] = useState<string | null>(null);
  const [isVerifyingHealth, setIsVerifyingHealth] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function verifyHealth() {
      setIsVerifyingHealth(true);
      try {
        const health = await apiService.getHealth();
        if (!isMounted) return;
        if (health && health.status) {
          // Use actual response from backend (e.g. "online")
          setBackendStatus(health.status);
        } else {
          setBackendStatus(null);
        }
      } catch {
        if (!isMounted) return;
        // If status cannot be verified, display "STATUS UNKNOWN"
        setBackendStatus(null);
      } finally {
        if (isMounted) setIsVerifyingHealth(false);
      }
    }

    verifyHealth();

    return () => {
      isMounted = false;
    };
  }, [serverUrl]);

  // Carousel navigation handlers
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : NOTICES.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < NOTICES.length - 1 ? prev + 1 : 0));
  };

  // Horizontal swipe gesture responder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Detect intentional horizontal drag (>15px and horizontal dominance)
          return (
            Math.abs(gestureState.dx) > 15 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 30) {
            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : NOTICES.length - 1));
          } else if (gestureState.dx < -30) {
            setCurrentIndex((prev) => (prev < NOTICES.length - 1 ? prev + 1 : 0));
          }
        },
      }),
    []
  );

  const currentNotice = NOTICES[currentIndex];

  // 1. Backend Availability Badge calculation (honest representation from /api/health)
  let backendBadgeText = 'STATUS UNKNOWN';
  let backendBadgeColor = '#64748B';
  let backendBadgeBg = '#F1F5F9';
  let backendBadgeBorder = '#CBD5E1';
  let backendDotColor = '#94A3B8';

  if (!isVerifyingHealth && backendStatus) {
    const normalized = backendStatus.toLowerCase();
    if (normalized === 'online') {
      backendBadgeText = 'BACKEND: ONLINE';
      backendBadgeColor = '#047857';
      backendBadgeBg = '#ECFDF5';
      backendBadgeBorder = '#A7F3D0';
      backendDotColor = '#10B981';
    } else {
      backendBadgeText = `BACKEND: ${backendStatus.toUpperCase()}`;
      backendBadgeColor = '#B45309';
      backendBadgeBg = '#FFFBEB';
      backendBadgeBorder = '#FDE68A';
      backendDotColor = '#F59E0B';
    }
  } else {
    // If backend cannot be verified, display "STATUS UNKNOWN"
    backendBadgeText = 'STATUS UNKNOWN';
    backendBadgeColor = '#64748B';
    backendBadgeBg = '#F1F5F9';
    backendBadgeBorder = '#CBD5E1';
    backendDotColor = '#94A3B8';
  }

  // 2. Separate Aircraft Feed Status calculation (shown distinctly from backend availability)
  let feedBadgeText = 'FEED: SYNCING';
  let feedBadgeColor = '#0369A1';
  let feedBadgeBg = '#F0F9FF';
  let feedBadgeBorder = '#BAE6FD';
  let feedDotColor = '#0284C7';

  if (isLoadingFlights) {
    feedBadgeText = 'FEED: SYNCING';
    feedBadgeColor = '#0369A1';
    feedBadgeBg = '#F0F9FF';
    feedBadgeBorder = '#BAE6FD';
    feedDotColor = '#0284C7';
  } else if (flightError) {
    feedBadgeText = 'FEED: UNAVAILABLE';
    feedBadgeColor = '#B91C1C';
    feedBadgeBg = '#FEF2F2';
    feedBadgeBorder = '#FECACA';
    feedDotColor = '#EF4444';
  } else if (aircraftList.length === 0) {
    feedBadgeText = 'FEED: NO TARGETS';
    feedBadgeColor = '#B45309';
    feedBadgeBg = '#FFFBEB';
    feedBadgeBorder = '#FDE68A';
    feedDotColor = '#F59E0B';
  } else {
    feedBadgeText = radarMode === 'live' ? `FEED: ${aircraftList.length} LIVE` : `FEED: ${aircraftList.length} DEMO`;
    feedBadgeColor = '#047857';
    feedBadgeBg = '#ECFDF5';
    feedBadgeBorder = '#A7F3D0';
    feedDotColor = '#10B981';
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Row: Heading and Separate Status Badges */}
      <View style={styles.headerRow}>
        <View style={styles.headingLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="megaphone-outline" size={14} color="#0284C7" />
          </View>
          <Text style={styles.headingTitle}>Flight Operations Notice</Text>
        </View>

        {/* Status Badges Group */}
        <View style={styles.statusBadgesRow}>
          {/* Backend Availability Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: backendBadgeBg, borderColor: backendBadgeBorder },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: backendDotColor }]} />
            <Text style={[styles.statusBadgeText, { color: backendBadgeColor }]}>
              {backendBadgeText}
            </Text>
          </View>

          {/* Aircraft Feed Status Badge (Shown Separately) */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: feedBadgeBg, borderColor: feedBadgeBorder },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: feedDotColor }]} />
            <Text style={[styles.statusBadgeText, { color: feedBadgeColor }]}>
              {feedBadgeText}
            </Text>
          </View>
        </View>
      </View>

      {/* Horizontally Navigable Notice Card */}
      <View
        style={[
          styles.noticeCard,
          { borderLeftColor: currentNotice.cardBorderLeft },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Notice Card Top Row: Category Badge, Position Indicator, and Arrows */}
        <View style={styles.cardTopRow}>
          <View style={styles.categoryRow}>
            <View
              style={[
                styles.categoryIconCircle,
                { backgroundColor: currentNotice.categoryBg },
              ]}
            >
              <Ionicons
                name={currentNotice.icon}
                size={12}
                color={currentNotice.categoryColor}
              />
            </View>
            <View
              style={[
                styles.categoryPill,
                {
                  backgroundColor: currentNotice.categoryBg,
                  borderColor: currentNotice.categoryBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: currentNotice.categoryColor },
                ]}
              >
                {currentNotice.category}
              </Text>
            </View>
          </View>

          {/* Navigation Controls: Position Indicator + Arrow Buttons */}
          <View style={styles.navControls}>
            <Text style={styles.positionText}>
              {currentIndex + 1} of {NOTICES.length}
            </Text>

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={handlePrev}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Previous notice"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={14} color="#0284C7" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={handleNext}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Next notice"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={14} color="#0284C7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notice Title */}
        <Text style={styles.cardTitle}>{currentNotice.title}</Text>

        {/* Notice Message */}
        <Text style={styles.cardMessage}>{currentNotice.message}</Text>

        {/* Position Dots Indicator */}
        <View style={styles.dotsRow}>
          {NOTICES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.indicatorDot,
                currentIndex === idx && styles.indicatorDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Preserved API Endpoint Display */}
      <View style={styles.endpointPill}>
        <Ionicons
          name="link-outline"
          size={12}
          color="#0284C7"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.endpointText} numberOfLines={1}>
          API: {serverUrl} • {radarMode === 'live' ? 'Live OpenSky Connected' : 'Demo Mode Active'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  headingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  headingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statusBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  noticeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  positionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  navArrowBtn: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  cardMessage: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
    fontWeight: '400',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  indicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  indicatorDotActive: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0284C7',
  },
  endpointPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  endpointText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '500',
  },
});
