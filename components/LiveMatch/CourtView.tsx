/**
 * CourtView Component
 *
 * Displays the basketball court with action markers
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  EventType,
  MatchEvent,
  FilterMode,
  TeamId,
} from "../../constants/liveMatchConstants";
import { SLATE_COLORS } from "../../src/theme";
import BasketballCourtSVG from "../BasketballCourtSVG";

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
    if (filterMode === FilterMode.SHOOTING)
      return e.type.includes("POINT") || e.type.includes("MISS");
    if (filterMode === FilterMode.REBOUNDS)
      return ["REBOUND_OFF", "REBOUND_DEF"].includes(e.type);
    if (filterMode === FilterMode.FOULS) return e.type === EventType.FOUL;
    if (filterMode === FilterMode.TURNOVERS) return e.type === EventType.TURNOVER;
    if (filterMode === FilterMode.BLOCKS) return e.type === EventType.BLOCK;
    if (filterMode === FilterMode.STEALS) return e.type === EventType.STEAL;
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
          let markerColor = SLATE_COLORS[500];

          // Tirs réussis (vert pour nous, rouge pour adversaire)
          if (evt.type.includes("POINT"))
            markerColor = evt.teamId === TeamId.AWAY ? "#ef4444" : "#22c55e";
          // Tirs ratés (orange pour nous, rouge foncé pour adversaire)
          else if (evt.type.includes("MISS"))
            markerColor = evt.teamId === TeamId.AWAY ? "#ea580c" : "#f97316";
          // Rebonds (bleu)
          else if (
            evt.type === EventType.REBOUND_DEF ||
            evt.type === EventType.REBOUND_OFF
          )
            markerColor = evt.teamId === TeamId.AWAY ? "#3b82f6" : "#60a5fa";
          // Fautes (jaune/orange)
          else if (evt.type === EventType.FOUL)
            markerColor = evt.teamId === TeamId.AWAY ? "#f59e0b" : "#fbbf24";
          // Passes décisives (violet)
          else if (evt.type === EventType.ASSIST)
            markerColor = evt.teamId === TeamId.AWAY ? "#a855f7" : "#c084fc";
          // Interceptions (cyan)
          else if (evt.type === EventType.STEAL)
            markerColor = evt.teamId === TeamId.AWAY ? "#06b6d4" : "#22d3ee";
          // Contres (indigo)
          else if (evt.type === EventType.BLOCK)
            markerColor = evt.teamId === TeamId.AWAY ? "#6366f1" : "#818cf8";
          // Pertes de balle (rose)
          else if (evt.type === EventType.TURNOVER)
            markerColor = evt.teamId === TeamId.AWAY ? "#ec4899" : "#f472b6";

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

  const defaultLogoUri = require("../icons/coachassistant-logo-margin.png");
  const logoUri = clubLogoUrl || defaultLogoUri;

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
        logoUri={logoUri}
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
