/**
 * CourtTab Component
 *
 * Displays the court view with action markers and filters.
 * Extracted from MatchDetailsScreen for better modularity.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { ActionType, ACTION_FILTER } from "../../constants";
import { PlayerStats, ActionFilterType } from "../../constants/matchDetailsConstants";
import { getActionColor } from "../../src/models/ActionTypes";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
} from "../../constants";

interface CourtTabProps {
  stats: PlayerStats[];
  actions: any[];
  selectedActionTypes: ActionFilterType[];
  setSelectedActionTypes: (types: ActionFilterType[]) => void;
  selectedPlayers: number[];
  setSelectedPlayers: (players: number[]) => void;
  courtBackgroundColor: string;
  courtLineColor: string;
  logoUri: any;
  activeTeamFilter: "MyTeam" | "Opponent";
}

export default function CourtTab({
  stats,
  actions,
  selectedActionTypes,
  setSelectedActionTypes,
  selectedPlayers,
  setSelectedPlayers,
  courtBackgroundColor,
  courtLineColor,
  logoUri,
  activeTeamFilter,
}: CourtTabProps) {
  const { colors, isDark } = useTheme();

  // Theme colors
  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const borderColor = colors.border;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  return (
    <View style={styles.courtViewContainer}>
      {/* Action Type Filters */}
      <View
        style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}
      >
        <Text style={[styles.courtFilterLabel, { color: textTertiary }]}>
          TYPE D'ACTION
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.courtFilterScroll}
        >
          <View style={styles.courtFilterButtonsRow}>
            <TouchableOpacity
              onPress={() => setSelectedActionTypes([])}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    selectedActionTypes.length === 0
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    selectedActionTypes.length === 0
                      ? colors.primary
                      : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      selectedActionTypes.length === 0
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Tout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.SHOOTING)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.SHOOTING)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.SHOOTING,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.SHOOTING
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.SHOOTING)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.SHOOTING)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Tirs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.REBOUNDS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.REBOUNDS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.REBOUNDS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.REBOUNDS
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.REBOUNDS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.REBOUNDS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Rebonds
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.ASSISTS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.ASSISTS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.ASSISTS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(ACTION_FILTER.ASSISTS)
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.ASSISTS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.ASSISTS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Passes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.STEALS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.STEALS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.STEALS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(ACTION_FILTER.STEALS)
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.STEALS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.STEALS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Interceptions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.BLOCKS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.BLOCKS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.BLOCKS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(ACTION_FILTER.BLOCKS)
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.BLOCKS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.BLOCKS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Contres
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.TURNOVERS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.TURNOVERS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.TURNOVERS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.TURNOVERS
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.TURNOVERS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.TURNOVERS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Pertes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.FOULS)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter((t) => t !== ACTION_FILTER.FOULS)
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.FOULS,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(ACTION_FILTER.FOULS)
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(ACTION_FILTER.FOULS)
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(ACTION_FILTER.FOULS)
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Fautes
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Player Filters */}
      <View
        style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}
      >
        <Text style={[styles.courtFilterLabel, { color: textTertiary }]}>
          JOUEURS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.courtFilterScroll}
        >
          <View style={styles.courtPlayerButtonsRow}>
            {stats.map((player) => {
              const isSelected = selectedPlayers.includes(
                player.playerNumber
              );
              return (
                <TouchableOpacity
                  key={player.playerNumber}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedPlayers(
                        selectedPlayers.filter(
                          (n) => n !== player.playerNumber
                        )
                      );
                    } else {
                      setSelectedPlayers([
                        ...selectedPlayers,
                        player.playerNumber,
                      ]);
                    }
                  }}
                  style={[
                    styles.courtPlayerChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                        ? colors.surfaceVariant
                        : colors.surfaceVariant,
                      borderColor: isSelected
                        ? colors.primary
                        : borderColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.courtPlayerBadge,
                      {
                        backgroundColor: isSelected
                          ? colors.text.primary
                          : bgColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.courtPlayerBadgeText,
                        {
                          color: isSelected
                            ? colors.primary
                            : textSecondary,
                        },
                      ]}
                    >
                      {player.playerNumber}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.courtPlayerName,
                      {
                        color: isSelected
                          ? colors.text.primary
                          : textPrimary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {stats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: textTertiary }]}>
            Aucune statistique disponible
          </Text>
        </View>
      ) : (
        <>
          {/* Basketball Court with Shot Chart */}
          <View
            style={[
              styles.courtContainer,
              { backgroundColor: surfaceColor },
            ]}
          >
            <BasketballCourtSVG
              width={350}
              height={520}
              backgroundColor={courtBackgroundColor}
              lineColor={courtLineColor}
              logoUri={logoUri}
              markers={
                actions
                  ?.filter((action: any) => {
                    // Filter by team using activeTeamFilter (already selected at top)
                    if (action.team !== activeTeamFilter) return false;

                    // Filter by action type
                    if (selectedActionTypes.length > 0) {
                      const actionType = (
                        action.action_type ||
                        action.type ||
                        ""
                      ).toUpperCase();

                      let matchesFilter = false;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.SHOOTING) &&
                        actionType === ActionType.SHOT.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.REBOUNDS) &&
                        actionType === ActionType.REBOUND.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.ASSISTS) &&
                        actionType === ActionType.ASSIST.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.STEALS) &&
                        actionType === ActionType.STEAL.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.BLOCKS) &&
                        actionType === ActionType.BLOCK.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.TURNOVERS) &&
                        actionType === ActionType.TURNOVER.toUpperCase()
                      )
                        matchesFilter = true;
                      if (
                        selectedActionTypes.includes(ACTION_FILTER.FOULS) &&
                        actionType === ActionType.FOUL.toUpperCase()
                      )
                        matchesFilter = true;

                      if (!matchesFilter) return false;
                    }

                    // Filter by player
                    if (selectedPlayers.length > 0) {
                      const playerNum =
                        action.player_number || action.player;
                      if (!selectedPlayers.includes(playerNum))
                        return false;
                    }

                    return true;
                  })
                  .filter((action: any) => action.semanticPosition) // Only actions with position
                  .map((action: any, index: number) => {
                    // Convert normalized coordinates to SVG coordinates
                    const svgX =
                      action.semanticPosition.xNormalized * COURT_SVG_WIDTH_PORTRAIT;
                    const svgY =
                      action.semanticPosition.yNormalized * COURT_SVG_HEIGHT_PORTRAIT;

                    // Get marker color from action config
                    const actionType = action.action_type || action.type || "";
                    const specification = action.specification || "";
                    const points = action.points;

                    const markerColor = getActionColor(actionType, specification, points);

                    return {
                      id: `${action.team}-${
                        action.player || action.player_number
                      }-${action.timestamp || index}-${index}`,
                      svgX,
                      svgY,
                      color: markerColor,
                    };
                  }) || []
              }
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Court View
  courtViewContainer: {
    marginBottom: 80,
  },
  courtContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 16,
    height: 700,
  },
  shotStatsSummary: {
    marginTop: 0,
    padding: 0,
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
  },
  shotStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  shotStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  shotStatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  shotStatLabel: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Court Filters
  courtFiltersSection: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  courtFilterLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  courtFilterScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  courtFilterButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  courtFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  courtFilterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  courtPlayerButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  courtPlayerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
  },
  courtPlayerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  courtPlayerBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  courtPlayerName: {
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 80,
  },

  // Empty State
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
  },
});
