import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ActionData } from "../components/ActionSystem";
import BasketballCourtSVG from "../components/BasketballCourtSVG";

interface MatchDetailsRouteParams {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  teamMode: "A" | "B" | "both";
  players: Array<{
    id: number;
    num: number;
    name: string;
    team: "A" | "B";
    isSubstitute: boolean;
  }>;
}

type SortOption = "points" | "name" | "shots" | "rebounds";

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as MatchDetailsRouteParams;

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
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | "both">(teamMode);

  // Tab state
  const [activeTab, setActiveTab] = useState<"court" | "players">("court");

  // Court filters
  const [courtFilterTeam, setCourtFilterTeam] = useState<"A" | "B" | "both">(teamMode);
  const [courtFilterPlayers, setCourtFilterPlayers] = useState<number[]>([]); // Player numbers (num)
  const [courtFilterActionType, setCourtFilterActionType] = useState<string[]>([]); // ["tir", "rebond", "faute"]
  const [courtFilterPeriod, setCourtFilterPeriod] = useState<number[]>([]); // [1, 2, 3, 4] or [1, 2]


  // Calculate individual player statistics
  const calculatePlayerStats = (playerId: number) => {
    const playerActions = actions.filter(
      (action) => action.player === playerId
    );

    // Shots
    const shots = playerActions.filter((action) => action.type === "tir");
    const madeShots = shots.filter((action) => action.specification === "reussi");
    const missedShots = shots.filter((action) => action.specification === "rate");

    // Points by type
    const onePtMade = madeShots.filter((a) => a.points === 1).length;
    const twoPtMade = madeShots.filter((a) => a.points === 2).length;
    const threePtMade = madeShots.filter((a) => a.points === 3).length;

    const onePtTotal = shots.filter((a) => a.points === 1).length;
    const twoPtTotal = shots.filter((a) => a.points === 2).length;
    const threePtTotal = shots.filter((a) => a.points === 3).length;

    // Total points
    const totalPoints =
      onePtMade * 1 + twoPtMade * 2 + threePtMade * 3;

    // Rebounds
    const rebounds = playerActions.filter((action) => action.type === "rebond");
    const offensiveRebounds = rebounds.filter(
      (action) => action.specification === "offensif"
    ).length;
    const defensiveRebounds = rebounds.filter(
      (action) => action.specification === "defensif"
    ).length;

    // Fouls
    const fouls = playerActions.filter((action) => action.type === "faute");
    const personalFouls = fouls.filter(
      (action) => action.specification === "personnelle"
    ).length;
    const technicalFouls = fouls.filter(
      (action) => action.specification === "technique"
    ).length;

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
    };
  };

  // Get players with stats
  const playersWithStats = players.map((player) => ({
    ...player,
    stats: calculatePlayerStats(player.num), // Use num instead of id because actions store player.num
  }));

  // Filter by team
  const filteredPlayers = playersWithStats.filter((player) => {
    if (selectedTeam === "both") return true;
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
      default:
        return 0;
    }
  });

  // Calculate period for each action
  const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
  const sortedActions = [...actions].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );
  const actionsPerPeriod = Math.ceil(sortedActions.length / totalPeriods);

  const getActionPeriod = (action: ActionData): number => {
    const actionIndex = sortedActions.findIndex(
      (a) => a.timestamp.getTime() === action.timestamp.getTime()
    );
    if (actionIndex === -1) return 1;
    return Math.min(Math.floor(actionIndex / actionsPerPeriod) + 1, totalPeriods);
  };

  // Filter actions for court visualization
  const filteredCourtActions = useMemo(() => {
    return actions.filter((action) => {
      // Team filter
      if (courtFilterTeam !== "both" && action.team !== courtFilterTeam) {
        return false;
      }

      // Player filter
      if (courtFilterPlayers.length > 0 && !courtFilterPlayers.includes(action.player!)) {
        return false;
      }

      // Action type filter
      if (courtFilterActionType.length > 0 && !courtFilterActionType.includes(action.type)) {
        return false;
      }

      // Period filter
      if (courtFilterPeriod.length > 0) {
        const actionPeriod = getActionPeriod(action);
        if (!courtFilterPeriod.includes(actionPeriod)) {
          return false;
        }
      }

      return true;
    });
  }, [actions, courtFilterTeam, courtFilterPlayers, courtFilterActionType, courtFilterPeriod]);

  // Helper to get marker color based on action
  const getMarkerColor = (
    actionType: string,
    specification?: string
  ): string => {
    if (actionType === "tir") {
      return specification === "reussi" ? "#4CAF50" : "#F44336";
    }
    if (actionType === "rebond") {
      return specification === "offensif" ? "#FF9800" : "#2196F3";
    }
    if (actionType === "faute") {
      return specification === "technique" ? "#9C27B0" : "#E74C3C";
    }
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

  // Toggle helpers
  const togglePlayerFilter = (playerNum: number) => {
    setCourtFilterPlayers((prev) =>
      prev.includes(playerNum)
        ? prev.filter((num) => num !== playerNum)
        : [...prev, playerNum]
    );
  };

  const toggleActionTypeFilter = (actionType: string) => {
    setCourtFilterActionType((prev) =>
      prev.includes(actionType)
        ? prev.filter((type) => type !== actionType)
        : [...prev, actionType]
    );
  };

  const togglePeriodFilter = (period: number) => {
    setCourtFilterPeriod((prev) =>
      prev.includes(period)
        ? prev.filter((p) => p !== period)
        : [...prev, period]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du match</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.mainScroll}>
        {/* Score Summary */}
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

        {/* Tabs */}
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

        {/* Court Tab Content */}
        {activeTab === "court" && (
          <View style={styles.courtSection}>
          <Text style={styles.sectionTitle}>Visualisation du terrain</Text>

          {/* Court Filters */}
          <View style={styles.courtFilters}>
            {/* Team Filter */}
            <View style={styles.filterCategory}>
              <Text style={styles.filterCategoryLabel}>Équipe</Text>
              <View style={styles.filterCards}>
                {/* Show "Les deux" option only if managing both teams */}
                {teamMode === "both" && (
                  <TouchableOpacity
                    style={[
                      styles.filterCard,
                      courtFilterTeam === "both" && styles.filterCardActive,
                    ]}
                    onPress={() => setCourtFilterTeam("both")}
                  >
                    <Text
                      style={[
                        styles.filterCardText,
                        courtFilterTeam === "both" && styles.filterCardTextActive,
                      ]}
                    >
                      Les deux
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Show Team A option if managing Team A or both */}
                {(teamMode === "A" || teamMode === "both") && (
                  <TouchableOpacity
                    style={[
                      styles.filterCard,
                      courtFilterTeam === "A" && styles.filterCardActive,
                    ]}
                    onPress={() => setCourtFilterTeam("A")}
                  >
                    <Text
                      style={[
                        styles.filterCardText,
                        courtFilterTeam === "A" && styles.filterCardTextActive,
                      ]}
                    >
                      {teamA}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Show Team B option if managing Team B or both */}
                {(teamMode === "B" || teamMode === "both") && (
                  <TouchableOpacity
                    style={[
                      styles.filterCard,
                      courtFilterTeam === "B" && styles.filterCardActive,
                    ]}
                    onPress={() => setCourtFilterTeam("B")}
                  >
                    <Text
                      style={[
                        styles.filterCardText,
                        courtFilterTeam === "B" && styles.filterCardTextActive,
                      ]}
                    >
                      {teamB}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Action Type Filter */}
            <View style={styles.filterCategory}>
              <Text style={styles.filterCategoryLabel}>Actions</Text>
              <View style={styles.filterCards}>
                <TouchableOpacity
                  style={[
                    styles.filterCard,
                    courtFilterActionType.includes("tir") && styles.filterCardActive,
                  ]}
                  onPress={() => toggleActionTypeFilter("tir")}
                >
                  <Text
                    style={[
                      styles.filterCardText,
                      courtFilterActionType.includes("tir") && styles.filterCardTextActive,
                    ]}
                  >
                    🏀 Tirs
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterCard,
                    courtFilterActionType.includes("rebond") && styles.filterCardActive,
                  ]}
                  onPress={() => toggleActionTypeFilter("rebond")}
                >
                  <Text
                    style={[
                      styles.filterCardText,
                      courtFilterActionType.includes("rebond") && styles.filterCardTextActive,
                    ]}
                  >
                    📥 Rebonds
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterCard,
                    courtFilterActionType.includes("faute") && styles.filterCardActive,
                  ]}
                  onPress={() => toggleActionTypeFilter("faute")}
                >
                  <Text
                    style={[
                      styles.filterCardText,
                      courtFilterActionType.includes("faute") && styles.filterCardTextActive,
                    ]}
                  >
                    ⚠️ Fautes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Player Filter */}
            <View style={styles.filterCategory}>
              <Text style={styles.filterCategoryLabel}>Joueurs</Text>

              {/* Team A Players - Show if managing Team A or both */}
              {(courtFilterTeam === "A" || courtFilterTeam === "both") && (
                <>
                  <Text style={styles.filterSubLabel}>{teamA}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterCardsScroll}
                  >
                    {players
                      .filter((p) => p.team === "A")
                      .sort((a, b) => a.num - b.num)
                      .map((player) => (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.filterCard,
                            courtFilterPlayers.includes(player.num) && styles.filterCardActive,
                          ]}
                          onPress={() => togglePlayerFilter(player.num)}
                        >
                          <Text
                            style={[
                              styles.filterCardText,
                              courtFilterPlayers.includes(player.num) && styles.filterCardTextActive,
                            ]}
                          >
                            #{player.num} {player.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              )}

              {/* Team B Players - Show if managing Team B or both */}
              {(courtFilterTeam === "B" || courtFilterTeam === "both") && (
                <>
                  <Text style={[styles.filterSubLabel, courtFilterTeam === "both" && styles.filterSubLabelMargin]}>{teamB}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterCardsScroll}
                  >
                    {players
                      .filter((p) => p.team === "B")
                      .sort((a, b) => a.num - b.num)
                      .map((player) => (
                        <TouchableOpacity
                          key={player.id}
                          style={[
                            styles.filterCard,
                            courtFilterPlayers.includes(player.num) && styles.filterCardActive,
                          ]}
                          onPress={() => togglePlayerFilter(player.num)}
                        >
                          <Text
                            style={[
                              styles.filterCardText,
                              courtFilterPlayers.includes(player.num) && styles.filterCardTextActive,
                            ]}
                          >
                            #{player.num} {player.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </>
              )}
            </View>

            {/* Period Filter */}
            <View style={styles.filterCategory}>
              <Text style={styles.filterCategoryLabel}>Période</Text>
              <View style={styles.filterCards}>
                {Array.from({ length: totalPeriods }).map((_, index) => {
                  const period = index + 1;
                  return (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.filterCard,
                        courtFilterPeriod.includes(period) && styles.filterCardActive,
                      ]}
                      onPress={() => togglePeriodFilter(period)}
                    >
                      <Text
                        style={[
                          styles.filterCardText,
                          courtFilterPeriod.includes(period) && styles.filterCardTextActive,
                        ]}
                      >
                        {matchFormat === "2_halves" ? `MT${period}` : `Q${period}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Court and Stats Container */}
          <View style={styles.courtAndStatsContainer}>
            {/* Left Column - Live Stats */}
            <View style={styles.liveStats}>
              <Text style={styles.liveStatsTitle}>Stats</Text>

              {/* Shooting Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes("tir")) && (
                <>
                  <View style={styles.liveStatGroup}>
                    <Text style={styles.liveStatGroupLabel}>🏀 Tirs</Text>
                    <Text style={styles.liveStatGroupValue}>
                      {(() => {
                        const shots = filteredCourtActions.filter(a => a.type === "tir");
                        const made = shots.filter(a => a.specification === "reussi").length;
                        const percentage = shots.length > 0 ? Math.round((made / shots.length) * 100) : 0;
                        return `${made}/${shots.length} (${percentage}%)`;
                      })()}
                    </Text>

                    {/* Detailed breakdown */}
                    <View style={styles.liveStatDetail}>
                      <Text style={styles.liveStatDetailText}>
                        1pt: {(() => {
                          const onePtShots = filteredCourtActions.filter(a => a.type === "tir" && a.points === 1);
                          const onePtMade = onePtShots.filter(a => a.specification === "reussi").length;
                          const onePtPercentage = onePtShots.length > 0 ? Math.round((onePtMade / onePtShots.length) * 100) : 0;
                          return `${onePtMade}/${onePtShots.length} (${onePtPercentage}%)`;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        2pts: {(() => {
                          const twoPtShots = filteredCourtActions.filter(a => a.type === "tir" && a.points === 2);
                          const twoPtMade = twoPtShots.filter(a => a.specification === "reussi").length;
                          const twoPtPercentage = twoPtShots.length > 0 ? Math.round((twoPtMade / twoPtShots.length) * 100) : 0;
                          return `${twoPtMade}/${twoPtShots.length} (${twoPtPercentage}%)`;
                        })()}
                      </Text>
                      <Text style={styles.liveStatDetailText}>
                        3pts: {(() => {
                          const threePtShots = filteredCourtActions.filter(a => a.type === "tir" && a.points === 3);
                          const threePtMade = threePtShots.filter(a => a.specification === "reussi").length;
                          const threePtPercentage = threePtShots.length > 0 ? Math.round((threePtMade / threePtShots.length) * 100) : 0;
                          return `${threePtMade}/${threePtShots.length} (${threePtPercentage}%)`;
                        })()}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {/* Rebounds Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes("rebond")) && (
                <View style={styles.liveStatGroup}>
                  <Text style={styles.liveStatGroupLabel}>📥 Rebonds</Text>
                  <Text style={styles.liveStatGroupValue}>
                    {filteredCourtActions.filter(a => a.type === "rebond").length}
                  </Text>
                  <View style={styles.liveStatDetail}>
                    <Text style={styles.liveStatDetailText}>
                      Off: {filteredCourtActions.filter(a => a.type === "rebond" && a.specification === "offensif").length}
                    </Text>
                    <Text style={styles.liveStatDetailText}>
                      Def: {filteredCourtActions.filter(a => a.type === "rebond" && a.specification === "defensif").length}
                    </Text>
                  </View>
                </View>
              )}

              {/* Fouls Stats */}
              {(courtFilterActionType.length === 0 || courtFilterActionType.includes("faute")) && (
                <View style={[styles.liveStatGroup, styles.liveStatGroupLast]}>
                  <Text style={styles.liveStatGroupLabel}>⚠️ Fautes</Text>
                  <Text style={styles.liveStatGroupValue}>
                    {filteredCourtActions.filter(a => a.type === "faute").length}
                  </Text>
                  <View style={styles.liveStatDetail}>
                    <Text style={styles.liveStatDetailText}>
                      Pers: {filteredCourtActions.filter(a => a.type === "faute" && a.specification === "personnelle").length}
                    </Text>
                    <Text style={styles.liveStatDetailText}>
                      Tech: {filteredCourtActions.filter(a => a.type === "faute" && a.specification === "technique").length}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Center Column - Court */}
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

            {/* Right Column - Empty space for future use */}
            <View style={styles.rightPanel}>
              {/* Empty for now */}
            </View>
          </View>
          </View>
        )}

        {/* Players Tab Content */}
        {activeTab === "players" && (
          <View style={styles.playerStatsSection}>
            <Text style={styles.sectionTitle}>Statistiques des joueurs</Text>

            {/* Filters */}
            <View style={styles.filtersContainer}>
            {/* Team filter */}
        {teamMode === "both" && (
          <View style={styles.teamFilter}>
            <TouchableOpacity
              style={[
                styles.teamFilterButton,
                selectedTeam === "both" && styles.teamFilterButtonActive,
              ]}
              onPress={() => setSelectedTeam("both")}
            >
              <Text
                style={[
                  styles.teamFilterText,
                  selectedTeam === "both" && styles.teamFilterTextActive,
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

        {/* Sort buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortButtons}
        >
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "points" && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy("points")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "points" && styles.sortButtonTextActive,
              ]}
            >
              Points
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "shots" && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy("shots")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "shots" && styles.sortButtonTextActive,
              ]}
            >
              Tirs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "rebounds" && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy("rebounds")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "rebounds" && styles.sortButtonTextActive,
              ]}
            >
              Rebonds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === "name" && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy("name")}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === "name" && styles.sortButtonTextActive,
              ]}
            >
              Nom
            </Text>
          </TouchableOpacity>
        </ScrollView>
          </View>

          {/* Players List */}
          <View style={styles.playersList}>
        {sortedPlayers.map((player) => (
          <View key={player.id} style={styles.playerCard}>
            {/* Player header */}
            <View style={styles.playerHeader}>
              <View style={styles.playerInfo}>
                <Text style={styles.playerNumber}>#{player.num}</Text>
                <Text style={styles.playerName}>{player.name}</Text>
              </View>
              <Text style={styles.playerPoints}>{player.stats.totalPoints} pts</Text>
            </View>

            {/* Player stats */}
            <View style={styles.playerStats}>
              {/* Shooting stats */}
              <View style={styles.statSection}>
                <Text style={styles.statSectionTitle}>Tirs</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>
                    {player.stats.madeShots}/{player.stats.shots} ({player.stats.shotPercentage}%)
                  </Text>
                </View>
                {player.stats.onePtTotal > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>1pt</Text>
                    <Text style={styles.statValue}>
                      {player.stats.onePtMade}/{player.stats.onePtTotal} ({player.stats.onePtPercentage}%)
                    </Text>
                  </View>
                )}
                {player.stats.twoPtTotal > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>2pts</Text>
                    <Text style={styles.statValue}>
                      {player.stats.twoPtMade}/{player.stats.twoPtTotal} ({player.stats.twoPtPercentage}%)
                    </Text>
                  </View>
                )}
                {player.stats.threePtTotal > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>3pts</Text>
                    <Text style={styles.statValue}>
                      {player.stats.threePtMade}/{player.stats.threePtTotal} ({player.stats.threePtPercentage}%)
                    </Text>
                  </View>
                )}
              </View>

              {/* Other stats */}
              {(player.stats.rebounds > 0 || player.stats.fouls > 0) && (
                <View style={styles.statSection}>
                  <Text style={styles.statSectionTitle}>Autres</Text>
                  {player.stats.rebounds > 0 && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Rebonds</Text>
                      <Text style={styles.statValue}>
                        {player.stats.rebounds} (Off: {player.stats.offensiveRebounds} / Def: {player.stats.defensiveRebounds})
                      </Text>
                    </View>
                  )}
                  {player.stats.fouls > 0 && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Fautes</Text>
                      <Text style={styles.statValue}>
                        {player.stats.fouls} (Pers: {player.stats.personalFouls} / Tech: {player.stats.technicalFouls})
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}

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
    backgroundColor: "#f5f5f5",
  },
  mainScroll: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    width: 80,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
  filterCategory: {
    gap: 8,
  },
  filterCategoryLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  filterSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
    marginTop: 4,
  },
  filterSubLabelMargin: {
    marginTop: 12,
  },
  filterCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterCardsScroll: {
    flexDirection: "row",
  },
  filterCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    marginRight: 8,
  },
  filterCardActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterCardText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterCardTextActive: {
    color: "#fff",
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
