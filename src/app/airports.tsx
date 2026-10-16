import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { FlightScheduleCard } from '@/components/airports/FlightScheduleCard';
import { AirportCard } from '@/components/airports/AirportCard';
import { AirportDetailModal } from '@/components/airports/AirportDetailModal';
import { DEMO_AIRPORTS, DEMO_SCHEDULES } from '@/data/demo-airports';
import { apiService } from '@/services/api';
import { AirportScheduleItem, AirportDetail } from '@/types';

type ScreenTab = 'search' | 'timetables';

const QUICK_SEARCH_CHIPS = [
  { label: 'CCU • Kolkata', query: 'CCU' },
  { label: 'JFK • New York', query: 'JFK' },
  { label: 'LHR • London', query: 'LHR' },
  { label: 'DXB • Dubai', query: 'DXB' },
  { label: 'SIN • Singapore', query: 'SIN' },
  { label: 'HND • Tokyo', query: 'HND' },
  { label: 'BOM • Mumbai', query: 'BOM' },
  { label: 'DEL • Delhi', query: 'DEL' },
];

export default function AirportsScreen() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('search');

  // ------------------------------------------------------------------------
  // State: Global FreeAirportDB Search
  // ------------------------------------------------------------------------
  const [airportSearchInput, setAirportSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<AirportDetail[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [selectedAirportDetail, setSelectedAirportDetail] = useState<AirportDetail | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // ------------------------------------------------------------------------
  // State: Airport Timetables
  // ------------------------------------------------------------------------
  const [selectedAirportCode, setSelectedAirportCode] = useState('JFK');
  const [scheduleType, setScheduleType] = useState<'departure' | 'arrival'>('departure');
  const [scheduleFilterQuery, setScheduleFilterQuery] = useState('');
  const [schedules, setSchedules] = useState<AirportScheduleItem[]>(DEMO_SCHEDULES);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [timetableErrorMsg, setTimetableErrorMsg] = useState<string | null>(null);

  const currentHubAirport =
    DEMO_AIRPORTS.find((a) => a.iata === selectedAirportCode) || DEMO_AIRPORTS[0];

  // ------------------------------------------------------------------------
  // Handler: Execute FreeAirportDB Search
  // ------------------------------------------------------------------------
  const handleAirportSearch = useCallback(async (queryToSearch: string) => {
    const trimmed = queryToSearch.trim();
    if (!trimmed) {
      setSearchError('Please enter an airport name or 3-letter IATA / 4-letter ICAO code.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setLastSearchedQuery(trimmed);

    try {
      const response = await apiService.searchAirports(trimmed, 30);
      if (response && response.success && Array.isArray(response.data)) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to FreeAirportDB service.';
      setSearchError(msg);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Load curated major hubs on first load asynchronously
  useEffect(() => {
    let isMounted = true;
    apiService
      .getAirportHubs()
      .then((response) => {
        if (isMounted && response?.success && Array.isArray(response.data)) {
          setSearchResults(response.data);
          setHasSearched(true);
          setLastSearchedQuery('Featured Hubs');
        }
      })
      .catch(() => {
        // Fallback to searching CCU if hubs endpoint is unreached
        apiService
          .searchAirports('CCU', 30)
          .then((res) => {
            if (isMounted && res?.success && Array.isArray(res.data)) {
              setSearchResults(res.data);
              setHasSearched(true);
              setLastSearchedQuery('CCU');
            }
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, []);


  // ------------------------------------------------------------------------
  // Effect: Fetch Timetables
  // ------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const fetchSchedules = async () => {
      setIsLoadingSchedules(true);
      setTimetableErrorMsg(null);
      try {
        const response = await apiService.getAirportSchedule(selectedAirportCode, scheduleType);
        if (isMounted && response && response.success) {
          const combined = [
            ...(response.departures || []),
            ...(response.arrivals || []),
          ];
          setSchedules(combined);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Backend offline';
          setTimetableErrorMsg(msg);
          setSchedules(DEMO_SCHEDULES);
        }
      } finally {
        if (isMounted) setIsLoadingSchedules(false);
      }
    };

    fetchSchedules();
    return () => {
      isMounted = false;
    };
  }, [selectedAirportCode, scheduleType]);

  const filteredSchedules = schedules.filter((item) => {
    const matchesAirport =
      item.airportCode === selectedAirportCode ||
      (item.id && item.id.includes(selectedAirportCode.toLowerCase()));
    const matchesType = item.type === scheduleType;
    const matchesSearch =
      scheduleFilterQuery.trim() === '' ||
      item.flightNumber.toLowerCase().includes(scheduleFilterQuery.toLowerCase()) ||
      item.airlineName.toLowerCase().includes(scheduleFilterQuery.toLowerCase()) ||
      (item.otherAirport.city || '').toLowerCase().includes(scheduleFilterQuery.toLowerCase());
    return matchesAirport && matchesType && matchesSearch;
  });

  const getDelayBadge = (delayIndex: string) => {
    switch (delayIndex) {
      case 'severe':
        return { bg: '#7F1D1D', text: '#FCA5A5', label: 'Severe Congestion' };
      case 'moderate':
        return { bg: '#78350F', text: '#FDE68A', label: 'Moderate Delays' };
      case 'minimal':
      default:
        return { bg: '#064E3B', text: '#6EE7B7', label: 'Normal Operations' };
    }
  };

  const delayBadge = getDelayBadge(currentHubAirport.metar.delayIndex);

  const handleAirportCardPress = (airport: AirportDetail) => {
    setSelectedAirportDetail(airport);
    setIsDetailModalVisible(true);
  };

  const handleViewTimetableForAirport = (iataCode: string) => {
    setSelectedAirportCode(iataCode.toUpperCase());
    setActiveTab('timetables');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title="Airports & Hubs"
          subtitle="FreeAirportDB Global Registry & Timetables"
        />

        {/* Top Segmented Controller */}
        <View style={styles.segmentedWrapper}>
          <View style={styles.segmentedBar}>
            <TouchableOpacity
              style={[
                styles.segmentItem,
                activeTab === 'search' && styles.segmentItemActive,
              ]}
              onPress={() => setActiveTab('search')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="search"
                size={14}
                color={activeTab === 'search' ? '#FFFFFF' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  activeTab === 'search' && styles.segmentItemTextActive,
                ]}
              >
                Airport Search
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentItem,
                activeTab === 'timetables' && styles.segmentItemActive,
              ]}
              onPress={() => setActiveTab('timetables')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={activeTab === 'timetables' ? '#FFFFFF' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentItemText,
                  activeTab === 'timetables' && styles.segmentItemTextActive,
                ]}
              >
                Flight Timetables
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================================================================ */}
        {/* TAB 1: AIRPORT SEARCH (FreeAirportDB)                             */}
        {/* ================================================================ */}
        {activeTab === 'search' && (
          <View style={{ flex: 1 }}>
            {/* Search Input Bar */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchFieldBox}>
                <Ionicons name="search" size={17} color="#38BDF8" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchTextInput}
                  placeholder="Search airport name, IATA, or ICAO (e.g. CCU)..."
                  placeholderTextColor="#64748B"
                  value={airportSearchInput}
                  onChangeText={setAirportSearchInput}
                  onSubmitEditing={() => handleAirportSearch(airportSearchInput)}
                  returnKeyType="search"
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {airportSearchInput.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setAirportSearchInput('');
                    }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.searchSubmitBtn}
                onPress={() => handleAirportSearch(airportSearchInput)}
                disabled={isSearching}
                activeOpacity={0.8}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.searchSubmitBtnText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Suggestion Chips */}
            <View style={styles.chipsScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScrollContent}
              >
                <Text style={styles.chipsLabel}>Quick:</Text>
                {QUICK_SEARCH_CHIPS.map((chip) => {
                  const isMatch = lastSearchedQuery.toUpperCase() === chip.query;
                  return (
                    <TouchableOpacity
                      key={chip.query}
                      style={[styles.quickChip, isMatch && styles.quickChipActive]}
                      onPress={() => {
                        setAirportSearchInput(chip.query);
                        handleAirportSearch(chip.query);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          isMatch && styles.quickChipTextActive,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Error Message Box */}
            {searchError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#F87171" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.errorTitle}>Search Failed</Text>
                  <Text style={styles.errorText}>{searchError}</Text>
                </View>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => handleAirportSearch(airportSearchInput || lastSearchedQuery || 'CCU')}
                >
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Main Airport Results Area */}
            <ScrollView
              style={styles.resultsScrollView}
              contentContainerStyle={styles.resultsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isSearching ? (
                <View style={styles.centerStateBox}>
                  <ActivityIndicator size="large" color="#38BDF8" />
                  <Text style={styles.loadingTitle}>Querying FreeAirportDB Registry...</Text>
                  <Text style={styles.loadingSub}>
                    Fetching real-time coordinates, elevation, and operational specifications
                  </Text>
                </View>
              ) : hasSearched && searchResults.length === 0 && !searchError ? (
                <View style={styles.centerStateBox}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="airplane-outline" size={36} color="#64748B" />
                  </View>
                  <Text style={styles.searchEmptyTitle}>No Airports Found</Text>
                  <Text style={styles.searchEmptySub}>
                    No airports matched &ldquo;{lastSearchedQuery}&rdquo; in the global database.
                  </Text>
                  <Text style={styles.searchEmptyAdvice}>
                    • Try a 3-letter IATA code (e.g., CCU, JFK, LHR, DXB)
                    {'\n'}• Try a 4-letter ICAO code (e.g., VECC, KJFK, EGLL)
                    {'\n'}• Try a city or airport name (e.g., Kolkata, Heathrow)
                  </Text>
                </View>
              ) : searchResults.length > 0 ? (
                <View>
                  <View style={styles.resultsCountHeader}>
                    <Text style={styles.resultsCountText}>
                      Found {searchResults.length} {searchResults.length === 1 ? 'airport' : 'airports'} for &ldquo;{lastSearchedQuery}&rdquo;
                    </Text>
                    <View style={styles.apiSourceBadge}>
                      <Ionicons name="cloud-done-outline" size={11} color="#38BDF8" style={{ marginRight: 3 }} />
                      <Text style={styles.apiSourceText}>FreeAirportDB</Text>
                    </View>
                  </View>

                  {searchResults.map((airport, idx) => (
                    <AirportCard
                      key={`${airport.code || airport.iata || airport.icao || 'airport'}-${idx}`}
                      airport={airport}
                      onPress={handleAirportCardPress}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.centerStateBox}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="search" size={32} color="#38BDF8" />
                  </View>
                  <Text style={styles.searchEmptyTitle}>Global Airport Directory</Text>
                  <Text style={styles.searchEmptySub}>
                    Search over 70,000 airports worldwide with verified telemetry from FreeAirportDB.
                  </Text>
                  <Text style={styles.searchEmptyAdvice}>
                    • Search by 3-letter IATA code (e.g., CCU, JFK, LHR, DXB)
                    {'\n'}• Search by 4-letter ICAO code (e.g., VECC, KJFK, EGLL)
                    {'\n'}• Search by city or airport name (e.g., Kolkata, Heathrow)
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* ================================================================ */}
        {/* TAB 2: FLIGHT TIMETABLES (Existing Demo & Hub Timetables)         */}
        {/* ================================================================ */}
        {activeTab === 'timetables' && (
          <View style={{ flex: 1 }}>
            {/* Hub Selector Horizontal Chips */}
            <View style={styles.airportScrollWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.airportScroll}
              >
                {DEMO_AIRPORTS.map((airport) => {
                  const isSelected = airport.iata === selectedAirportCode;
                  return (
                    <TouchableOpacity
                      key={airport.iata}
                      style={[
                        styles.airportChip,
                        isSelected && styles.airportChipActive,
                      ]}
                      onPress={() => setSelectedAirportCode(airport.iata || 'JFK')}
                    >
                      <Text
                        style={[
                          styles.airportChipCode,
                          isSelected && styles.airportChipCodeActive,
                        ]}
                      >
                        {airport.iata}
                      </Text>
                      <Text
                        style={[
                          styles.airportChipCity,
                          isSelected && styles.airportChipCityActive,
                        ]}
                      >
                        {airport.city}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* METAR & Weather Banner */}
            <View style={styles.metarCard}>
              <View style={styles.metarTopRow}>
                <View style={styles.metarNameBlock}>
                  <Text style={styles.airportFullName}>{currentHubAirport.name}</Text>
                  <Text style={styles.metarWeather}>
                    ☀️ {currentHubAirport.metar.temperatureC}°C • {currentHubAirport.metar.condition} • Wind {currentHubAirport.metar.windSpeedKnots} kts
                  </Text>
                </View>

                <View style={[styles.delayPill, { backgroundColor: delayBadge.bg }]}>
                  <Text style={[styles.delayPillText, { color: delayBadge.text }]}>
                    {delayBadge.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.delayDescText}>{currentHubAirport.metar.delayDescription}</Text>
            </View>

            {/* Filter and Departure/Arrival Toggle */}
            <View style={styles.tabsSection}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by flight, airline, destination..."
                  placeholderTextColor="#64748B"
                  value={scheduleFilterQuery}
                  onChangeText={setScheduleFilterQuery}
                />
                {scheduleFilterQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setScheduleFilterQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scheduleType === 'departure' && styles.typeBtnActive,
                  ]}
                  onPress={() => setScheduleType('departure')}
                >
                  <Ionicons
                    name="airplane-outline"
                    size={14}
                    color={scheduleType === 'departure' ? '#FFFFFF' : '#94A3B8'}
                    style={{ transform: [{ rotate: '45deg' }] }}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      scheduleType === 'departure' && styles.typeBtnTextActive,
                    ]}
                  >
                    Departures
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    scheduleType === 'arrival' && styles.typeBtnActive,
                  ]}
                  onPress={() => setScheduleType('arrival')}
                >
                  <Ionicons
                    name="airplane"
                    size={14}
                    color={scheduleType === 'arrival' ? '#FFFFFF' : '#94A3B8'}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      scheduleType === 'arrival' && styles.typeBtnTextActive,
                    ]}
                  >
                    Arrivals
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {timetableErrorMsg && (
              <View style={styles.errorNotice}>
                <Ionicons name="information-circle-outline" size={13} color="#FDE68A" />
                <Text style={styles.errorNoticeText}>
                  Backend unreachable — displaying local demo schedule.
                </Text>
              </View>
            )}

            {/* Schedule List */}
            <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
              {isLoadingSchedules ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#38BDF8" />
                  <Text style={styles.loadingText}>Fetching timetable from backend...</Text>
                </View>
              ) : filteredSchedules.length > 0 ? (
                filteredSchedules.map((item) => (
                  <FlightScheduleCard key={item.id} item={item} />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="airplane-outline" size={40} color="#334155" />
                  <Text style={styles.emptyText}>No flights found matching your search</Text>
                  <Text style={styles.emptySub}>
                    Try clearing the search query or selecting a different airport hub
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Airport Detail Modal */}
        <AirportDetailModal
          airport={selectedAirportDetail}
          visible={isDetailModalVisible}
          onClose={() => setIsDetailModalVisible(false)}
          onViewTimetable={handleViewTimetableForAirport}
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

  // Segmented Bar
  segmentedWrapper: {
    backgroundColor: '#0A1329',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: '#131D38',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 7,
  },
  segmentItemActive: {
    backgroundColor: '#0284C7',
  },
  segmentItemText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Search Bar
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchFieldBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A36',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchTextInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
  },
  searchSubmitBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Quick Chips
  chipsScrollWrapper: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  chipsLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
    textTransform: 'uppercase',
  },
  quickChip: {
    backgroundColor: '#131D38',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  quickChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  quickChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },

  // Search Results
  resultsScrollView: {
    flex: 1,
  },
  resultsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  resultsCountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultsCountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  apiSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  apiSourceText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },

  // Center States (Loading & Empty)
  centerStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  loadingSub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#131D38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchEmptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  searchEmptySub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  searchEmptyAdvice: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    backgroundColor: '#0F1A36',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },

  // Error Box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 11,
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Timetables Tab Styles
  airportScrollWrapper: {
    backgroundColor: '#0A1329',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  airportScroll: {
    paddingHorizontal: 16,
  },
  airportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D38',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  airportChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  airportChipCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  airportChipCodeActive: {
    color: '#FFFFFF',
  },
  airportChipCity: {
    fontSize: 11,
    color: '#94A3B8',
  },
  airportChipCityActive: {
    color: '#E0F2FE',
  },
  metarCard: {
    backgroundColor: '#0F1A36',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metarNameBlock: {
    flex: 1,
    marginRight: 8,
  },
  airportFullName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  metarWeather: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  delayPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  delayPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  delayDescText: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 6,
    fontStyle: 'italic',
  },
  tabsSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1A36',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 12,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#131D38',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: '#0284C7',
  },
  typeBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});
