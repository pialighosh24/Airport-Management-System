import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { FareCard } from '@/components/fares/FareCard';
import { FareBreakdownModal } from '@/components/fares/FareBreakdownModal';
import { DEMO_FARES } from '@/data/demo-fares';
import { apiService } from '@/services/api';
import { FlightFare } from '@/types';

type SortOption = 'best_value' | 'cheapest' | 'fastest' | 'fewest_stops';
type CurrencyOption = 'INR' | 'USD';

interface RouteOption {
  id: string;
  label: string;
  originIata: string;
  originCity: string;
  destinationIata: string;
  destinationCity: string;
}

const POPULAR_ROUTES: RouteOption[] = [
  {
    id: 'del-ccu',
    label: 'DEL ➔ CCU',
    originIata: 'DEL',
    originCity: 'New Delhi',
    destinationIata: 'CCU',
    destinationCity: 'Kolkata',
  },
  {
    id: 'bom-del',
    label: 'BOM ➔ DEL',
    originIata: 'BOM',
    originCity: 'Mumbai',
    destinationIata: 'DEL',
    destinationCity: 'New Delhi',
  },
  {
    id: 'blr-ccu',
    label: 'BLR ➔ CCU',
    originIata: 'BLR',
    originCity: 'Bengaluru',
    destinationIata: 'CCU',
    destinationCity: 'Kolkata',
  },
  {
    id: 'jfk-lhr',
    label: 'JFK ➔ LHR',
    originIata: 'JFK',
    originCity: 'New York',
    destinationIata: 'LHR',
    destinationCity: 'London',
  },
];

export default function FaresScreen() {
  const [selectedRoute, setSelectedRoute] = useState<RouteOption>(POPULAR_ROUTES[0]); // Default DEL -> CCU
  const [currency, setCurrency] = useState<CurrencyOption>('INR'); // Default INR per Blueprint v2.0
  const [sortBy, setSortBy] = useState<SortOption>('best_value');
  const [selectedFare, setSelectedFare] = useState<FlightFare | null>(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [fares, setFares] = useState<FlightFare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch fares from Express backend: GET /api/fares?origin=...&destination=...&currency=...&sortBy=...
  useEffect(() => {
    let isMounted = true;
    const fetchFares = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const response = await apiService.getFares({
          origin: selectedRoute.originIata,
          destination: selectedRoute.destinationIata,
          currency,
          sortBy,
        });

        if (isMounted && response && response.success && Array.isArray(response.data)) {
          setFares(response.data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Backend offline';
          setErrorMsg(msg);
          // Fallback to local demo dataset filtered for route and sorted
          const localFiltered = DEMO_FARES.filter(
            (f) =>
              f.originIata === selectedRoute.originIata &&
              f.destinationIata === selectedRoute.destinationIata
          );

          // Apply local sort if backend unreachable
          localFiltered.sort((a, b) => {
            const priceA = currency === 'USD' ? a.totalFareUsd : (a.totalFareInr || a.totalFareUsd * 84);
            const priceB = currency === 'USD' ? b.totalFareUsd : (b.totalFareInr || b.totalFareUsd * 84);
            const bagFeeA = currency === 'USD'
              ? (a.baggage.checkedBagIncluded ? 0 : (a.baggage.extraCheckedBagFeeUsd || 50))
              : (a.baggage.checkedBagIncluded ? 0 : (a.baggage.extraCheckedBagFeeInr || 1200));
            const bagFeeB = currency === 'USD'
              ? (b.baggage.checkedBagIncluded ? 0 : (b.baggage.extraCheckedBagFeeUsd || 50))
              : (b.baggage.checkedBagIncluded ? 0 : (b.baggage.extraCheckedBagFeeInr || 1200));

            if (sortBy === 'cheapest') return priceA - priceB;
            if (sortBy === 'fastest') return a.durationMinutes - b.durationMinutes;
            if (sortBy === 'fewest_stops') return a.stopsCount - b.stopsCount;
            // Best Value
            return (priceA + bagFeeA) - (priceB + bagFeeB);
          });

          setFares(localFiltered.length > 0 ? localFiltered : DEMO_FARES);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFares();
    return () => {
      isMounted = false;
    };
  }, [selectedRoute, currency, sortBy]);

  const handleOpenBreakdown = (fare: FlightFare) => {
    setSelectedFare(fare);
    setBreakdownVisible(true);
  };

  const handlePriceCheck = (fare: FlightFare) => {
    setSelectedFare(fare);
    setBreakdownVisible(true);
  };

  const getSortExplanation = () => {
    switch (sortBy) {
      case 'cheapest':
        return 'Sorted strictly by lowest total checkout price per passenger.';
      case 'fastest':
        return 'Sorted by minimum elapsed flight duration.';
      case 'fewest_stops':
        return 'Sorted by minimum transit connections (non-stop priority).';
      case 'best_value':
      default:
        return 'Blueprint Weighted Score: 0.55 price rank + 0.30 duration rank + 0.15 stops rank, penalizing unbundled checked baggage charges.';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Fare Compare"
          subtitle="Smart Price Intelligence • Default INR (₹)"
        />

        {/* Top Controls: Route Chips & Currency Toggle */}
        <View style={styles.controlsHeaderCard}>
          {/* Currency Switcher */}
          <View style={styles.currencyRow}>
            <View style={styles.currencyLabelGroup}>
              <Ionicons name="cash-outline" size={14} color="#38BDF8" />
              <Text style={styles.currencyTitle}>DISPLAY CURRENCY</Text>
            </View>

            <View style={styles.currencyToggleBox}>
              <TouchableOpacity
                style={[
                  styles.currencyPill,
                  currency === 'INR' && styles.currencyPillActive,
                ]}
                onPress={() => setCurrency('INR')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    currency === 'INR' && styles.currencyPillTextActive,
                  ]}
                >
                  ₹ INR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.currencyPill,
                  currency === 'USD' && styles.currencyPillActive,
                ]}
                onPress={() => setCurrency('USD')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    currency === 'USD' && styles.currencyPillTextActive,
                  ]}
                >
                  $ USD
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Route Chips */}
          <View style={styles.routeChipsContainer}>
            <Text style={styles.routeChipsLabel}>SELECT CORRIDOR</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeChipsScroll}>
              {POPULAR_ROUTES.map((route) => {
                const isSelected = route.id === selectedRoute.id;
                return (
                  <TouchableOpacity
                    key={route.id}
                    style={[styles.routeChip, isSelected && styles.routeChipActive]}
                    onPress={() => setSelectedRoute(route)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.routeChipText, isSelected && styles.routeChipTextActive]}>
                      {route.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Active Route Overview */}
          <View style={styles.activeRouteCard}>
            <View style={styles.routeBox}>
              <Text style={styles.routeLabel}>FROM</Text>
              <Text style={styles.routeCity}>{selectedRoute.originCity}</Text>
              <Text style={styles.routeIata}>{selectedRoute.originIata}</Text>
            </View>

            <View style={styles.routeArrow}>
              <Ionicons name="airplane" size={18} color="#38BDF8" />
            </View>

            <View style={[styles.routeBox, { alignItems: 'flex-end' }]}>
              <Text style={styles.routeLabel}>TO</Text>
              <Text style={styles.routeCity}>{selectedRoute.destinationCity}</Text>
              <Text style={styles.routeIata}>{selectedRoute.destinationIata}</Text>
            </View>
          </View>

          <View style={styles.routeMetaRow}>
            <Text style={styles.routeMetaText}>📅 Next Friday • 1 Adult • Economy</Text>
            <Text style={styles.resultsCountText}>{fares.length} verified offers</Text>
          </View>
        </View>

        {/* Transparent Ranking Filter Section */}
        <View style={styles.sortSection}>
          <Text style={styles.sortSectionLabel}>TRANSPARENT RANKING CRITERIA (BLUEPRINT v2.0)</Text>
          
          <View style={styles.sortButtonsRow}>
            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'best_value' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('best_value')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="star"
                size={11}
                color={sortBy === 'best_value' ? '#FFFFFF' : '#38BDF8'}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === 'best_value' && styles.sortBtnTextActive,
                ]}
              >
                Best Value
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'cheapest' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('cheapest')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="pricetag-outline"
                size={11}
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
              activeOpacity={0.7}
            >
              <Ionicons
                name="flash-outline"
                size={11}
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

            <TouchableOpacity
              style={[
                styles.sortBtn,
                sortBy === 'fewest_stops' && styles.sortBtnActive,
              ]}
              onPress={() => setSortBy('fewest_stops')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="git-commit-outline"
                size={11}
                color={sortBy === 'fewest_stops' ? '#FFFFFF' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.sortBtnText,
                  sortBy === 'fewest_stops' && styles.sortBtnTextActive,
                ]}
              >
                Direct
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
              Backend offline — displaying verified local demo fares.
            </Text>
          </View>
        )}

        {/* Fares List */}
        <ScrollView style={styles.faresList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#38BDF8" />
              <Text style={styles.loadingText}>Fetching like-for-like fare offers...</Text>
            </View>
          ) : fares.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="airplane-outline" size={36} color="#64748B" />
              <Text style={styles.emptyTitle}>No Fares Found</Text>
              <Text style={styles.emptySubtitle}>No verified fares available for this corridor.</Text>
            </View>
          ) : (
            fares.map((fare) => (
              <FareCard
                key={fare.id}
                fare={fare}
                currency={currency}
                onViewBreakdown={handleOpenBreakdown}
                onPriceCheck={handlePriceCheck}
              />
            ))
          )}
        </ScrollView>

        {/* Breakdown Modal */}
        <FareBreakdownModal
          fare={selectedFare}
          currency={currency}
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
  controlsHeaderCard: {
    backgroundColor: '#0F1A36',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currencyLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  currencyToggleBox: {
    flexDirection: 'row',
    backgroundColor: '#0A1329',
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  currencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currencyPillActive: {
    backgroundColor: '#0284C7',
  },
  currencyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  currencyPillTextActive: {
    color: '#FFFFFF',
  },
  routeChipsContainer: {
    marginBottom: 10,
  },
  routeChipsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  routeChipsScroll: {
    gap: 8,
  },
  routeChip: {
    backgroundColor: '#0A1329',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  routeChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#38BDF8',
  },
  routeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  routeChipTextActive: {
    color: '#38BDF8',
  },
  activeRouteCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A1329',
    padding: 10,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  routeIata: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38BDF8',
  },
  routeArrow: {
    paddingHorizontal: 10,
  },
  routeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  routeMetaText: {
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
    gap: 3,
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
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  faresList: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
