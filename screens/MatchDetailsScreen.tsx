/**
 * MatchDetailsScreen
 *
 * Displays detailed match statistics and visualizations.
 * Features:
 * - Court view with shot visualization (heatmap)
 * - Player statistics table (sortable)
 * - Filter by team, player, action type, and period
 * - Switch between court and players tabs
 * All tab changes and filters are logged for debugging.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  BackHandler,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ActionData } from "../components/ActionSystem";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import MatchFilters from "../components/MatchFilters";
import { logInfo, logError, logWarn } from "../utils/logger";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
  FoulSpecification,
} from "../src/models/ActionTypes";
import { ACTION_DEFINITIONS } from "../src/config/actionConfig";
import { useTheme } from "../src/contexts/ThemeContext";
import { CommonStyles } from "../src/theme";

interface MatchDetailsRouteParams {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  teamMode: "A" | "B" | "BOTH";
  players: Array<{
    id: number;
    num: number;
    name: string;
    team: "A" | "B";
    isSubstitute: boolean;
  }>;
}

type SortOption = "points" | "name" | "shots" | "rebounds" | "assists" | "steals" | "blocks" | "turnovers";

// Sort options configuration for player stats
const SORT_OPTIONS: Array<{ key: SortOption; label: string }> = [
  { key: "points", label: "Points" },
  { key: "shots", label: "Tirs" },
  { key: "rebounds", label: "Rebonds" },
  { key: "assists", label: "Passes" },
  { key: "steals", label: "Interceptions" },
  { key: "blocks", label: "Contres" },
  { key: "turnovers", label: "Balles perdues" },
  { key: "name", label: "Nom" },
];

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as MatchDetailsRouteParams;
  const { colors } = useTheme();

  const {
    teamA,
    teamB,
    scoreA,
    scoreB,
    actions,
    matchFormat,
    teamMode,
    players,
  } = params;

  const [sortBy, setSortBy] = useState<SortOption>("points");
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | "BOTH">(teamMode);

  // Tab state
  const [activeTab, setActiveTab] = useState<"court" | "players">("court");

  // Court filters (using same format as FilterBottomSheet)
  const [courtFilterTeams, setCourtFilterTeams] = useState<("A" | "B")[]>(
    teamMode === "BOTH" ? ["A", "B"] : teamMode === "A" ? ["A"] : ["B"]
  );
  const [courtFilterPlayers, setCourtFilterPlayers] = useState<string[]>([]); // Player identifiers "team-num" (e.g., "A-5", "B-7")
  const [courtFilterActionType, setCourtFilterActionType] = useState<string[]>([]); // ["shot", "rebound", "foul"]
  const [courtFilterPeriod, setCourtFilterPeriod] = useState<number[]>([]); // [1, 2, 3, 4] or [1, 2]

  /**
   * Handle hardware back button
   */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [navigation]);

  /**
   * Log screen mount when user arrives on the view
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '📱 Screen mounted - User arrived on match details', {
      teamA,
      teamB,
      scoreA,
      scoreB,
      matchFormat,
      teamMode,
      playersCount: players.length,
      actionsCount: actions.length,
      activeTab
    });
  }, []);

  /**
   * Log tab changes
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '📑 Tab changed', {
      activeTab,
      previousTab: activeTab === "court" ? "players" : "court"
    });
  }, [activeTab]);

  /**
   * Log court filter changes - Team filter
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔍 Court team filter changed', {
      courtFilterTeams,
      selectedTeams: courtFilterTeams.join(', ')
    });
  }, [courtFilterTeams]);

  /**
   * Log court filter changes - Players filter
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔍 Court players filter changed', {
      selectedPlayers: courtFilterPlayers,
      selectedPlayersCount: courtFilterPlayers.length
    });
  }, [courtFilterPlayers]);

  /**
   * Log court filter changes - Action type filter
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔍 Court action type filter changed', {
      selectedActionTypes: courtFilterActionType,
      filteringShots: courtFilterActionType.includes(ActionType.SHOT),
      filteringRebounds: courtFilterActionType.includes(ActionType.REBOUND),
      filteringFouls: courtFilterActionType.includes(ActionType.FOUL)
    });
  }, [courtFilterActionType]);

  /**
   * Log court filter changes - Period filter
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔍 Court period filter changed', {
      selectedPeriods: courtFilterPeriod,
      selectedPeriodsCount: courtFilterPeriod.length,
      matchFormat
    });
  }, [courtFilterPeriod]);

  /**
   * Log player stats sort option changes
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔀 Player stats sort option changed', {
      sortBy
    });
  }, [sortBy]);

  /**
   * Log player stats team filter changes
   */
  useEffect(() => {
    logInfo('MatchDetailsScreen', '🔍 Player stats team filter changed', {
      selectedTeam,
      filteringBothTeams: selectedTeam === "BOTH"
    });
  }, [selectedTeam]);


  // Calculate individual player statistics
  const calculatePlayerStats = (playerNum: number, playerTeam: "A" | "B") => {
    const playerActions = actions.filter(
      (action) => action.player === playerNum && action.team === playerTeam
    );

    // Shots - Include ALL shots
    const shots = playerActions.filter((action) => action.type === ActionType.SHOT);
    const madeShots = shots.filter((action) => action.specification === ShotSpecification.MADE);
    const missedShots = shots.filter((action) => action.specification === ShotSpecification.MISSED);

    // Points by type - Count by point value
    const onePtShots = shots.filter((a) => a.points === 1);
    const twoPtShots = shots.filter((a) => a.points === 2);
    const threePtShots = shots.filter((a) => a.points === 3);

    const onePtMade = onePtShots.filter((a) => a.specification === ShotSpecification.MADE).length;
    const twoPtMade = twoPtShots.filter((a) => a.specification === ShotSpecification.MADE).length;
    const threePtMade = threePtShots.filter((a) => a.specification === ShotSpecification.MADE).length;

    const onePtTotal = onePtShots.length;
    const twoPtTotal = twoPtShots.length;
    const threePtTotal = threePtShots.length;

    // Total points
    const totalPoints =
      onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((action) => action.type === ActionType.REBOUND);
    const offensiveRebounds = rebounds.filter(
      (action) => action.specification === ReboundSpecification.OFFENSIVE
    ).length;
    const defensiveRebounds = rebounds.filter(
      (action) => action.specification === ReboundSpecification.DEFENSIVE
    ).length;

    // Fouls
    const fouls = playerActions.filter((action) => action.type === ActionType.FOUL);
    const personalFouls = fouls.filter(
      (action) => action.specification === FoulSpecification.PERSONAL
    ).length;
    const technicalFouls = fouls.filter(
      (action) => action.specification === FoulSpecification.TECHNICAL
    ).length;

    // Other actions
    const assists = playerActions.filter((action) => action.type === ActionType.ASSIST).length;
    const steals = playerActions.filter((action) => action.type === ActionType.STEAL).length;
    const blocks = playerActions.filter((action) => action.type === ActionType.BLOCK).length;
    const turnovers = playerActions.filter((action) => action.type === ActionType.TURNOVER).length;

    // Percentages
    const shotPercentage =
      shots.length > 0 ? Math.round((madeShots.length / shots.length) * 100) : 0;
    const onePtPercentage =
      onePtTotal > 0 ? Math.round((onePtMade / onePtTotal) * 100) : 0;
    const twoPtPercentage =
      twoPtTotal > 0 ? Math.round((twoPtMade / twoPtTotal) * 100) : 0;
    const threePtPercentage =
      threePtTotal > 0 ? Math.round((threePtMade / threePtTotal) * 100) : 0;

    return {
      totalPoints,
      shots: madeShots.length + missedShots.length,
      madeShots: madeShots.length,
      shotPercentage,
      onePtMade,
      onePtTotal,
      onePtPercentage,
      twoPtMade,
      twoPtTotal,
      twoPtPercentage,
      threePtMade,
      threePtTotal,
      threePtPercentage,
      rebounds: rebounds.length,
      offensiveRebounds,
      defensiveRebounds,
      fouls: fouls.length,
      personalFouls,
      technicalFouls,
      assists,
      steals,
      blocks,
      turnovers,
    };
  };

  // Get players with stats
  const playersWithStats = players.map((player) => ({
    ...player,
    stats: calculatePlayerStats(player.num, player.team),
  }));

  // Filter by team
  const filteredPlayers = playersWithStats.filter((player) => {
    if (selectedTeam === "BOTH") return true;
    return player.team === selectedTeam;
  });

  // Sort players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case "points":
        return b.stats.totalPoints - a.stats.totalPoints;
      case "name":
        return a.name.localeCompare(b.name);
      case "shots":
        return b.stats.shots - a.stats.shots;
      case "rebounds":
        return b.stats.rebounds - a.stats.rebounds;
      case "assists":
        return b.stats.assists - a.stats.assists;
      case "steals":
        return b.stats.steals - a.stats.steals;
      case "blocks":
        return b.stats.blocks - a.stats.blocks;
      case "turnovers":
        return b.stats.turnovers - a.stats.turnovers;
      default:
        return 0;
    }
  });

  // Calculate period for each action
  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;

  // Filter actions for court visualization
  const filteredCourtActions = useMemo(() => {
    return actions.filter((action) => {
      // Team filter
      if (courtFilterTeams.length > 0 && !courtFilterTeams.includes(action.team)) {
        return false;
      }

      // Player filter - Check both team and player number
      if (courtFilterPlayers.length > 0) {
        const playerIdentifier = `${action.team}-${action.player}`;
        if (!courtFilterPlayers.includes(playerIdentifier)) {
          return false;
        }
      }

      // Action type filter
      if (courtFilterActionType.length > 0 && !courtFilterActionType.includes(action.type)) {
        return false;
      }

      // Period filter - Use the period_number from the action
      if (courtFilterPeriod.length > 0) {
        if (!courtFilterPeriod.includes(action.period_number)) {
          return false;
        }
      }

      return true;
    });
  }, [actions, courtFilterTeams, courtFilterPlayers, courtFilterActionType, courtFilterPeriod]);

  // Helper to get marker color based on action
  const getMarkerColor = (
    actionType: string,
    specification?: string
  ): string => {
    if (actionType === ActionType.SHOT) {
      return specification === ShotSpecification.MADE ? "#4CAF50" : "#F44336";
    }
    if (actionType === ActionType.REBOUND) {
      return specification === ReboundSpecification.OFFENSIVE ? "#FF9800" : "#2196F3";
    }
    if (actionType === ActionType.FOUL) {
      if (specification === FoulSpecification.TECHNICAL) return "#9C27B0";
      if (specification === FoulSpecification.DISQUALIFICATION) return "#000000";
      if (specification === FoulSpecification.PENALITY) return "#FF6F00";
      return "#E74C3C";
    }
    if (actionType === ActionType.ASSIST) return "#00BCD4";
    if (actionType === ActionType.STEAL) return "#8BC34A";
    if (actionType === ActionType.BLOCK) return "#FF5722";
    if (actionType === ActionType.TURNOVER) return "#795548";
    return "#757575";
  };

  // Convert filtered actions to markers
  const courtMarkers = filteredCourtActions.map((action, index) => ({
    id: `marker-${index}`,
    svgX: action.semanticPosition.xNormalized * 615.75,
    svgY: action.semanticPosition.yNormalized * 1146.749971,
    color: getMarkerColor(action.type, action.specification),
    team: action.team,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header: Back button, title, and empty right side for alignment */}
      <View style={[CommonStyles.header, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
          <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>Retour</Text>
        </TouchableOpacity>
        <Text style={[CommonStyles.headerTitle, { color: colors.text.primary }]}>Détails du match</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.mainScroll}>
        {/* Score Summary: Display match score for both teams */}
        <View style={styles.scoreSummary}>
          <View style={styles.teamScoreContainer}>
            <Text style={styles.teamNameSmall}>{teamA}</Text>
            <Text style={styles.scoreText}>{scoreA}</Text>
          </View>
          <Text style={styles.scoreSeparator}>-</Text>
          <View style={styles.teamScoreContainer}>
            <Text style={styles.teamNameSmall}>{teamB}</Text>
            <Text style={styles.scoreText}>{scoreB}</Text>
          </View>
        </View>

        {/* Tabs: Switch between Court visualization and Player statistics */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "court" && styles.tabActive]}
            onPress={() => setActiveTab("court")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "court" && styles.tabTextActive,
              ]}
            >
              🏀 Terrain
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "players" && styles.tabActive]}
            onPress={() => setActiveTab("players")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "players" && styles.tabTextActive,
              ]}
            >
              👥 Joueurs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Court Tab Content: Shot visualization with filters and live stats */}
        {activeTab === "court" && (
          <View style={styles.courtSection}>
          <Text style={styles.sectionTitle}>Visualisation du terrain</Text>

          {/* Court Filters using MatchFilters component */}
          <View style={styles.courtFilters}>
            <MatchFilters
              teamA={teamA}
              teamB={teamB}
              teamMode={teamMode}
              matchFormat={matchFormat}
              players={players}
              selectedTeams={courtFilterTeams}
              selectedPlayers={courtFilterPlayers}
              selectedActionTypes={courtFilterActionType}
              selectedPeriods={courtFilterPeriod}
              onTeamsChange={setCourtFilterTeams}
              onPlayersChange={setCourtFilterPlayers}
              onActionTypesChange={setCourtFilterActionType}
              onPeriodsChange={setCourtFilterPeriod}
            />
          </View>

          {/* Court and Stats Container: 3-column layout with stats on sides and court in center */}
          <View style={styles.courtAndStatsContainer}>
            {/* Left Column - Live Stats: Team A statistics (or single team if managing one) */}
            <View style={styles.liveStats}>
              <Text style={styles.liveStatsTitle}>{teamMode === "BOTH" ? teamA : "Stats"}</Text>

              {/* Shooting Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.SHOT)) && (
                <>
                  <View style={styles.liveStatGroup}>
                    <Text style={styles.liveStatGroupLabel}>🏀 Tirs</Text>
                    <Text style={styles.liveStatGroupValue}>
                      {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        const shots = actionsToUse.filter(a => a.type === ActionType.SHOT);
                        const made = shots.filter(a => a.specification === ShotSpecification.MADE).length;
                        const percentage = shots.length > 0 ? Math.round((made / shots.length) * 100) : 0;
                        return `${made}/${shots.length} (${percentage}%)`;
                      })()}
                    </Text>

                    {/* Detailed breakdown */}
                    <View style={styles.liveStatDetail}>
                      <Text style={styles.liveStatDetailText}>
                        1pt: {(() => {
                          const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                          const onePtShots = actionsToUse.filter(a => a.type === ActionType.SHOT && a.points === 1);
                          const onePtMade = onePtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                          const onePtPercentage = onePtShots.length > 0 ? Math.round((onePtMade / onePtShots.length) * 100) : 0;
                          return `${onePtMade}/${onePtShots.length} (${onePtPercentage}%)`;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        2pts: {(() => {
                          const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                          const twoPtShots = actionsToUse.filter(a => a.type === ActionType.SHOT && a.points === 2);
                          const twoPtMade = twoPtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                          const twoPtPercentage = twoPtShots.length > 0 ? Math.round((twoPtMade / twoPtShots.length) * 100) : 0;
                          return `${twoPtMade}/${twoPtShots.length} (${twoPtPercentage}%)`;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        3pts: {(() => {
                          const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                          const threePtShots = actionsToUse.filter(a => a.type === ActionType.SHOT && a.points === 3);
                          const threePtMade = threePtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                          const threePtPercentage = threePtShots.length > 0 ? Math.round((threePtMade / threePtShots.length) * 100) : 0;
                          return `${threePtMade}/${threePtShots.length} (${threePtPercentage}%)`;
                        })()}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Rebounds Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.REBOUND)) && (
                <View style={styles.liveStatGroup}>
                  <Text style={styles.liveStatGroupLabel}>📥 Rebonds</Text>
                  <Text style={styles.liveStatGroupValue}>
                    {(() => {
                      const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                      return actionsToUse.filter(a => a.type === ActionType.REBOUND).length;
                    })()}
                  </Text>
                  <View style={styles.liveStatDetail}>
                    <Text style={styles.liveStatDetailText}>
                      Off: {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        return actionsToUse.filter(a => a.type === ActionType.REBOUND && a.specification === ReboundSpecification.OFFENSIVE).length;
                      })()}
                    </Text>
                    <Text style={styles.liveStatDetailText}>
                      Def: {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        return actionsToUse.filter(a => a.type === ActionType.REBOUND && a.specification === ReboundSpecification.DEFENSIVE).length;
                      })()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Fouls Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.FOUL)) && (
                <View style={styles.liveStatGroup}>
                  <Text style={styles.liveStatGroupLabel}>⚠️ Fautes</Text>
                  <Text style={styles.liveStatGroupValue}>
                    {(() => {
                      const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                      return actionsToUse.filter(a => a.type === ActionType.FOUL).length;
                    })()}
                  </Text>
                  <View style={styles.liveStatDetail}>
                    <Text style={styles.liveStatDetailText}>
                      Pers: {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        return actionsToUse.filter(a => a.type === ActionType.FOUL && a.specification === FoulSpecification.PERSONAL).length;
                      })()}
                    </Text>
                    <Text style={styles.liveStatDetailText}>
                      Tech: {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        return actionsToUse.filter(a => a.type === ActionType.FOUL && a.specification === FoulSpecification.TECHNICAL).length;
                      })()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Other Actions Stats (Assists, Steals, Blocks, Turnovers) */}
              {ACTION_DEFINITIONS
                .filter(action => ![ActionType.SHOT, ActionType.REBOUND, ActionType.FOUL].includes(action.id as ActionType))
                .filter(action => courtFilterActionType.length === 0 || courtFilterActionType.includes(action.id))
                .map((action, index, array) => (
                  <View key={action.id} style={[styles.liveStatGroup, index === array.length - 1 && styles.liveStatGroupLast]}>
                    <Text style={styles.liveStatGroupLabel}>{action.icon} {action.label}</Text>
                    <Text style={styles.liveStatGroupValue}>
                      {(() => {
                        const actionsToUse = teamMode === "BOTH" ? filteredCourtActions.filter(a => a.team === "A") : filteredCourtActions;
                        return actionsToUse.filter(a => a.type === action.id).length;
                      })()}
                    </Text>
                  </View>
                ))}
            </View>

            {/* Center Column - Court: Basketball court SVG with action markers */}
            <View style={styles.courtContainer}>
              <View style={{ width: 320, height: 595 }}>
                <BasketballCourtSVG
                  width={300}
                  height={558}
                  onCourtPress={() => {}}
                  markers={courtMarkers}
                />
              </View>
            </View>

            {/* Right Column - Team B Stats: Team B statistics (only shown when managing both teams) */}
            {teamMode === "BOTH" ? (
              <View style={styles.liveStats}>
                <Text style={styles.liveStatsTitle}>{teamB}</Text>

                {/* Shooting Stats */}
                {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.SHOT)) && (
                  <>
                    <View style={styles.liveStatGroup}>
                      <Text style={styles.liveStatGroupLabel}>🏀 Tirs</Text>
                      <Text style={styles.liveStatGroupValue}>
                        {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          const shots = actionsTeamB.filter(a => a.type === ActionType.SHOT);
                          const made = shots.filter(a => a.specification === ShotSpecification.MADE).length;
                          const percentage = shots.length > 0 ? Math.round((made / shots.length) * 100) : 0;
                          return `${made}/${shots.length} (${percentage}%)`;
                        })()}
                      </Text>

                      {/* Detailed breakdown */}
                      <View style={styles.liveStatDetail}>
                        <Text style={styles.liveStatDetailText}>
                          1pt: {(() => {
                            const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                            const onePtShots = actionsTeamB.filter(a => a.type === ActionType.SHOT && a.points === 1);
                            const onePtMade = onePtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                            const onePtPercentage = onePtShots.length > 0 ? Math.round((onePtMade / onePtShots.length) * 100) : 0;
                            return `${onePtMade}/${onePtShots.length} (${onePtPercentage}%)`;
                          })()}
                        </Text>
                        <Text style={styles.liveStatDetailText}>
                          2pts: {(() => {
                            const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                            const twoPtShots = actionsTeamB.filter(a => a.type === ActionType.SHOT && a.points === 2);
                            const twoPtMade = twoPtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                            const twoPtPercentage = twoPtShots.length > 0 ? Math.round((twoPtMade / twoPtShots.length) * 100) : 0;
                            return `${twoPtMade}/${twoPtShots.length} (${twoPtPercentage}%)`;
                          })()}
                        </Text>
                        <Text style={styles.liveStatDetailText}>
                          3pts: {(() => {
                            const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                            const threePtShots = actionsTeamB.filter(a => a.type === ActionType.SHOT && a.points === 3);
                            const threePtMade = threePtShots.filter(a => a.specification === ShotSpecification.MADE).length;
                            const threePtPercentage = threePtShots.length > 0 ? Math.round((threePtMade / threePtShots.length) * 100) : 0;
                            return `${threePtMade}/${threePtShots.length} (${threePtPercentage}%)`;
                          })()}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Rebounds Stats */}
                {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.REBOUND)) && (
                  <View style={styles.liveStatGroup}>
                    <Text style={styles.liveStatGroupLabel}>📥 Rebonds</Text>
                    <Text style={styles.liveStatGroupValue}>
                      {(() => {
                        const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                        return actionsTeamB.filter(a => a.type === ActionType.REBOUND).length;
                      })()}
                    </Text>
                    <View style={styles.liveStatDetail}>
                      <Text style={styles.liveStatDetailText}>
                        Off: {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          return actionsTeamB.filter(a => a.type === ActionType.REBOUND && a.specification === ReboundSpecification.OFFENSIVE).length;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        Def: {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          return actionsTeamB.filter(a => a.type === ActionType.REBOUND && a.specification === ReboundSpecification.DEFENSIVE).length;
                        })()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Fouls Stats */}
                {(courtFilterActionType.length === 0 || courtFilterActionType.includes(ActionType.FOUL)) && (
                  <View style={styles.liveStatGroup}>
                    <Text style={styles.liveStatGroupLabel}>⚠️ Fautes</Text>
                    <Text style={styles.liveStatGroupValue}>
                      {(() => {
                        const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                        return actionsTeamB.filter(a => a.type === ActionType.FOUL).length;
                      })()}
                    </Text>
                    <View style={styles.liveStatDetail}>
                      <Text style={styles.liveStatDetailText}>
                        Pers: {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          return actionsTeamB.filter(a => a.type === ActionType.FOUL && a.specification === FoulSpecification.PERSONAL).length;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        Tech: {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          return actionsTeamB.filter(a => a.type === ActionType.FOUL && a.specification === FoulSpecification.TECHNICAL).length;
                        })()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Other Actions Stats (Assists, Steals, Blocks, Turnovers) */}
                {ACTION_DEFINITIONS
                  .filter(action => ![ActionType.SHOT, ActionType.REBOUND, ActionType.FOUL].includes(action.id as ActionType))
                  .filter(action => courtFilterActionType.length === 0 || courtFilterActionType.includes(action.id))
                  .map((action, index, array) => (
                    <View key={action.id} style={[styles.liveStatGroup, index === array.length - 1 && styles.liveStatGroupLast]}>
                      <Text style={styles.liveStatGroupLabel}>{action.icon} {action.label}</Text>
                      <Text style={styles.liveStatGroupValue}>
                        {(() => {
                          const actionsTeamB = filteredCourtActions.filter(a => a.team === "B");
                          return actionsTeamB.filter(a => a.type === action.id).length;
                        })()}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <View style={styles.rightPanel}>
                {/* Empty for now */}
              </View>
            )}
          </View>
          </View>
        )}

        {/* Players Tab Content: Detailed player statistics table */}
        {activeTab === "players" && (
          <View style={styles.playerStatsSection}>
            <Text style={styles.sectionTitle}>Statistiques des joueurs</Text>

            {/* Filters: Team selection and sort options */}
            <View style={styles.filtersContainer}>
            {/* Team filter: Filter players by team (only shown when managing both teams) */}
        {teamMode === "BOTH" && (
          <View style={styles.teamFilter}>
            <TouchableOpacity
              style={[
                styles.teamFilterButton,
                selectedTeam === "BOTH" && styles.teamFilterButtonActive,
              ]}
              onPress={() => setSelectedTeam("BOTH")}
            >
              <Text
                style={[
                  styles.teamFilterText,
                  selectedTeam === "BOTH" && styles.teamFilterTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamFilterButton,
                selectedTeam === "A" && styles.teamFilterButtonActive,
              ]}
              onPress={() => setSelectedTeam("A")}
            >
              <Text
                style={[
                  styles.teamFilterText,
                  selectedTeam === "A" && styles.teamFilterTextActive,
                ]}
              >
                {teamA}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.teamFilterButton,
                selectedTeam === "B" && styles.teamFilterButtonActive,
              ]}
              onPress={() => setSelectedTeam("B")}
            >
              <Text
                style={[
                  styles.teamFilterText,
                  selectedTeam === "B" && styles.teamFilterTextActive,
                ]}
              >
                {teamB}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sort buttons: Sort players by different stats */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortButtons}
        >
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortButton,
                sortBy === option.key && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy(option.key)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.key && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
          </View>

          {/* Players List: Individual player cards with detailed statistics */}
          <View style={styles.playersList}>
        {sortedPlayers.map((player) => (
          <View key={`${player.team}-${player.id}`} style={styles.playerCard}>
            {/* Player header: Player name, number, and total points */}
            <View style={styles.playerHeader}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerNumber}>#{player.num}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
              </View>
              <Text style={styles.playerPoints}>{player.stats.totalPoints} pts</Text>
            </View>

            {/* Player stats: Detailed breakdown by category */}
            <View style={styles.playerStats}>
              {/* Shooting stats: Total shots and breakdown by point value (1pt, 2pts, 3pts) */}
              {player.stats.shots > 0 && (
                <View style={styles.statSection}>
                  <Text style={styles.statSectionTitle}>Tirs</Text>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>
                      {player.stats.madeShots}/{player.stats.shots} ({player.stats.shotPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>1pt</Text>
                    <Text style={styles.statValue}>
                      {player.stats.onePtMade}/{player.stats.onePtTotal} ({player.stats.onePtPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>2pts</Text>
                    <Text style={styles.statValue}>
                      {player.stats.twoPtMade}/{player.stats.twoPtTotal} ({player.stats.twoPtPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>3pts</Text>
                    <Text style={styles.statValue}>
                      {player.stats.threePtMade}/{player.stats.threePtTotal} ({player.stats.threePtPercentage}%)
                    </Text>
                  </View>
                </View>
              )}

              {/* Other stats: Dynamic rendering based on player stats */}
              {(() => {
                const hasOtherStats = player.stats.rebounds > 0 || player.stats.fouls > 0 ||
                  player.stats.assists > 0 || player.stats.steals > 0 ||
                  player.stats.blocks > 0 || player.stats.turnovers > 0;

                if (!hasOtherStats) return null;

                // Map of stat keys to their display config
                const otherStatsConfig = [
                  { key: 'rebounds', label: 'Rebonds', detail: `(Off: ${player.stats.offensiveRebounds} / Def: ${player.stats.defensiveRebounds})` },
                  { key: ActionType.ASSIST, label: ACTION_DEFINITIONS.find(a => a.id === ActionType.ASSIST)?.label || 'Passes', detail: null },
                  { key: ActionType.STEAL, label: ACTION_DEFINITIONS.find(a => a.id === ActionType.STEAL)?.label || 'Interceptions', detail: null },
                  { key: ActionType.BLOCK, label: ACTION_DEFINITIONS.find(a => a.id === ActionType.BLOCK)?.label || 'Contres', detail: null },
                  { key: ActionType.TURNOVER, label: ACTION_DEFINITIONS.find(a => a.id === ActionType.TURNOVER)?.label || 'Balles perdues', detail: null },
                  { key: 'fouls', label: 'Fautes', detail: `(Pers: ${player.stats.personalFouls} / Tech: ${player.stats.technicalFouls})` },
                ];

                return (
                  <View style={styles.statSection}>
                    <Text style={styles.statSectionTitle}>Autres</Text>
                    {otherStatsConfig.map(({ key, label, detail }) => {
                      const value = player.stats[key as keyof typeof player.stats];
                      if (!value || value === 0) return null;

                      return (
                        <View key={`${player.team}-${player.id}-${key}`} style={styles.statRow}>
                          <Text style={styles.statLabel}>{label}</Text>
                          <Text style={styles.statValue}>
                            {value} {detail}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </View>
        ))}

            {/* Empty state: Shown when no players match the current filters */}
            {sortedPlayers.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune statistique disponible</Text>
              </View>
            )}
          </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  backButton: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  scoreSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#4CAF50",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#4CAF50",
  },
  teamScoreContainer: {
    alignItems: "center",
  },
  teamNameSmall: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  scoreSeparator: {
    fontSize: 24,
    color: "#ccc",
    marginHorizontal: 24,
  },
  filtersContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  teamFilter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  teamFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  teamFilterButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  teamFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  teamFilterTextActive: {
    color: "#fff",
  },
  sortButtons: {
    paddingHorizontal: 16,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  sortButtonActive: {
    backgroundColor: "#FF6B35",
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  sortButtonTextActive: {
    color: "#fff",
  },
  playersList: {
    flex: 1,
    padding: 16,
  },
  playerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  playerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  playerPoints: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  playerStats: {
    gap: 12,
  },
  statSection: {
    gap: 6,
  },
  statSectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
  },
  // Court Section Styles
  courtSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  courtFilters: {
    gap: 16,
    marginBottom: 20,
  },
  courtAndStatsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  liveStats: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  courtContainer: {
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    flex: 0,
  },
  rightPanel: {
    flex: 1,
  },
  liveStatsTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  liveStatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  liveStatLabel: {
    fontSize: 10,
    color: "#666",
    flex: 1,
  },
  liveStatValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  liveStatGroup: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  liveStatGroupLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  liveStatGroupLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  liveStatGroupValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 6,
  },
  liveStatDetail: {
    gap: 2,
  },
  liveStatDetailText: {
    fontSize: 9,
    color: "#999",
  },
  // Player Stats Section
  playerStatsSection: {
    backgroundColor: "#fff",
    padding: 16,
  },
});
