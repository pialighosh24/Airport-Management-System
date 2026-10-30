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
import { FlightFare, AmadeusOffer } from '@/types';

type SortOption = 'cheapest' | 'fastest' | 'best_value';

export default function FaresScreen() {
  const [selectedFare, setSelectedFare] = useState<FlightFare | null>(null);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best_value');
  const [fares, setFares] = useState<FlightFare[]>(DEMO_FARES);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveOffers, setLiveOffers] = useState<AmadeusOffer[]>([]);
  const [liveOffersLoading, setLiveOffersLoading] = useState(false);
  const [liveOffersError, setLiveOffersError] = useState<string | null>(null);

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
          const msg = err instanceof Error ? err.message : 'Service unavailable';
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

  // Fetch live Amadeus flight offers: GET /api/flights/search?origin=JFK&destination=LHR&departureDate=2026-10-15&adults=1&cabinClass=Economy
  useEffect(() => {
    let isMounted = true;
    const fetchLiveOffers = async () => {
      setLiveOffersLoading(true);
      setLiveOffersError(null);
      try {
        const response = await apiService.getFlightOffers({
          origin: 'JFK',
          destination: 'LHR',
          departureDate: '2026-10-15',
          adults: 1,
          cabinClass: 'Economy',
        });
        if (isMounted) {
          if (response && response.success && Array.isArray(response.offers)) {
            setLiveOffers(response.offers);
          } else {
            setLiveOffers([]);
            setLiveOffersError(response?.message || 'Live flight offers are currently unavailable.');
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Live offers unavailable';
          setLiveOffers([]);
          setLiveOffersError(msg);
        }
      } finally {
        if (isMounted) setLiveOffersLoading(false);
      }
    };

    fetchLiveOffers();
    return () => {
      isMounted = false;
    };
  }, []);

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
              <Ionicons name="swap-horizontal" size={18} color="#0284C7" />
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
                color={sortBy === 'best_value' ? '#FFFFFF' : '#0284C7'}
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
                color={sortBy === 'cheapest' ? '#FFFFFF' : '#64748B'}
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
                color={sortBy === 'fastest' ? '#FFFFFF' : '#64748B'}
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
            <Ionicons name="information-circle-outline" size={14} color="#0284C7" />
            <Text style={styles.sortExplainText}>{getSortExplanation()}</Text>
          </View>
        </View>

        {/* Offline indicator if backend call failed */}
        {errorMsg && (
          <View style={styles.errorNotice}>
            <Ionicons name="information-circle-outline" size={13} color="#D97706" />
            <Text style={styles.errorNoticeText}>
              Flight service temporarily unavailable. Showing sample fares.
            </Text>
          </View>
        )}

        {/* Live Amadeus Offers */}
        <View style={styles.liveOffersSection}>
          <View style={styles.liveOffersHeader}>
            <Ionicons name="airplane-outline" size={13} color="#0284C7" />
            <Text style={styles.sortSectionLabel}>LIVE AMMADEUS OFFERS</Text>
          </View>
          {liveOffersLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284C7" />
              <Text style={styles.loadingText}>Searching live flight offers via Amadeus...</Text>
            </View>
          ) : liveOffersError ? (
            <View style={styles.errorNotice}>
              <Ionicons name="information-circle-outline" size={13} color="#D97706" />
              <Text style={styles.errorNoticeText}>{liveOffersError}</Text>
            </View>
          ) : liveOffers.length > 0 ? (
            liveOffers.map((offer, index) => (
              <View key={offer.offerId || `live_offer_${index}`} style={styles.liveOfferCard}>
                <View style={styles.liveOfferRow}>
                  <Text style={styles.liveOfferFlight}>{`Flight ${offer.flightNumber ?? '—'} • ${offer.airlineName ?? 'Airline'} • ${offer.originIata ?? '?'} → ${offer.destinationIata ?? '?'}`}</Text>
                  <Text style={styles.liveOfferPrice}>{offer.totalPrice != null ? `${offer.currency} ${offer.totalPrice}` : 'Price unavailable'}</Text>
                </View>
                <Text style={styles.liveOfferText}>{`Dep ${offer.departureTimeUtc ?? '—'} • Arr ${offer.arrivalTimeUtc ?? '—'} • ${offer.durationMinutes ?? '—'} min`}</Text>
              </View>
            ))
          ) : null}
        </View>

        {/* Fares List */}
        <ScrollView style={styles.faresList} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#0284C7" />
              <Text style={styles.loadingText}>Fetching fare comparisons...</Text>
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
  liveOffersSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  liveOffersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveOfferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  liveOfferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveOfferFlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveOfferPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  liveOfferText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  routeHeaderCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  routeCity: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
    borderTopColor: '#F1F5F9',
  },
  routeSubText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  resultsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  sortSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sortButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  sortBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },
  sortExplainBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  sortExplainText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 15,
    fontWeight: '500',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  errorNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  faresList: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
