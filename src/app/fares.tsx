import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { FareCard } from '@/components/fares/FareCard';
import { FareBreakdownModal } from '@/components/fares/FareBreakdownModal';
import { DEMO_FARES } from '@/data/demo-fares';
import { apiService } from '@/services/api';
import { FlightFare } from '@/types';

type SortOption = 'cheapest' | 'fastest' | 'best_value';

export default function FaresScreen() {
  const [selectedFare, setSelectedFare] = useState<FlightFare | null>(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best_value');
  const [fares, setFares] = useState<FlightFare[]>(DEMO_FARES);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch fares from Express backend: GET /api/fares?sortBy=...
  useEffect(() => {
    let isMounted = true;
    const fetchFares = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await apiService.getFares({ sortBy });
        if (isMounted && response && response.success && Array.isArray(response.data)) {
          setFares(response.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Backend offline';
          setErrorMsg(msg);
          // Fallback to local demo dataset
          setFares(DEMO_FARES);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFares();
    return () => {
      isMounted = false;
    };
  }, [sortBy]);

  const handleOpenBreakdown = (fare: FlightFare) => {
    setSelectedFare(fare);
    setBreakdownVisible(true);
  };

  const getSortExplanation = () => {
    switch (sortBy) {
      case 'cheapest':
        return 'Sorted strictly by lowest total checkout price per passenger.';
      case 'fastest':
        return 'Sorted by minimum elapsed airborne duration.';
      case 'best_value':
      default:
        return 'Best Value incorporates upfront fare PLUS checked baggage charges so unbundled budget airlines do not deceive you.';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Fare Compare"
          subtitle="Transparent Pricing • Zero Hidden Baggage Fees"
        />

        {/* Route Selector Summary */}
        <View style={styles.routeHeaderCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeBox}>
              <Text style={styles.routeLabel}>FROM</Text>
              <Text style={styles.routeCity}>New York (JFK)</Text>
            </View>

            <View style={styles.routeArrow}>
              <Ionicons name="swap-horizontal" size={18} color="#38BDF8" />
            </View>

            <View style={[styles.routeBox, { alignItems: 'flex-end' }]}>
              <Text style={styles.routeLabel}>TO</Text>
              <Text style={styles.routeCity}>London (LHR)</Text>
            </View>
          </View>

          <View style={styles.routeSubRow}>
            <Text style={styles.routeSubText}>📅 Oct 15 • 1 Adult • Economy</Text>
            <Text style={styles.resultsCountText}>{fares.length} verified fares</Text>
          </View>
        </View>

        {/* Transparent Ranking Filter Bar */}
        <View style={styles.sortSection}>
          <Text style={styles.sortSectionLabel}>TRANSPARENT RANKING CRITERIA</Text>
          <View style={styles.sortButtonsRow}>
            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'best_value' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('best_value')}
            >
              <Ionicons
                name="star"
                size={12}
                color={sortBy === 'best_value' ? '#FFFFFF' : '#38BDF8'}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === 'best_value' && styles.sortBtnTextActive,
                ]}
              >
                Best Value (Fare + Bags)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'cheapest' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('cheapest')}
            >
              <Ionicons
                name="pricetag-outline"
                size={12}
                color={sortBy === 'cheapest' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === 'cheapest' && styles.sortBtnTextActive,
                ]}
              >
                Cheapest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'fastest' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('fastest')}
            >
              <Ionicons
                name="flash-outline"
                size={12}
                color={sortBy === 'fastest' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === 'fastest' && styles.sortBtnTextActive,
                ]}
              >
                Fastest
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sortExplainBox}>
            <Ionicons name="information-circle-outline" size={13} color="#38BDF8" />
            <Text style={styles.sortExplainText}>{getSortExplanation()}</Text>
          </View>
        </View>

        {/* Offline indicator if backend call failed */}
        {errorMsg && (
          <View style={styles.errorNotice}>
            <Ionicons name="information-circle-outline" size={13} color="#FDE68A" />
            <Text style={styles.errorNoticeText}>
              Backend unreachable — displaying local demo fares.
            </Text>
          </View>
        )}

        {/* Fares List */}
        <ScrollView style={styles.faresList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.loadingText}>Fetching fare comparisons from backend...</Text>
            </View>
          ) : (
            fares.map((fare) => (
              <FareCard
                key={fare.id}
                fare={fare}
                onViewBreakdown={handleOpenBreakdown}
              />
            ))
          )}
        </ScrollView>

        {/* Breakdown Modal */}
        <FareBreakdownModal
          fare={selectedFare}
          visible={breakdownVisible}
          onClose={() => setBreakdownVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  container: {
    flex: 1,
    backgroundColor: '#070D1E',
  },
  routeHeaderCard: {
    backgroundColor: '#0F1A36',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeBox: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  routeCity: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  routeArrow: {
    paddingHorizontal: 8,
  },
  routeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  routeSubText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  resultsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  sortSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sortSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131D38',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sortBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },
  sortExplainBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
    gap: 6,
  },
  sortExplainText: {
    flex: 1,
    fontSize: 10,
    color: '#BAE6FD',
    lineHeight: 14,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    marginHorizontal: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    marginBottom: 6,
  },
  errorNoticeText: {
    fontSize: 10,
    color: '#FDE68A',
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  faresList: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
