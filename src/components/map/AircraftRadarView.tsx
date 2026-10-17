import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AircraftTelemetry, FreshnessStatus } from '@/types';
import { FreshnessIndicator } from '@/components/common/FreshnessIndicator';

interface Props {
  aircraftList: AircraftTelemetry[];
  onSelectAircraft: (aircraft: AircraftTelemetry | null) => void;
  selectedAircraft: AircraftTelemetry | null;
  onOpenDetails?: (aircraft: AircraftTelemetry) => void;
}

interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type LabelDirection =
  | 'right'
  | 'left'
  | 'top'
  | 'bottom'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left';

interface LabelOffsetStyle {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

interface DirectionLayout {
  box: BoundingBox;
  style: LabelOffsetStyle;
}

/**
 * Checks if two bounding boxes collide with an optional padding
 */
function doBoxesCollide(a: BoundingBox, b: BoundingBox, padding: number = 4): boolean {
  return !(
    a.maxX + padding < b.minX ||
    a.minX - padding > b.maxX ||
    a.maxY + padding < b.minY ||
    a.minY - padding > b.maxY
  );
}

/**
 * Computes maximum distance from radar center across the 4 corners of a bounding box
 */
function getBoxMaxCenterDist(box: BoundingBox, centerX: number, centerY: number): number {
  const corners = [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.minX, y: box.maxY },
    { x: box.maxX, y: box.maxY },
  ];
  return Math.max(...corners.map((c) => Math.hypot(c.x - centerX, c.y - centerY)));
}

/**
 * Calculates bounding box and style offsets for a candidate label direction
 */
function getDirectionLayout(
  pos: { x: number; y: number },
  direction: LabelDirection,
  labelWidth: number,
  labelHeight: number,
  isSelected: boolean
): DirectionLayout {
  const gap = isSelected ? 16 : 13;
  const halfW = Math.round(labelWidth / 2);
  const halfH = Math.round(labelHeight / 2);
  const diagX = isSelected ? 12 : 10;
  const diagY = isSelected ? 14 : 12;

  switch (direction) {
    case 'right':
      return {
        box: {
          minX: pos.x + gap,
          maxX: pos.x + gap + labelWidth,
          minY: pos.y - halfH,
          maxY: pos.y + halfH,
        },
        style: { left: gap, top: -halfH },
      };
    case 'left':
      return {
        box: {
          minX: pos.x - gap - labelWidth,
          maxX: pos.x - gap,
          minY: pos.y - halfH,
          maxY: pos.y + halfH,
        },
        style: { right: gap, top: -halfH },
      };
    case 'top':
      return {
        box: {
          minX: pos.x - halfW,
          maxX: pos.x + halfW,
          minY: pos.y - gap - labelHeight,
          maxY: pos.y - gap,
        },
        style: { left: -halfW, bottom: gap },
      };
    case 'bottom':
      return {
        box: {
          minX: pos.x - halfW,
          maxX: pos.x + halfW,
          minY: pos.y + gap,
          maxY: pos.y + gap + labelHeight,
        },
        style: { left: -halfW, top: gap },
      };
    case 'top-right':
      return {
        box: {
          minX: pos.x + diagX,
          maxX: pos.x + diagX + labelWidth,
          minY: pos.y - diagY - labelHeight,
          maxY: pos.y - diagY,
        },
        style: { left: diagX, bottom: diagY },
      };
    case 'top-left':
      return {
        box: {
          minX: pos.x - diagX - labelWidth,
          maxX: pos.x - diagX,
          minY: pos.y - diagY - labelHeight,
          maxY: pos.y - diagY,
        },
        style: { right: diagX, bottom: diagY },
      };
    case 'bottom-right':
      return {
        box: {
          minX: pos.x + diagX,
          maxX: pos.x + diagX + labelWidth,
          minY: pos.y + diagY,
          maxY: pos.y + diagY + labelHeight,
        },
        style: { left: diagX, top: diagY },
      };
    case 'bottom-left':
      return {
        box: {
          minX: pos.x - diagX - labelWidth,
          maxX: pos.x - diagX,
          minY: pos.y + diagY,
          maxY: pos.y + diagY + labelHeight,
        },
        style: { right: diagX, top: diagY },
      };
  }
}

export function AircraftRadarView({
  aircraftList,
  onSelectAircraft,
  selectedAircraft,
  onOpenDetails,
}: Props) {
  const [filter, setFilter] = useState<'all' | FreshnessStatus>('all');
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar');

  // Responsive dimensions considering both screen width and available vertical space
  const { width, height } = useWindowDimensions();
  const radarSize = Math.max(
    240,
    Math.min(width - 32, 310, Math.floor(height * 0.36))
  );
  const radarRadius = radarSize / 2;

  const filteredAircraft = useMemo(() => {
    return aircraftList.filter((ac) => {
      if (filter === 'all') return true;
      return ac.freshness.status === filter;
    });
  }, [aircraftList, filter]);

  /**
   * Deterministic radar coordinate calculation
   * Matches original radar distribution without altering aircraft coordinates
   */
  const getRadarOffset = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const distanceRatios = [0.35, 0.65, 0.45, 0.75, 0.25, 0.8, 0.55];
    const r = (distanceRatios[index % distanceRatios.length] || 0.5) * (radius - 32);
    const x = radius + r * Math.cos(angle);
    const y = radius + r * Math.sin(angle);
    return { x, y };
  };

  const getStatusColor = (status: FreshnessStatus) => {
    switch (status) {
      case 'valid':
        return '#10B981';
      case 'stale':
        return '#F59E0B';
      case 'missing':
        return '#9CA3AF';
      case 'unavailable':
        return '#EF4444';
    }
  };

  /**
   * Smart label decluttering and multi-directional collision avoidance algorithm:
   * 1. Preserves each aircraft's exact radar blip coordinates without moving any markers.
   * 2. Evaluates label bounding boxes in multiple directions (Right, Left, Top, Bottom, Diagonals)
   *    around the selected aircraft to ensure the label does not cover nearby aircraft markers or labels.
   * 3. Selected aircraft ALWAYS has highest priority, full altitude label, and zIndex.
   * 4. Suppresses crowded non-selected labels to prevent unreadable text overlaps when ~40 aircraft are active.
   */
  const labelLayouts = useMemo(() => {
    const total = filteredAircraft.length;
    if (total === 0) return [];

    // Step 1: Precompute coordinates and footprints for all aircraft
    const items = filteredAircraft.map((aircraft, index) => {
      const pos = getRadarOffset(index, total, radarRadius);
      const isSelected = selectedAircraft?.flightNumber === aircraft.flightNumber;
      const statusColor = getStatusColor(aircraft.freshness.status);

      // Aircraft marker footprint (radius 14 for selected, 11 for standard)
      const iconRadius = isSelected ? 14 : 11;
      const iconBox: BoundingBox = {
        minX: pos.x - iconRadius,
        maxX: pos.x + iconRadius,
        minY: pos.y - iconRadius,
        maxY: pos.y + iconRadius,
      };

      // Accurate label dimensions based on callsign and altitude badge text
      const callsignStr = aircraft.callsign || aircraft.flightNumber;
      let labelWidth = 44;
      let labelHeight = 15;

      if (isSelected) {
        const altStr =
          aircraft.altitudeFeet !== null
            ? `FL${Math.round(aircraft.altitudeFeet / 100)}`
            : 'ALT ?';
        labelWidth = Math.max(76, Math.min(108, (callsignStr.length + altStr.length) * 6.5 + 20));
        labelHeight = 22;
      } else {
        labelWidth = Math.max(38, Math.min(60, callsignStr.length * 6.5 + 10));
        labelHeight = 15;
      }

      return {
        aircraft,
        index,
        pos,
        isSelected,
        statusColor,
        iconBox,
        labelWidth,
        labelHeight,
      };
    });

    const placedBoxes: BoundingBox[] = [];
    const layoutMap = new Map<
      string,
      { showLabel: boolean; directionStyle: LabelOffsetStyle }
    >();

    // Seed icon areas for all aircraft blips so labels never obscure aircraft markers
    items.forEach((item) => {
      placedBoxes.push(item.iconBox);
    });

    // Seed center radar antenna to keep it clean
    placedBoxes.push({
      minX: radarRadius - 6,
      maxX: radarRadius + 6,
      minY: radarRadius - 6,
      maxY: radarRadius + 6,
    });

    // Step 2: Handle selected aircraft with multi-directional collision avoidance
    const selectedItem = items.find((it) => it.isSelected);
    if (selectedItem) {
      const isRightHalf = selectedItem.pos.x >= radarRadius;
      const isBottomHalf = selectedItem.pos.y >= radarRadius;

      // Candidate directions prioritized by natural inward radar scope quadrant
      const preferredDirections: LabelDirection[] = isRightHalf
        ? isBottomHalf
          ? ['top-left', 'left', 'top', 'bottom-left', 'top-right', 'bottom', 'bottom-right', 'right']
          : ['bottom-left', 'left', 'bottom', 'top-left', 'bottom-right', 'top', 'top-right', 'right']
        : isBottomHalf
          ? ['top-right', 'right', 'top', 'bottom-right', 'top-left', 'bottom', 'bottom-left', 'left']
          : ['bottom-right', 'right', 'bottom', 'top-right', 'bottom-left', 'top', 'top-left', 'left'];

      const otherIconBoxes = items
        .filter((it) => !it.isSelected)
        .map((it) => it.iconBox);

      // Evaluate candidate directions to avoid covering nearby markers and stay in scope
      let bestLayout: DirectionLayout = getDirectionLayout(
        selectedItem.pos,
        preferredDirections[0],
        selectedItem.labelWidth,
        selectedItem.labelHeight,
        true
      );
      let bestScore = -Infinity;

      for (const dir of preferredDirections) {
        const layout = getDirectionLayout(
          selectedItem.pos,
          dir,
          selectedItem.labelWidth,
          selectedItem.labelHeight,
          true
        );

        // Check collisions with other aircraft markers
        const markerCollisions = otherIconBoxes.filter((box) =>
          doBoxesCollide(layout.box, box, 4)
        ).length;

        // Check scope circle containment
        const maxDist = getBoxMaxCenterDist(layout.box, radarRadius, radarRadius);
        const scopeOverflow = Math.max(0, maxDist - (radarRadius - 2));

        // Calculate clearance from closest adjacent aircraft marker center
        const boxCenter = {
          x: (layout.box.minX + layout.box.maxX) / 2,
          y: (layout.box.minY + layout.box.maxY) / 2,
        };
        const minDistanceToOther = items
          .filter((it) => !it.isSelected)
          .reduce((min, it) => {
            const d = Math.hypot(boxCenter.x - it.pos.x, boxCenter.y - it.pos.y);
            return Math.min(min, d);
          }, 9999);

        // Score: strictly penalize marker collisions (-1000 each) and scope overflow (-50 per px),
        // reward clearance from nearby aircraft markers
        const score = -markerCollisions * 1000 - scopeOverflow * 50 + minDistanceToOther;

        if (score > bestScore) {
          bestScore = score;
          bestLayout = layout;
        }
      }

      // Selected label is ALWAYS visible and claimed in placedBoxes
      layoutMap.set(selectedItem.aircraft.flightNumber, {
        showLabel: true,
        directionStyle: bestLayout.style,
      });
      placedBoxes.push(bestLayout.box);
    }

    // Step 3: Handle non-selected aircraft with decluttering (hide when crowded)
    const nonSelectedItems = items.filter((it) => !it.isSelected);

    // Prioritize valid telemetry status over stale/missing
    nonSelectedItems.sort((a, b) => {
      const valA = a.aircraft.freshness.status === 'valid' ? 0 : 1;
      const valB = b.aircraft.freshness.status === 'valid' ? 0 : 1;
      return valA - valB;
    });

    for (const item of nonSelectedItems) {
      const flightKey = item.aircraft.flightNumber;
      const isRightHalf = item.pos.x >= radarRadius;
      const isBottomHalf = item.pos.y >= radarRadius;

      // Try quadrant-appropriate directions for compact non-selected callsign tag
      const candidateDirections: LabelDirection[] = isRightHalf
        ? isBottomHalf
          ? ['left', 'bottom-left', 'top-left']
          : ['left', 'top-left', 'bottom-left']
        : isBottomHalf
          ? ['right', 'bottom-right', 'top-right']
          : ['right', 'top-right', 'bottom-right'];

      let chosenLayout: DirectionLayout | null = null;

      for (const dir of candidateDirections) {
        const layout = getDirectionLayout(
          item.pos,
          dir,
          item.labelWidth,
          item.labelHeight,
          false
        );

        // Check collision against placed aircraft markers, selected label, and prior labels
        const collides = placedBoxes.some((placed) =>
          doBoxesCollide(layout.box, placed, 4)
        );

        const maxDist = getBoxMaxCenterDist(layout.box, radarRadius, radarRadius);
        const fitsInScope = maxDist <= radarRadius - 2;

        if (!collides && fitsInScope) {
          chosenLayout = layout;
          break;
        }
      }

      if (chosenLayout) {
        // Space is available: display label and claim bounding box
        layoutMap.set(flightKey, {
          showLabel: true,
          directionStyle: chosenLayout.style,
        });
        placedBoxes.push(chosenLayout.box);
      } else {
        // Radar is crowded around this target: hide label without moving marker
        layoutMap.set(flightKey, {
          showLabel: false,
          directionStyle: {
            [isRightHalf ? 'right' : 'left']: 13,
            top: -7,
          },
        });
      }
    }

    return items.map((item) => {
      const layout = layoutMap.get(item.aircraft.flightNumber);
      return {
        ...item,
        showLabel: Boolean(layout?.showLabel),
        directionStyle: layout?.directionStyle || { left: 13, top: -7 },
      };
    });
  }, [filteredAircraft, selectedAircraft, radarRadius]);

  const visibleLabelCount = useMemo(() => {
    return labelLayouts.filter((l) => l.showLabel).length;
  }, [labelLayouts]);

  const handleCardPress = (aircraft: AircraftTelemetry) => {
    if (onOpenDetails) {
      onOpenDetails(aircraft);
    } else {
      onSelectAircraft(aircraft);
    }
  };

  return (
    <View style={styles.container}>
      {/* View Switcher & Filters */}
      <View style={styles.controlHeader}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'radar' && styles.modeButtonActive]}
            onPress={() => setViewMode('radar')}
          >
            <Ionicons
              name="radio-outline"
              size={14}
              color={viewMode === 'radar' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'radar' && styles.modeButtonTextActive,
              ]}
            >
              Radar Scope
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'list' && styles.modeButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons
              name="list-outline"
              size={14}
              color={viewMode === 'list' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.modeButtonText,
                viewMode === 'list' && styles.modeButtonTextActive,
              ]}
            >
              Flight List ({aircraftList.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({aircraftList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'valid' && styles.filterPillActive]}
            onPress={() => setFilter('valid')}
          >
            <View style={[styles.pillDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.filterText, filter === 'valid' && styles.filterTextActive]}>
              Live Valid
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'stale' && styles.filterPillActive]}
            onPress={() => setFilter('stale')}
          >
            <View style={[styles.pillDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.filterText, filter === 'stale' && styles.filterTextActive]}>
              Stale (Lagging)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'missing' && styles.filterPillActive]}
            onPress={() => setFilter('missing')}
          >
            <View style={[styles.pillDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={[styles.filterText, filter === 'missing' && styles.filterTextActive]}>
              Incomplete Data
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {viewMode === 'radar' ? (
        <ScrollView
          style={styles.radarScroll}
          contentContainerStyle={styles.radarWrapper}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Circular Radar Scope */}
          <View style={[styles.radarCircle, { width: radarSize, height: radarSize, borderRadius: radarRadius }]}>
            {/* Background Scope Layer: Rings, Crosshairs, Cardinals, Center */}
            <View
              style={[
                styles.radarBackgroundLayer,
                { width: radarSize, height: radarSize, borderRadius: radarRadius },
              ]}
              pointerEvents="none"
            >
              {/* Range Rings */}
              <View
                style={[
                  styles.rangeRing,
                  {
                    width: radarSize * 0.75,
                    height: radarSize * 0.75,
                    transform: [{ translateX: -radarSize * 0.375 }, { translateY: -radarSize * 0.375 }],
                  },
                ]}
              />
              <View
                style={[
                  styles.rangeRing,
                  {
                    width: radarSize * 0.5,
                    height: radarSize * 0.5,
                    transform: [{ translateX: -radarSize * 0.25 }, { translateY: -radarSize * 0.25 }],
                  },
                ]}
              />
              <View
                style={[
                  styles.rangeRing,
                  {
                    width: radarSize * 0.25,
                    height: radarSize * 0.25,
                    transform: [{ translateX: -radarSize * 0.125 }, { translateY: -radarSize * 0.125 }],
                  },
                ]}
              />

              {/* Crosshairs */}
              <View style={styles.crosshairVertical} />
              <View style={styles.crosshairHorizontal} />

              {/* Cardinal Labels */}
              <Text style={[styles.cardinalLabel, styles.cardinalN]}>N</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalE]}>E</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalS]}>S</Text>
              <Text style={[styles.cardinalLabel, styles.cardinalW]}>W</Text>

              {/* Range marker */}
              <Text style={styles.rangeText}>100 NM</Text>

              {/* Center Station / Radar Antenna */}
              <View style={styles.radarCenter}>
                <View style={styles.antennaDot} />
              </View>
            </View>

            {/* Aircraft Targets & Labels Layer (Strictly Above Background Layer) */}
            <View
              style={[
                styles.radarTargetsLayer,
                { width: radarSize, height: radarSize },
              ]}
              pointerEvents="box-none"
            >
              {labelLayouts.map((item) => {
                const { aircraft, pos, isSelected, statusColor, showLabel, directionStyle } = item;

                return (
                  <View
                    key={aircraft.flightNumber}
                    pointerEvents="box-none"
                    style={[
                      styles.blipContainer,
                      {
                        left: pos.x,
                        top: pos.y,
                        zIndex: isSelected ? 999 : 10,
                        elevation: isSelected ? 30 : 6,
                      },
                    ]}
                  >
                    {/* Interactive Aircraft Marker Circle */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => onSelectAircraft(aircraft)}
                      style={[
                        styles.markerTouchTarget,
                        isSelected && styles.markerTouchTargetSelected,
                      ]}
                    >
                      {/* Selected Glowing Reticle Ring */}
                      {isSelected && <View style={styles.selectedReticleGlow} />}

                      <View
                        style={[
                          styles.iconCircle,
                          {
                            borderColor: isSelected ? '#38BDF8' : statusColor,
                            borderWidth: isSelected ? 2 : 1.5,
                          },
                        ]}
                      >
                        <View
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              backgroundColor: `${statusColor}33`,
                              borderRadius: 11,
                            },
                          ]}
                        />
                        <Ionicons
                          name="airplane"
                          size={isSelected ? 13 : 11}
                          color={isSelected ? '#38BDF8' : statusColor}
                          style={{
                            transform: [{ rotate: `${aircraft.headingDegrees || 0}deg` }],
                          }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Callsign & Altitude Tag (Smartly Placed without Overlap) */}
                    {(showLabel || isSelected) && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => onSelectAircraft(aircraft)}
                        style={[
                          styles.callsignTagPill,
                          isSelected && styles.callsignTagSelected,
                          directionStyle,
                        ]}
                      >
                        <Text
                          style={[
                            styles.compactCallsignText,
                            { color: isSelected ? '#38BDF8' : statusColor },
                          ]}
                          numberOfLines={1}
                        >
                          {aircraft.callsign || aircraft.flightNumber}
                        </Text>

                        {/* Display altitude clearly on selected target */}
                        {isSelected && (
                          <Text style={styles.selectedAltitudeBadge}>
                            {aircraft.altitudeFeet !== null
                              ? `FL${Math.round(aircraft.altitudeFeet / 100)}`
                              : 'FL--'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Interactive Radar Target HUD Card */}
          {selectedAircraft ? (
            <View style={styles.targetHudCard}>
              <View style={styles.targetHudTop}>
                <View style={styles.targetHudInfo}>
                  <View style={styles.targetTitleRow}>
                    <Text style={styles.targetFlightNumber}>
                      {selectedAircraft.flightNumber}
                    </Text>
                    <View style={styles.targetCallsignBadge}>
                      <Text style={styles.targetCallsignText}>
                        {selectedAircraft.callsign || selectedAircraft.flightNumber}
                      </Text>
                    </View>
                    <FreshnessIndicator freshness={selectedAircraft.freshness} compact />
                  </View>
                  <Text style={styles.targetAirlineName} numberOfLines={1}>
                    {selectedAircraft.isLive
                      ? (selectedAircraft.countryOfRegistration
                          ? `Reg: ${selectedAircraft.countryOfRegistration} • Live ADS-B`
                          : 'Live ADS-B Telemetry')
                      : `${selectedAircraft.airline.name || 'Demo Fleet'}${selectedAircraft.aircraftModel ? ` • ${selectedAircraft.aircraftModel}` : ''}`}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.targetCloseBtn}
                  onPress={() => onSelectAircraft(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Quick Telemetry Strip */}
              <View style={styles.targetMetricsStrip}>
                <View style={styles.targetMetricCol}>
                  <Text style={styles.targetMetricLabel}>ALTITUDE</Text>
                  <Text style={styles.targetMetricVal}>
                    {selectedAircraft.altitudeFeet !== null
                      ? `${selectedAircraft.altitudeFeet.toLocaleString()} ft`
                      : 'Unavailable'}
                  </Text>
                </View>

                <View style={styles.targetMetricCol}>
                  <Text style={styles.targetMetricLabel}>SPEED</Text>
                  <Text style={styles.targetMetricVal}>
                    {selectedAircraft.groundSpeedKnots !== null
                      ? `${selectedAircraft.groundSpeedKnots} kts`
                      : 'Unavailable'}
                  </Text>
                </View>

                <View style={styles.targetMetricCol}>
                  <Text style={styles.targetMetricLabel}>HEADING</Text>
                  <Text style={styles.targetMetricVal}>
                    {selectedAircraft.headingDegrees !== null
                      ? `${selectedAircraft.headingDegrees}°`
                      : 'Unavailable'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.inspectBtn}
                  onPress={() => {
                    if (onOpenDetails) {
                      onOpenDetails(selectedAircraft);
                    } else {
                      onSelectAircraft(selectedAircraft);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.inspectBtnText}>Details</Text>
                  <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.scopeNoticeBar}>
              <Ionicons name="finger-print-outline" size={14} color="#38BDF8" />
              <Text style={styles.scopeNoticeText}>
                Tap any target to inspect telemetry • {visibleLabelCount}/{filteredAircraft.length} labels active
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        /* List View */
        <ScrollView style={styles.listContainer}>
          {filteredAircraft.map((aircraft) => {
            const isSelected = selectedAircraft?.flightNumber === aircraft.flightNumber;
            return (
              <TouchableOpacity
                key={aircraft.flightNumber}
                style={[
                  styles.listCard,
                  isSelected && styles.listCardSelected,
                ]}
                onPress={() => handleCardPress(aircraft)}
              >
                <View style={styles.listCardTop}>
                  <View style={[styles.airlineBadge, aircraft.isLive && { backgroundColor: '#064E3B' }]}>
                    <Text style={[styles.airlineBadgeText, aircraft.isLive && { color: '#34D399' }]}>
                      {aircraft.isLive ? 'ADS-B' : (aircraft.airline.iata || 'AIR')}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.flightNumberText}>{aircraft.flightNumber}</Text>
                      {aircraft.isLive ? (
                        <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                          <Text style={{ color: '#10B981', fontSize: 9, fontWeight: '800' }}>LIVE ADS-B</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                          <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '800' }}>DEMO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.airlineNameText}>
                      {aircraft.isLive
                        ? (aircraft.countryOfRegistration ? `Country: ${aircraft.countryOfRegistration}` : 'Commercial route unavailable')
                        : aircraft.airline.name}
                    </Text>
                  </View>
                  <FreshnessIndicator freshness={aircraft.freshness} compact />
                </View>

                {/* Route Row or Live ADS-B Data Row */}
                {aircraft.isLive ? (
                  <View style={styles.liveTelemetryRow}>
                    <View style={styles.liveTelemetryCol}>
                      <Text style={styles.liveTelemetryLabel}>COORDINATES</Text>
                      <Text style={styles.liveTelemetryVal}>
                        {aircraft.latitude !== null && aircraft.longitude !== null
                          ? `${aircraft.latitude.toFixed(2)}°, ${aircraft.longitude.toFixed(2)}°`
                          : 'Unavailable'}
                      </Text>
                    </View>
                    <View style={styles.liveTelemetryCol}>
                      <Text style={styles.liveTelemetryLabel}>SQUAWK</Text>
                      <Text style={styles.liveTelemetryVal}>
                        {aircraft.squawkCode || 'Unavailable'}
                      </Text>
                    </View>
                    <View style={styles.liveTelemetryCol}>
                      <Text style={styles.liveTelemetryLabel}>VERT RATE</Text>
                      <Text
                        style={[
                          styles.liveTelemetryVal,
                          aircraft.verticalRateFpm && aircraft.verticalRateFpm > 100
                            ? { color: '#34D399' }
                            : aircraft.verticalRateFpm && aircraft.verticalRateFpm < -100
                            ? { color: '#F59E0B' }
                            : null,
                        ]}
                      >
                        {aircraft.verticalRateFpm !== null && aircraft.verticalRateFpm !== undefined
                          ? `${aircraft.verticalRateFpm > 0 ? '+' : ''}${aircraft.verticalRateFpm} fpm`
                          : 'Unavailable'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.routeRow}>
                    <View style={styles.airportBlock}>
                      <Text style={styles.iataCode}>{aircraft.origin?.iata || 'Unavailable'}</Text>
                      <Text style={styles.cityName}>{aircraft.origin?.city || 'Unavailable'}</Text>
                    </View>

                    <View style={styles.arrowBlock}>
                      <Ionicons name="airplane" size={14} color="#38BDF8" />
                      <View style={styles.flightLine} />
                    </View>

                    <View style={[styles.airportBlock, { alignItems: 'flex-end' }]}>
                      <Text style={styles.iataCode}>{aircraft.destination?.iata || 'Unavailable'}</Text>
                      <Text style={styles.cityName}>{aircraft.destination?.city || 'Unavailable'}</Text>
                    </View>
                  </View>
                )}

                {/* Telemetry Metrics Row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>ALTITUDE</Text>
                    <Text style={styles.metricValue}>
                      {aircraft.altitudeFeet !== null
                        ? `${aircraft.altitudeFeet.toLocaleString()} ft`
                        : 'Unavailable'}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>SPEED</Text>
                    <Text style={styles.metricValue}>
                      {aircraft.groundSpeedKnots !== null
                        ? `${aircraft.groundSpeedKnots} kts`
                        : 'Unavailable'}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>{aircraft.isLive ? 'STATE' : 'AIRCRAFT'}</Text>
                    <Text style={styles.metricValue} numberOfLines={1}>
                      {aircraft.isLive
                        ? (aircraft.onGround ? 'On Ground' : 'Airborne')
                        : (aircraft.aircraftModel || aircraft.status || 'Active')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  controlHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#0284C7',
  },
  modeButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  filterText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  radarScroll: {
    flex: 1,
  },
  radarWrapper: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 28,
  },
  radarCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  radarBackgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 1,
    elevation: 0,
  },
  radarTargetsLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 4,
  },
  rangeRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
    top: '50%',
    left: '50%',
    zIndex: 1,
    elevation: 0,
  },
  crosshairVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
    elevation: 0,
  },
  crosshairHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
    elevation: 0,
  },
  cardinalLabel: {
    position: 'absolute',
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '800',
    zIndex: 2,
    elevation: 1,
  },
  cardinalN: { top: 6, left: '50%', transform: [{ translateX: -4 }] },
  cardinalS: { bottom: 6, left: '50%', transform: [{ translateX: -4 }] },
  cardinalE: { right: 8, top: '50%', transform: [{ translateY: -6 }] },
  cardinalW: { left: 8, top: '50%', transform: [{ translateY: -6 }] },
  rangeText: {
    position: 'absolute',
    top: '28%',
    right: '28%',
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    zIndex: 2,
    elevation: 1,
  },
  radarCenter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -5 }, { translateY: -5 }],
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 1,
  },
  antennaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  blipContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerTouchTarget: {
    position: 'absolute',
    transform: [{ translateX: -11 }, { translateY: -11 }],
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
  },
  markerTouchTargetSelected: {
    transform: [{ translateX: -14 }, { translateY: -14 }],
    width: 28,
    height: 28,
    zIndex: 10,
    elevation: 10,
  },
  selectedReticleGlow: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    zIndex: 1,
    elevation: 1,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  callsignTagPill: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 5,
    elevation: 3,
  },
  callsignTagRight: {
    left: 13,
    top: -7,
  },
  callsignTagLeft: {
    right: 13,
    top: -7,
  },
  callsignTagSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    borderWidth: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 20,
    elevation: 12,
  },
  compactCallsignText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  selectedAltitudeBadge: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#0284C7',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  targetHudCard: {
    width: '94%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#0284C7',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  targetHudTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  targetHudInfo: {
    flex: 1,
    marginRight: 8,
  },
  targetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  targetFlightNumber: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  targetCallsignBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  targetCallsignText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
  },
  targetAirlineName: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  targetCloseBtn: {
    padding: 4,
  },
  targetMetricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  targetMetricCol: {
    flex: 1,
  },
  targetMetricLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  targetMetricVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 1,
  },
  inspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  inspectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  scopeNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  scopeNoticeText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  listCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  listCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airlineBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  airlineBadgeText: {
    color: '#0284C7',
    fontWeight: '800',
    fontSize: 12,
  },
  flightNumberText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  airlineNameText: {
    color: '#64748B',
    fontSize: 11,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  airportBlock: {
    minWidth: 80,
  },
  iataCode: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  cityName: {
    color: '#64748B',
    fontSize: 11,
  },
  arrowBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flightLine: {
    width: 60,
    height: 2,
    backgroundColor: '#0284C7',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  metricValue: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  liveTelemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveTelemetryCol: {
    flex: 1,
  },
  liveTelemetryLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveTelemetryVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
});
