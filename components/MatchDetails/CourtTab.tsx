/**
 * CourtTab Component
 *
 * Displays the court view with action markers and filters.
 * Extracted from MatchDetailsScreen for better modularity.
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import BasketballCourtSVG from "../BasketballCourtSVG";
import { ActionType, ACTION_FILTER } from "../../constants";
import {
  PlayerStats,
  ActionFilterType,
} from "../../constants/matchDetailsConstants";
import { getActionColor, ACTION_CONFIG } from "../../src/models/ActionTypes";
import {
  COURT_SVG_WIDTH_PORTRAIT,
  COURT_SVG_HEIGHT_PORTRAIT,
  COURT_DISPLAY_WIDTH_PORTRAIT_MAX,
  COURT_DISPLAY_HEIGHT_PORTRAIT_MAX,
  COURT_DISPLAY_WIDTH_LANDSCAPE_MAX,
  COURT_DISPLAY_HEIGHT_LANDSCAPE_MAX,
} from "../../constants";
import PlayerAvatar from "../PlayerAvatar";

interface CourtTabProps {
  stats: PlayerStats[];
  actions: any[];
  selectedActionTypes: ActionFilterType[];
  setSelectedActionTypes: (types: ActionFilterType[]) => void;
  selectedSpecifications: string[];
  setSelectedSpecifications: (specs: string[]) => void;
  selectedPlayers: number[];
  setSelectedPlayers: (players: number[]) => void;
  courtBackgroundColor: string;
  courtLineColor: string;
  logoUri: any;
  activeTeamFilter: "MyTeam" | "Opponent";
  totalPeriods: number;
}

export default function CourtTab({
  stats,
  actions,
  selectedActionTypes,
  setSelectedActionTypes,
  selectedSpecifications,
  setSelectedSpecifications,
  selectedPlayers,
  setSelectedPlayers,
  courtBackgroundColor,
  courtLineColor,
  logoUri,
  activeTeamFilter,
  totalPeriods,
}: CourtTabProps) {
  const { colors, isDark } = useTheme();
  const windowDimensions = useWindowDimensions();
  const [selectedPeriods, setSelectedPeriods] = React.useState<number[]>([]);

  // Find all unique periods in actions (including OT)
  const availablePeriods = React.useMemo(() => {
    const periods = new Set<number>();
    actions?.forEach((action: any) => {
      if (action.period_number) {
        periods.add(action.period_number);
      }
    });
    const sortedPeriods = Array.from(periods).sort((a, b) => a - b);
    return sortedPeriods;
  }, [actions]);

  // Theme colors
  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const borderColor = colors.border;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  // Determine orientation based on screen dimensions
  const isPortrait = windowDimensions.height > windowDimensions.width;

  // Use fixed dimensions from constants
  const courtWidth = isPortrait
    ? COURT_DISPLAY_WIDTH_PORTRAIT_MAX
    : COURT_DISPLAY_WIDTH_LANDSCAPE_MAX;
  const courtHeight = isPortrait
    ? COURT_DISPLAY_HEIGHT_PORTRAIT_MAX
    : COURT_DISPLAY_HEIGHT_LANDSCAPE_MAX;

  // Determine which specifications to show based on selected action type
  // Only show specifications if exactly one action type is selected
  const getAvailableSpecifications = () => {
    if (selectedActionTypes.length !== 1) return [];

    const selectedType = selectedActionTypes[0];

    // Map ACTION_FILTER to ActionType
    let actionType: string | null = null;
    if (selectedType === ACTION_FILTER.SHOOTING) actionType = ActionType.SHOT;
    else if (selectedType === ACTION_FILTER.REBOUNDS)
      actionType = ActionType.REBOUND;
    else if (selectedType === ACTION_FILTER.FOULS) actionType = ActionType.FOUL;

    if (!actionType) return [];

    const config = ACTION_CONFIG[actionType];
    return config?.specifications || [];
  };

  const availableSpecifications = getAvailableSpecifications();

  // Reset specifications when action type filter changes
  useEffect(() => {
    // Clear specifications if no action types selected or multiple selected
    if (selectedActionTypes.length !== 1) {
      setSelectedSpecifications([]);
    }
  }, [selectedActionTypes, setSelectedSpecifications]);

  // Generate period labels (MT1, MT2 for 2 periods; QT1, QT2, QT3, QT4 for 4 periods; OT1, OT2, etc. for overtime)
  const getPeriodLabel = (periodNumber: number) => {
    // Overtime periods (beyond regular periods)
    if (periodNumber > totalPeriods) {
      const otNumber = periodNumber - totalPeriods;
      return `OT${otNumber}`;
    }

    // Regular periods
    if (totalPeriods === 2) {
      return `MT${periodNumber}`;
    } else if (totalPeriods === 4) {
      return `QT${periodNumber}`;
    } else {
      return `P${periodNumber}`;
    }
  };

  return (
    <View style={styles.courtViewContainer}>
      {/* Period Filters */}
      <View style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}>
        <Text style={[styles.courtFilterLabel, { color: textTertiary }]}>
          PÉRIODE
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.courtFilterScroll}
        >
          <View style={styles.courtFilterButtonsRow}>
            <TouchableOpacity
              onPress={() => setSelectedPeriods([])}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor:
                    selectedPeriods.length === 0
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                  borderColor:
                    selectedPeriods.length === 0 ? colors.primary : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color:
                      selectedPeriods.length === 0
                        ? colors.text.primary
                        : textPrimary,
                  },
                ]}
              >
                Tout
              </Text>
            </TouchableOpacity>

            {availablePeriods.map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => {
                  if (selectedPeriods.includes(period)) {
                    setSelectedPeriods(
                      selectedPeriods.filter((p) => p !== period)
                    );
                  } else {
                    setSelectedPeriods([...selectedPeriods, period]);
                  }
                }}
                style={[
                  styles.courtFilterChip,
                  {
                    backgroundColor: selectedPeriods.includes(period)
                      ? colors.primary
                      : isDark
                      ? colors.surfaceVariant
                      : colors.surfaceVariant,
                    borderColor: selectedPeriods.includes(period)
                      ? colors.primary
                      : borderColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.courtFilterChipText,
                    {
                      color: selectedPeriods.includes(period)
                        ? colors.text.primary
                        : textPrimary,
                    },
                  ]}
                >
                  {getPeriodLabel(period)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Action Type Filters */}
      <View style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}>
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.SHOOTING
                    )
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
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.SHOOTING
                  )
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.REBOUNDS
                    )
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
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.REBOUNDS
                  )
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.ASSISTS
                    )
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
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.ASSISTS
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.ASSISTS
                  )
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.STEALS
                    )
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
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.STEALS
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.STEALS
                  )
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.BLOCKS
                    )
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
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.BLOCKS
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.BLOCKS
                  )
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
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.TURNOVERS
                    )
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
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.TURNOVERS
                  )
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
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.FOULS
                  )
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

            <TouchableOpacity
              onPress={() => {
                if (selectedActionTypes.includes(ACTION_FILTER.FOUL_DRAWN)) {
                  setSelectedActionTypes(
                    selectedActionTypes.filter(
                      (t) => t !== ACTION_FILTER.FOUL_DRAWN
                    )
                  );
                } else {
                  setSelectedActionTypes([
                    ...selectedActionTypes,
                    ACTION_FILTER.FOUL_DRAWN,
                  ]);
                }
              }}
              style={[
                styles.courtFilterChip,
                {
                  backgroundColor: selectedActionTypes.includes(
                    ACTION_FILTER.FOUL_DRAWN
                  )
                    ? colors.primary
                    : isDark
                    ? colors.surfaceVariant
                    : colors.surfaceVariant,
                  borderColor: selectedActionTypes.includes(
                    ACTION_FILTER.FOUL_DRAWN
                  )
                    ? colors.primary
                    : borderColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.courtFilterChipText,
                  {
                    color: selectedActionTypes.includes(
                      ACTION_FILTER.FOUL_DRAWN
                    )
                      ? colors.text.primary
                      : textPrimary,
                  },
                ]}
              >
                Fautes provoquées
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Specification Filters - Only show if one action type is selected and it has specifications */}
      {availableSpecifications.length > 0 && (
        <View
          style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}
        >
          <Text style={[styles.courtFilterLabel, { color: textTertiary }]}>
            SPÉCIFICATIONS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.courtFilterScroll}
          >
            <View style={styles.courtFilterButtonsRow}>
              {availableSpecifications.map((spec) => {
                const isSelected = selectedSpecifications.includes(spec.id);
                return (
                  <TouchableOpacity
                    key={spec.id}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedSpecifications(
                          selectedSpecifications.filter((s) => s !== spec.id)
                        );
                      } else {
                        setSelectedSpecifications([
                          ...selectedSpecifications,
                          spec.id,
                        ]);
                      }
                    }}
                    style={[
                      styles.courtFilterChip,
                      {
                        backgroundColor: isSelected
                          ? `${spec.color}20`
                          : colors.surfaceVariant,
                        borderColor: isSelected ? spec.color : borderColor,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.courtFilterChipText,
                        {
                          color: isSelected ? spec.color : textPrimary,
                        },
                      ]}
                    >
                      {spec.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Player Filters */}
      <View style={[styles.courtFiltersSection, { backgroundColor: bgColor }]}>
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
              const isSelected = selectedPlayers.includes(player.playerNumber);
              return (
                <TouchableOpacity
                  key={player.playerNumber}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedPlayers(
                        selectedPlayers.filter((n) => n !== player.playerNumber)
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
                      borderColor: isSelected ? colors.primary : borderColor,
                    },
                  ]}
                >
                  <PlayerAvatar
                    playerName={player.name}
                    playerNumber={player.playerNumber}
                    photoUrl={player.photoUrl}
                    size={24}
                    borderColor={isSelected ? colors.primary : borderColor}
                    backgroundColor={isSelected ? colors.text.primary : bgColor}
                    textColor={isSelected ? colors.primary : textSecondary}
                    borderWidth={0}
                  />
                  <Text
                    style={[
                      styles.courtPlayerName,
                      {
                        color: isSelected ? colors.text.primary : textPrimary,
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
              {
                backgroundColor: surfaceColor,
                width: "100%", // Court width + padding
                height: courtHeight + 32, // Court height + padding
                alignSelf: "center",
              },
            ]}
          >
            <BasketballCourtSVG
              key={`court-${
                isPortrait ? "portrait" : "landscape"
              }-${courtWidth}-${courtHeight}`}
              width={courtWidth}
              height={courtHeight}
              backgroundColor={courtBackgroundColor}
              lineColor={courtLineColor}
              logoUri={logoUri}
              markers={
                actions
                  ?.filter((action: any) => {
                    // Filter by team using activeTeamFilter (already selected at top)
                    if (action.team !== activeTeamFilter) return false;

                    // Filter by period
                    if (selectedPeriods.length > 0) {
                      const periodNumber = action.period_number;
                      if (!selectedPeriods.includes(periodNumber)) {
                        return false;
                      }
                    }

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
                      if (
                        selectedActionTypes.includes(
                          ACTION_FILTER.FOUL_DRAWN
                        ) &&
                        actionType === ActionType.FOUL_DRAWN.toUpperCase()
                      )
                        matchesFilter = true;

                      if (!matchesFilter) return false;
                    }

                    // Filter by specification (e.g., offensive/defensive for rebounds)
                    if (selectedSpecifications.length > 0) {
                      const specification = action.specification || "";
                      if (!selectedSpecifications.includes(specification)) {
                        return false;
                      }
                    }

                    // Filter by player
                    if (selectedPlayers.length > 0) {
                      const playerNum = action.player_number || action.player;
                      if (!selectedPlayers.includes(playerNum)) return false;
                    }

                    return true;
                  })
                  .filter((action: any) => action.semanticPosition) // Only actions with position
                  .map((action: any, index: number) => {
                    // Convert normalized coordinates to SVG coordinates
                    const svgX =
                      action.semanticPosition.xNormalized *
                      COURT_SVG_WIDTH_PORTRAIT;
                    const svgY =
                      action.semanticPosition.yNormalized *
                      COURT_SVG_HEIGHT_PORTRAIT;

                    // Get marker color from action config
                    const actionType = action.action_type || action.type || "";
                    const specification = action.specification || "";
                    const points = action.points;

                    const markerColor = getActionColor(
                      actionType,
                      specification,
                      points
                    );

                    return {
                      id: `${action.team}-${
                        action.player || action.player_number
                      }-${action.timestamp || index}-${index}`,
                      svgX,
                      svgY,
                      color: markerColor,
                      actionType: actionType,
                      specification: specification,
                      playerNumber: action.player_number || action.player,
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
    marginBottom: 0,
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
