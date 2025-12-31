/**
 * CourtView Component
 *
 * Displays the basketball court with action markers
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  MatchEvent,
  FilterMode,
  TeamId,
} from "../../constants/liveMatchConstants";
import { ActionType, getActionColor } from "../../src/models/ActionTypes";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { useTheme } from "../../src/contexts/ThemeContext";

interface CourtViewProps {
  onCourtClick: (x: number, y: number) => void;
  events: MatchEvent[];
  showMarkers: boolean;
  filterMode: FilterMode;
  selectedPlayerIds: string[];
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
  clubLogoUrl,
  courtBackgroundColor,
  courtLineColor,
}) => {
  const { colors } = useTheme();
  const [courtDimensions, setCourtDimensions] = useState({
    width: 0,
    height: 0,
  });

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setCourtDimensions({ width, height });
  };

  const filteredEvents = events?.filter((e: MatchEvent) => {
    if (!e.coordinates) return false;

    // Filter by player if selection exists
    if (selectedPlayerIds.length > 0 && e.playerId) {
      if (!selectedPlayerIds.includes(e.playerId)) return false;
    }

    // Filter by action type
    if (filterMode === FilterMode.ALL) return true;
    if (filterMode === FilterMode.SHOOTING) return e.action_type === ActionType.SHOT;
    if (filterMode === FilterMode.REBOUNDS) return e.action_type === ActionType.REBOUND;
    if (filterMode === FilterMode.FOULS) return e.action_type === ActionType.FOUL;
    if (filterMode === FilterMode.TURNOVERS) return e.action_type === ActionType.TURNOVER;
    if (filterMode === FilterMode.BLOCKS) return e.action_type === ActionType.BLOCK;
    if (filterMode === FilterMode.STEALS) return e.action_type === ActionType.STEAL;
    return true;
  });

  const markers = showMarkers
    ? filteredEvents
        ?.filter((evt: MatchEvent) => {
          // Filter out events without valid court coordinates (e.g., quick score buttons with -999)
          return (
            evt.coordinates &&
            evt.coordinates.x >= 0 &&
            evt.coordinates.y >= 0 &&
            evt.coordinates.x <= 1 &&
            evt.coordinates.y <= 1
          );
        })
        .map((evt: MatchEvent) => {
          // Get color from centralized ACTION_CONFIG
          const markerColor = getActionColor(evt.action_type, evt.specification, evt.points);

          // Convert normalized coordinates (0-1) to portrait SVG coordinates (0-615.75 x 0-1146.75)
          const svgX = evt.coordinates!.x * 615.75;
          const svgY = evt.coordinates!.y * 1146.75;

          return {
            id: evt.id,
            svgX,
            svgY,
            color: markerColor,
          };
        }) || []
    : [];
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
        markers={markers}
      />
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
