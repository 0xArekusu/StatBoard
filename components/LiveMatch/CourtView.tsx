/**
 * CourtView Component
 *
 * Displays the basketball court with action markers
 */

import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import {
  MatchEvent,
  FilterMode,
  TeamId,
  TeamFilterMode,
  TEMPORARY_MARKER_DISPLAY_DURATION,
} from "../../constants/liveMatchConstants";
import { ActionType, getActionColor } from "../../src/models/ActionTypes";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { useTheme } from "../../src/contexts/ThemeContext";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
} from "../../constants";

interface CourtViewProps {
  onCourtClick: (x: number, y: number) => void;
  events: MatchEvent[];
  showMarkers: boolean;
  filterMode: FilterMode;
  selectedPlayerIds: string[];
  selectedPeriodIds?: number[];
  selectedTeamFilter?: TeamFilterMode;
  isHome?: boolean;
  trackOpponentStats?: boolean;
  clubLogoUrl: string | null;
  courtBackgroundColor: string;
  courtLineColor: string;
}

export const CourtView: React.FC<CourtViewProps> = ({
  onCourtClick,
  events,
  showMarkers,
  filterMode,
  selectedPlayerIds,
  selectedPeriodIds = [],
  selectedTeamFilter = TeamFilterMode.ALL,
  isHome = true,
  trackOpponentStats = false,
  clubLogoUrl,
  courtBackgroundColor,
  courtLineColor,
}) => {
  const { colors } = useTheme();
  const [courtDimensions, setCourtDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Temporary display of last marker when stats are hidden
  const [showLastMarker, setShowLastMarker] = useState(false);
  const previousEventsLengthRef = useRef(events?.length || 0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Detect when a new event is added and briefly show it when markers are hidden
  useEffect(() => {
    const currentEventsLength = events?.length || 0;

    // If a new event was added and markers are hidden
    if (currentEventsLength > previousEventsLengthRef.current && !showMarkers) {
      // Show the last marker with fade in
      setShowLastMarker(true);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();

      // Fade out animation after the configured duration
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200, // Fade out over 200ms
          useNativeDriver: true,
        }).start(() => {
          setShowLastMarker(false);
        });
      }, TEMPORARY_MARKER_DISPLAY_DURATION);

      return () => clearTimeout(timer);
    }

    // Update the reference
    previousEventsLengthRef.current = currentEventsLength;
  }, [events?.length, showMarkers, fadeAnim]);

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCourtDimensions({ width, height });
  };

  const filteredEvents = events?.filter((e: MatchEvent) => {
    if (!e.coordinates) return false;

    // Filter by team
    if (trackOpponentStats) {
      // If tracking opponent stats, filter by selected team
      if (selectedTeamFilter === TeamFilterMode.US) {
        // Show only our team's actions
        const ourTeamId = isHome ? TeamId.HOME : TeamId.AWAY;
        if (e.teamId !== ourTeamId) return false;
      } else if (selectedTeamFilter === TeamFilterMode.THEM) {
        // Show only opponent's actions
        const theirTeamId = isHome ? TeamId.AWAY : TeamId.HOME;
        if (e.teamId !== theirTeamId) return false;
      }
      // If TeamFilterMode.ALL, show both teams
    } else {
      // If NOT tracking opponent stats, only show our team's actions
      const ourTeamId = isHome ? TeamId.HOME : TeamId.AWAY;
      if (e.teamId !== ourTeamId) return false;
    }

    // Filter by period if selection exists
    if (selectedPeriodIds.length > 0 && e.period_number) {
      if (!selectedPeriodIds.includes(e.period_number)) return false;
    }

    // Filter by player if selection exists
    if (selectedPlayerIds.length > 0 && e.playerId) {
      if (!selectedPlayerIds.includes(e.playerId)) return false;
    }

    // Filter by action type
    if (filterMode === FilterMode.ALL) return true;
    if (filterMode === FilterMode.SHOOTING)
      return e.action_type === ActionType.SHOT;
    if (filterMode === FilterMode.REBOUNDS)
      return e.action_type === ActionType.REBOUND;
    if (filterMode === FilterMode.ASSISTS)
      return e.action_type === ActionType.ASSIST;
    if (filterMode === FilterMode.FOULS)
      return e.action_type === ActionType.FOUL;
    if (filterMode === FilterMode.FOULS_DRAWN)
      return e.action_type === ActionType.FOUL_DRAWN;
    if (filterMode === FilterMode.TURNOVERS)
      return e.action_type === ActionType.TURNOVER;
    if (filterMode === FilterMode.BLOCKS)
      return e.action_type === ActionType.BLOCK;
    if (filterMode === FilterMode.STEALS)
      return e.action_type === ActionType.STEAL;
    return true;
  });

  // Determine which events to display as markers
  let eventsToDisplay =
    filteredEvents?.filter((evt: MatchEvent) => {
      // Filter out events without valid court coordinates (e.g., quick score buttons with -999)
      return (
        evt.coordinates &&
        evt.coordinates.x >= 0 &&
        evt.coordinates.y >= 0 &&
        evt.coordinates.x <= 1 &&
        evt.coordinates.y <= 1
      );
    }) || [];

  // If showLastMarker is true and showMarkers is false, only show the most recent marker
  if (showLastMarker && !showMarkers && eventsToDisplay.length > 0) {
    eventsToDisplay = [eventsToDisplay[0]]; // First element is the most recent (events are prepended)
  } else if (!showMarkers) {
    eventsToDisplay = []; // No markers when hidden and not showing last marker
  }

  const markers = eventsToDisplay.map((evt: MatchEvent) => {
    // Get color from centralized ACTION_CONFIG
    const markerColor = getActionColor(
      evt.action_type,
      evt.specification,
      evt.points,
    );

    // Convert normalized coordinates (0-1) to portrait SVG coordinates (0-COURT_SVG_WIDTH_PORTRAIT x 0-COURT_SVG_HEIGHT_PORTRAIT)
    const svgX = evt.coordinates!.x * COURT_SVG_WIDTH_PORTRAIT;
    const svgY = evt.coordinates!.y * COURT_SVG_HEIGHT_PORTRAIT;

    return {
      id: evt.id,
      svgX,
      svgY,
      color: markerColor,
      actionType: evt.action_type,
      specification: evt.specification,
      playerNumber: evt.playerNumber,
    };
  });

  // Separate markers for fade animation
  // When showLastMarker is true, we show only the last marker with fade effect
  // Otherwise, we show all markers normally
  const lastMarker =
    showLastMarker && eventsToDisplay.length > 0 ? [markers[0]] : [];
  const regularMarkers = showLastMarker ? [] : markers;

  return (
    <View style={styles.courtContainer} onLayout={handleLayout}>
      <BasketballCourtSVG
        width={courtDimensions.width || 400}
        height={courtDimensions.height || 600}
        onCourtPress={(svgX: number, svgY: number) => {
          onCourtClick(svgX, svgY);
        }}
        backgroundColor={courtBackgroundColor}
        lineColor={courtLineColor}
        logoUri={clubLogoUrl}
        markers={regularMarkers}
      />
      {/* Animated overlay for last marker with fade effect */}
      {showLastMarker && lastMarker.length > 0 && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: fadeAnim,
              pointerEvents: "none",
            },
          ]}
        >
          <BasketballCourtSVG
            width={courtDimensions.width || 400}
            height={courtDimensions.height || 600}
            backgroundColor="transparent"
            lineColor="transparent"
            logoUri={clubLogoUrl}
            markers={lastMarker}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  courtContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
