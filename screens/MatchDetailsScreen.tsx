/**
 * MatchDetailsScreen - Modern Design
 *
 * Affiche les détails d'un match terminé avec:
 * - Vue Statistiques (table des joueurs)
 * - Vue Cartes (fiches joueurs individuelles)
 * - Vue Terrain (carte des tirs)
 * - Modal de détail joueur
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  BackHandler,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Match, Team } from "../src/models/types";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  BRAND_COLORS,
  SLATE_COLORS,
  COMMON_COLORS,
} from "../src/theme/clubDefaults";
import BasketballCourtSVG from "../components/BasketballCourtSVG";

// Types
interface PlayerStats {
  playerNumber: number;
  name: string;
  team: Team;
  photoUrl?: string;
  pts: number;
  reb: number;
  reb_off: number;
  reb_def: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  ftm: number;
  fta: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  fgm: number;
  fga: number;
  eff: number;
  min: number;
}

type Tab = "STATS" | "CARDS" | "COURT";
type TeamFilter = "MyTeam" | "Opponent";

interface RouteParams {
  match: Match;
  actions: any[]; // Accept any format for now
  fromLiveMatch?: boolean;
  players?: any[]; // Optional players data
}

export default function MatchDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();
  const { match, actions, fromLiveMatch, players } = route.params;
  const { colors, isDark } = useTheme();

  // Create a map of player numbers to names
  const playerNamesMap = useMemo(() => {
    if (!players) return new Map<string, string>();
    const map = new Map<string, string>();
    players.forEach((p: any) => {
      const key = `${p.team}-${p.num}`;
      map.set(key, p.name || `Joueur ${p.num}`);
    });
    return map;
  }, [players]);

  const [activeTab, setActiveTab] = useState<Tab>("STATS");
  const [activeTeamFilter, setActiveTeamFilter] = useState<TeamFilter>(
    Team.MY_TEAM
  );
  const [viewPlayer, setViewPlayer] = useState<PlayerStats | null>(null);

  // Intercept hardware back button when coming from live match
  useFocusEffect(
    React.useCallback(() => {
      if (fromLiveMatch) {
        const onBackPress = () => {
          // Navigate to Dashboard instead of going back
          navigation.navigate("Dashboard" as never);
          return true; // Prevent default back behavior
        };

        const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

        return () => subscription.remove();
      }
    }, [fromLiveMatch, navigation])
  );

  // Calculer les statistiques des joueurs
  const calculateStats = (teamFilter: TeamFilter): PlayerStats[] => {
    if (!actions || actions.length === 0) {
      console.log("⚠️ MatchDetailsScreen - No actions to calculate stats");
      return [];
    }

    console.log("📊 MatchDetailsScreen - Calculating stats", {
      totalActions: actions.length,
      teamFilter,
      sampleAction: actions[0],
    });

    const playerStatsMap = new Map<string, PlayerStats>();

    actions
      .filter((action) => action.team === teamFilter)
      .forEach((action) => {
        // Handle both player and player_number fields
        const playerNum = action.player_number || action.player;
        const key = `${action.team}-${playerNum}`;

        if (!playerStatsMap.has(key)) {
          const playerName = playerNamesMap.get(key) || `Joueur ${playerNum}`;
          playerStatsMap.set(key, {
            playerNumber: playerNum,
            name: playerName,
            team: action.team,
            pts: 0,
            reb: 0,
            reb_off: 0,
            reb_def: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            to: 0,
            pf: 0,
            fgm: 0,
            fga: 0,
            ftm: 0,
            fta: 0,
            fg2m: 0,
            fg2a: 0,
            fg3m: 0,
            fg3a: 0,
            eff: 0,
            min: 0,
          });
        }

        const stats = playerStatsMap.get(key)!;

        // Normalize action types to uppercase for comparison
        const actionType = (
          action.action_type ||
          action.type ||
          ""
        ).toUpperCase();
        const specification = (action.specification || "").toLowerCase();

        // Points et tirs
        if (actionType === "SHOT") {
          if (specification === "made") {
            stats.pts += action.points || 0;
            stats.fgm += 1;

            if (action.points === 1) stats.ftm += 1;
            else if (action.points === 2) stats.fg2m += 1;
            else if (action.points === 3) stats.fg3m += 1;
          }

          stats.fga += 1;
          if (action.points === 1) stats.fta += 1;
          else if (action.points === 2) stats.fg2a += 1;
          else if (action.points === 3) stats.fg3a += 1;
        }

        // Rebonds
        if (actionType === "REBOUND") {
          stats.reb += 1;
          if (specification === "offensive") stats.reb_off += 1;
          else if (specification === "defensive") stats.reb_def += 1;
        }

        // Autres actions
        if (actionType === "ASSIST") stats.ast += 1;
        if (actionType === "STEAL") stats.stl += 1;
        if (actionType === "BLOCK") stats.blk += 1;
        if (actionType === "TURNOVER") stats.to += 1;
        if (actionType === "FOUL") stats.pf += 1;
      });

    // Calculer l'évaluation et estimer les minutes
    playerStatsMap.forEach((stats) => {
      stats.eff =
        stats.pts +
        stats.reb +
        stats.ast +
        stats.stl +
        stats.blk -
        (stats.fga - stats.fgm + (stats.fta - stats.ftm) + stats.to);

      // Estimation heuristique des minutes
      let estimatedMin = 10 + Math.floor(stats.eff / 1.5) + stats.pf * 2;
      if (estimatedMin < 5 && (stats.pts > 0 || stats.reb > 0))
        estimatedMin = 8;
      if (estimatedMin > 38) estimatedMin = 36 + Math.floor(Math.random() * 4);
      if (
        stats.eff === 0 &&
        stats.pts === 0 &&
        stats.reb === 0 &&
        stats.ast === 0
      )
        estimatedMin = 0;
      stats.min = estimatedMin;
    });

    const playersList = Array.from(playerStatsMap.values()).sort(
      (a, b) => b.pts - a.pts
    );
    console.log("✅ MatchDetailsScreen - Stats calculated", {
      playersFound: playersList.length,
      teamFilter,
    });
    return playersList;
  };

  // Calculer les stats seulement si actions est défini
  const stats = useMemo(() => {
    if (!actions) return [];
    return calculateStats(activeTeamFilter);
  }, [actions, activeTeamFilter, playerNamesMap]);

  // Theme colors
  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[600];
  const textTertiary = isDark ? SLATE_COLORS[500] : SLATE_COLORS[400];
  const brandLight = isDark ? BRAND_COLORS[100] : BRAND_COLORS[50];

  const isWin = match.my_team_score > match.opponent_score;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* PLAYER DETAIL MODAL */}
      {viewPlayer && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setViewPlayer(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[styles.modalContent, { backgroundColor: surfaceColor }]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View
                  style={[
                    styles.modalHeaderBg,
                    { backgroundColor: BRAND_COLORS[500] },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setViewPlayer(null)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.modalPlayerAvatar}>
                  <View
                    style={[
                      styles.playerAvatarCircle,
                      { borderColor: surfaceColor },
                    ]}
                  >
                    <Text style={styles.playerAvatarNumber}>
                      {viewPlayer.playerNumber}
                    </Text>
                  </View>
                </View>
              </View>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalPlayerInfo}>
                  <Text
                    style={[styles.modalPlayerName, { color: textPrimary }]}
                  >
                    {viewPlayer.name}
                  </Text>
                  <Text
                    style={[styles.modalPlayerTeam, { color: textSecondary }]}
                  >
                    {viewPlayer.team === Team.MY_TEAM
                      ? match.my_team_name || "Notre équipe"
                      : match.opponent_name}
                  </Text>
                </View>

                {/* Main Stats Grid */}
                <View style={styles.mainStatsGrid}>
                  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
                    <Text
                      style={[styles.statCardValue, { color: textPrimary }]}
                    >
                      {viewPlayer.min}'
                    </Text>
                    <Text
                      style={[styles.statCardLabel, { color: textTertiary }]}
                    >
                      Temps
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: brandLight,
                        borderColor: BRAND_COLORS[500],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statCardValue,
                        { color: BRAND_COLORS[500] },
                      ]}
                    >
                      {viewPlayer.pts}
                    </Text>
                    <Text
                      style={[
                        styles.statCardLabel,
                        { color: BRAND_COLORS[500] },
                      ]}
                    >
                      Points
                    </Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
                    <Text
                      style={[styles.statCardValue, { color: textPrimary }]}
                    >
                      {viewPlayer.eff}
                    </Text>
                    <Text
                      style={[styles.statCardLabel, { color: textTertiary }]}
                    >
                      Éval
                    </Text>
                  </View>
                </View>

                {/* Shooting Stats */}
                <View
                  style={[
                    styles.shootingSection,
                    {
                      backgroundColor: bgColor,
                      borderColor: borderColor,
                    },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                    🎯 Performance aux tirs
                  </Text>
                  <ShootingBar
                    label="3 Points"
                    made={viewPlayer.fg3m}
                    attempted={viewPlayer.fg3a}
                    color="#6366f1"
                  />
                  <ShootingBar
                    label="2 Points"
                    made={viewPlayer.fg2m}
                    attempted={viewPlayer.fg2a}
                    color="#3b82f6"
                  />
                  <ShootingBar
                    label="Lancers"
                    made={viewPlayer.ftm}
                    attempted={viewPlayer.fta}
                    color="#06b6d4"
                  />

                  <View
                    style={[
                      styles.shootingSummary,
                      { borderTopColor: borderColor },
                    ]}
                  >
                    <View style={styles.shootingSummaryItem}>
                      <Text
                        style={[
                          styles.shootingSummaryValue,
                          { color: textPrimary },
                        ]}
                      >
                        {viewPlayer.fgm}/{viewPlayer.fga}
                      </Text>
                      <Text
                        style={[
                          styles.shootingSummaryLabel,
                          { color: textTertiary },
                        ]}
                      >
                        TOTAL TIRS
                      </Text>
                    </View>
                    <View style={styles.shootingSummaryItem}>
                      <Text
                        style={[
                          styles.shootingSummaryValue,
                          { color: textPrimary },
                        ]}
                      >
                        {viewPlayer.fga > 0
                          ? Math.round((viewPlayer.fgm / viewPlayer.fga) * 100)
                          : 0}
                        %
                      </Text>
                      <Text
                        style={[
                          styles.shootingSummaryLabel,
                          { color: textTertiary },
                        ]}
                      >
                        RÉUSSITE
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Detailed Stats Grid */}
                <View style={styles.detailedStatsSection}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                    Détails
                  </Text>
                  <View style={styles.detailedStatsGrid}>
                    <StatBox label="REB" value={viewPlayer.reb} sub="Total" />
                    <StatBox label="AST" value={viewPlayer.ast} sub="Passes" />
                    <StatBox label="INT" value={viewPlayer.stl} sub="Vols" />
                    <StatBox label="CTR" value={viewPlayer.blk} sub="Contres" />
                    <StatBox label="BP" value={viewPlayer.to} sub="Pertes" />
                    <StatBox
                      label="RO"
                      value={viewPlayer.reb_off}
                      sub="Reb Off"
                    />
                    <StatBox
                      label="RD"
                      value={viewPlayer.reb_def}
                      sub="Reb Def"
                    />
                    <StatBox label="FTE" value={viewPlayer.pf} sub="Fautes" />
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* HEADER */}
      <View
        style={[
          styles.header,
          { backgroundColor: surfaceColor, borderBottomColor: borderColor },
        ]}
      >
        <View style={styles.headerTop}>
          {!fromLiveMatch ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <View style={styles.backButtonContent}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.text.secondary}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate("Dashboard" as never)}
            style={[styles.menuButton, { backgroundColor: bgColor }]}
          >
            <Ionicons name="grid-outline" size={12} color={textSecondary} />
            <Text style={[styles.menuButtonText, { color: textSecondary }]}>
              Menu
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scoreContainer}>
          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: textSecondary }]}>
              {match.my_team_name || "Notre équipe"}
            </Text>
            <Text
              style={[
                styles.scoreValue,
                { color: isWin ? textPrimary : textTertiary },
              ]}
            >
              {match.my_team_score}
            </Text>
            {isWin && (
              <Ionicons
                name="trophy-outline"
                size={25}
                color={BRAND_COLORS[500]}
              />
            )}
          </View>

          <View
            style={[styles.scoreDivider, { backgroundColor: borderColor }]}
          />

          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: textSecondary }]}>
              {match.opponent_name}
            </Text>
            <Text
              style={[
                styles.scoreValue,
                { color: !isWin ? textPrimary : textTertiary },
              ]}
            >
              {match.opponent_score}
            </Text>
            {!isWin && (
              <Ionicons
                name="trophy-outline"
                size={25}
                color={BRAND_COLORS[500]}
              />
            )}
          </View>
        </View>
      </View>

      {/* FILTERS & TABS */}
      <View style={[styles.filtersTabsContainer, { backgroundColor: bgColor }]}>
        <View
          style={[
            styles.teamFilterContainer,
            { backgroundColor: isDark ? "#27272a" : "#e2e8f0" },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTeamFilter(Team.MY_TEAM)}
            style={[
              styles.teamFilterButton,
              activeTeamFilter === Team.MY_TEAM && {
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <Text
              style={[
                styles.teamFilterText,
                {
                  color:
                    activeTeamFilter === Team.MY_TEAM
                      ? BRAND_COLORS[500]
                      : textSecondary,
                },
              ]}
            >
              NOUS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTeamFilter(Team.OPPONENT)}
            style={[
              styles.teamFilterButton,
              activeTeamFilter === Team.OPPONENT && {
                backgroundColor: surfaceColor,
              },
            ]}
          >
            <Text
              style={[
                styles.teamFilterText,
                {
                  color:
                    activeTeamFilter === Team.OPPONENT
                      ? BRAND_COLORS[500]
                      : textSecondary,
                },
              ]}
            >
              EUX
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("STATS")}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === "STATS" ? BRAND_COLORS[500] : surfaceColor,
                borderColor: borderColor,
              },
            ]}
          >
            <Ionicons
              name="list"
              size={20}
              color={activeTab === "STATS" ? "#fff" : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("CARDS")}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === "CARDS" ? BRAND_COLORS[500] : surfaceColor,
                borderColor: borderColor,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={activeTab === "CARDS" ? "#fff" : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("COURT")}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === "COURT" ? BRAND_COLORS[500] : surfaceColor,
                borderColor: borderColor,
              },
            ]}
          >
            <Ionicons
              name="basketball-outline"
              size={20}
              color={activeTab === "COURT" ? "#fff" : textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* TABLE VIEW */}
        {activeTab === "STATS" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View
              style={[
                styles.tableContainer,
                { backgroundColor: surfaceColor, borderColor: borderColor },
              ]}
            >
              {/* Table Header */}
              <View
                style={[
                  styles.tableHeader,
                  { backgroundColor: isDark ? "#1e293b33" : "#f1f5f9" },
                ]}
              >
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.playerCell,
                    { color: textSecondary },
                  ]}
                >
                  JOUEUR
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.minCell,
                    { color: textTertiary },
                  ]}
                >
                  MIN
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  PTS
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCellWide,
                    { color: textSecondary },
                  ]}
                >
                  TIRS
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCellWide,
                    { color: textSecondary },
                  ]}
                >
                  2PTS
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCellWide,
                    { color: textSecondary },
                  ]}
                >
                  3PTS
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCellWide,
                    { color: textSecondary },
                  ]}
                >
                  LF
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  REB
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  RO
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  RD
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  AST
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  INT
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  CTR
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  BP
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  FT
                </Text>
                <Text
                  style={[
                    styles.tableHeaderCell,
                    styles.statCell,
                    { color: textSecondary },
                  ]}
                >
                  EFF
                </Text>
              </View>

              {/* Table Body */}
              {stats.map((player, index) => (
                <TouchableOpacity
                  key={`${player.team}-${player.playerNumber}-${index}`}
                  onPress={() => setViewPlayer(player)}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: borderColor },
                    index === stats.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.tableCell, styles.playerCell]}>
                    <View
                      style={[
                        styles.playerNumberBadge,
                        { backgroundColor: bgColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.playerNumberBadgeText,
                          { color: textSecondary },
                        ]}
                      >
                        {player.playerNumber}
                      </Text>
                    </View>
                    <Text
                      style={[styles.playerNameText, { color: textPrimary }]}
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.minCell,
                      { color: textTertiary },
                    ]}
                  >
                    {player.min}'
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      styles.statCellBold,
                      { color: textPrimary },
                    ]}
                  >
                    {player.pts}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {player.fgm}/{player.fga}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {player.fg2m}/{player.fg2a}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {player.fg3m}/{player.fg3a}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {player.ftm}/{player.fta}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.reb}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.reb_off}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.reb_def}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.ast}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.stl}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.blk}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.to}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {player.pf}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      styles.statCellBold,
                      { color: BRAND_COLORS[500] },
                    ]}
                  >
                    {player.eff}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Total Row */}
              {stats.length > 0 && (
                <View
                  style={[
                    styles.tableRow,
                    styles.totalRow,
                    {
                      backgroundColor: isDark ? "#1e293b33" : "#f1f5f9",
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View style={[styles.tableCell, styles.playerCell]}>
                    <Text
                      style={[
                        styles.playerNameText,
                        styles.totalText,
                        { color: textPrimary },
                      ]}
                    >
                      TOTAL
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.minCell,
                      { color: textTertiary },
                    ]}
                  >
                    -
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      styles.statCellBold,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.pts, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.fgm, 0)}/
                    {stats.reduce((sum, p) => sum + p.fga, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.fg2m, 0)}/
                    {stats.reduce((sum, p) => sum + p.fg2a, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.fg3m, 0)}/
                    {stats.reduce((sum, p) => sum + p.fg3a, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCellWide,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.ftm, 0)}/
                    {stats.reduce((sum, p) => sum + p.fta, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.reb, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.reb_off, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.reb_def, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.ast, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.stl, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.blk, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.to, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      { color: textPrimary },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.pf, 0)}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      styles.statCell,
                      styles.statCellBold,
                      { color: BRAND_COLORS[500] },
                    ]}
                  >
                    {stats.reduce((sum, p) => sum + p.eff, 0)}
                  </Text>
                </View>
              )}

              {stats.length === 0 && (
                <View style={styles.emptyState}>
                  <Text
                    style={[styles.emptyStateText, { color: textTertiary }]}
                  >
                    Aucune donnée disponible
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* CARDS VIEW */}
        {activeTab === "CARDS" && (
          <View style={styles.cardsContainer}>
            {stats.map((player, index) => (
              <TouchableOpacity
                key={`${player.team}-${player.playerNumber}-${index}`}
                onPress={() => setViewPlayer(player)}
                style={[
                  styles.playerCard,
                  {
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardPlayerInfo}>
                    <View
                      style={[
                        styles.cardAvatar,
                        {
                          backgroundColor: bgColor,
                          borderColor: borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.cardAvatarText, { color: textPrimary }]}
                      >
                        {player.playerNumber}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[styles.cardPlayerName, { color: textPrimary }]}
                      >
                        {player.name}
                      </Text>
                      <Text
                        style={[
                          styles.cardPlayerNumber,
                          { color: textSecondary },
                        ]}
                      >
                        #{player.playerNumber}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.cardPointsBadge,
                      {
                        backgroundColor: brandLight,
                        borderColor: BRAND_COLORS[500],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.cardPointsValue,
                        { color: BRAND_COLORS[500] },
                      ]}
                    >
                      {player.pts}
                    </Text>
                    <Text
                      style={[
                        styles.cardPointsLabel,
                        { color: BRAND_COLORS[500] },
                      ]}
                    >
                      Points
                    </Text>
                  </View>
                </View>

                {/* Shooting Bars */}
                <View style={styles.cardShootingBars}>
                  <ShootingBar
                    label="3 PTS"
                    made={player.fg3m}
                    attempted={player.fg3a}
                    color="#6366f1"
                    compact
                  />
                  <ShootingBar
                    label="2 PTS"
                    made={player.fg2m}
                    attempted={player.fg2a}
                    color="#3b82f6"
                    compact
                  />
                  <ShootingBar
                    label="LANC"
                    made={player.ftm}
                    attempted={player.fta}
                    color="#06b6d4"
                    compact
                  />
                </View>

                {/* Stats Grid */}
                <View
                  style={[
                    styles.cardStatsGrid,
                    { borderTopColor: borderColor },
                  ]}
                >
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      MIN
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.min}'
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      REB
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.reb}
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      AST
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.ast}
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      INT
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.stl}
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      CTR
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.blk}
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      BP
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.to}
                    </Text>
                  </View>
                  <View style={styles.cardStatItem}>
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      FT
                    </Text>
                    <Text
                      style={[styles.cardStatValue, { color: textPrimary }]}
                    >
                      {player.pf}
                    </Text>
                  </View>
                  <View
                    style={[styles.cardStatItem, { backgroundColor: bgColor }]}
                  >
                    <Text
                      style={[styles.cardStatLabel, { color: textTertiary }]}
                    >
                      ÉVAL
                    </Text>
                    <Text
                      style={[
                        styles.cardStatValue,
                        {
                          color: BRAND_COLORS[500],
                        },
                      ]}
                    >
                      {player.eff}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {stats.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: textTertiary }]}>
                  Aucune statistique.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* COURT VIEW */}
        {activeTab === "COURT" && (
          <View style={styles.courtViewContainer}>
            {/* Basketball Court with Shot Chart */}
            <View
              style={[styles.courtContainer, { backgroundColor: surfaceColor }]}
            >
              <BasketballCourtSVG
                width={400}
                height={600}
                backgroundColor={isDark ? "#2d5a3d" : "#e8f5e9"}
                lineColor={isDark ? "#f1f5f9" : "#1e293b"}
                logoUri={null}
                markers={
                  actions
                    ?.filter((action: any) => {
                      // Filter shots only - check action_type or type field
                      const actionType = (
                        action.action_type ||
                        action.type ||
                        ""
                      ).toUpperCase();
                      if (actionType !== "SHOT") return false;

                      // Filter by team using activeTeamFilter (already selected at top)
                      return action.team === activeTeamFilter;
                    })
                    .filter((action: any) => action.semanticPosition) // Only actions with position
                    .map((action: any, index: number) => {
                      // Convert normalized coordinates to SVG coordinates
                      const svgX = action.semanticPosition.xNormalized * 615.75;
                      const svgY =
                        action.semanticPosition.yNormalized * 1146.75;

                      // Determine marker color based on specification (made/missed)
                      const specification = (
                        action.specification || ""
                      ).toLowerCase();
                      let markerColor = SLATE_COLORS[500];

                      if (specification === "made") {
                        // Made shots
                        markerColor =
                          action.team === Team.MY_TEAM ? "#22c55e" : "#ef4444";
                      } else if (specification === "missed") {
                        // Missed shots
                        markerColor =
                          action.team === Team.MY_TEAM ? "#f97316" : "#ea580c";
                      }

                      return {
                        id: `${action.team}-${action.player || action.player_number}-${action.timestamp || index}-${index}`,
                        svgX,
                        svgY,
                        color: markerColor,
                      };
                    }) || []
                }
              />

              {/* Shot Stats Summary */}
              <View
                style={[styles.shotStatsSummary, { backgroundColor: bgColor }]}
              >
                <View style={styles.shotStatsRow}>
                  <View style={styles.shotStatItem}>
                    <View
                      style={[
                        styles.shotStatDot,
                        {
                          backgroundColor:
                            activeTeamFilter === Team.MY_TEAM
                              ? "#22c55e"
                              : "#ef4444",
                        },
                      ]}
                    />
                    <Text
                      style={[styles.shotStatLabel, { color: textSecondary }]}
                    >
                      Tirs réussis
                    </Text>
                  </View>
                  <View style={styles.shotStatItem}>
                    <View
                      style={[
                        styles.shotStatDot,
                        {
                          backgroundColor:
                            activeTeamFilter === Team.MY_TEAM
                              ? "#f97316"
                              : "#ea580c",
                        },
                      ]}
                    />
                    <Text
                      style={[styles.shotStatLabel, { color: textSecondary }]}
                    >
                      Tirs manqués
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
interface ShootingBarProps {
  label: string;
  made: number;
  attempted: number;
  color: string;
  compact?: boolean;
}

const ShootingBar: React.FC<ShootingBarProps> = ({
  label,
  made,
  attempted,
  color,
  compact,
}) => {
  const { isDark } = useTheme();
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[600];
  const textTertiary = isDark ? SLATE_COLORS[500] : SLATE_COLORS[400];
  const pct = attempted > 0 ? Math.round((made / attempted) * 100) : 0;

  return (
    <View style={[styles.shootingBar, compact && styles.shootingBarCompact]}>
      <View style={styles.shootingBarRow}>
        <Text
          style={[
            styles.shootingBarLabel,
            { color: textSecondary },
            compact && styles.shootingBarLabelCompact,
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.shootingBarTrack,
            { backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200] },
            compact && styles.shootingBarTrackCompact,
          ]}
        >
          <View
            style={[
              styles.shootingBarFill,
              { backgroundColor: color, width: `${pct}%` },
            ]}
          />
        </View>
        <Text
          style={[
            styles.shootingBarValue,
            { color: textPrimary },
            compact && styles.shootingBarValueCompact,
          ]}
        >
          <Text style={styles.shootingBarValueBold}>
            {made}/{attempted}
          </Text>
          <Text style={[styles.shootingBarPct, { color: textTertiary }]}>
            {" "}
            ({pct}%)
          </Text>
        </Text>
      </View>
    </View>
  );
};

interface StatBoxProps {
  label: string;
  value: number | string;
  sub?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, sub }) => {
  const { isDark } = useTheme();
  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textTertiary = isDark ? SLATE_COLORS[500] : SLATE_COLORS[400];

  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: bgColor, borderColor: borderColor },
      ]}
    >
      <Text style={[styles.statBoxLabel, { color: textTertiary }]}>
        {label}
      </Text>
      <Text style={[styles.statBoxValue, { color: textPrimary }]}>{value}</Text>
      {sub && (
        <Text style={[styles.statBoxSub, { color: textTertiary }]}>{sub}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    position: "relative",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  menuButtonText: {
    fontSize: 10,
    fontWeight: "700",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamScore: {
    flex: 1,
    alignItems: "center",
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -2,
  },
  scoreDivider: {
    width: 1,
    height: 48,
    marginHorizontal: 16,
  },

  // Filters & Tabs
  filtersTabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  teamFilterContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    flex: 1,
  },
  teamFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  teamFilterText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  tabButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Table View
  tableContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 80,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  tableCell: {
    fontSize: 12,
  },
  playerCell: {
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  playerNumberBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  minCell: {
    width: 40,
    textAlign: "center",
  },
  statCell: {
    width: 40,
    textAlign: "center",
  },
  statCellWide: {
    width: 60,
    textAlign: "center",
    fontSize: 11,
  },
  statCellBold: {
    fontWeight: "900",
  },
  totalRow: {},
  totalText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Cards View
  cardsContainer: {
    gap: 16,
    marginBottom: 80,
  },
  playerCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardPlayerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardAvatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  cardPlayerName: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  cardPlayerNumber: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  cardPointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cardPointsValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 28,
  },
  cardPointsLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardShootingBars: {
    gap: 8,
    marginBottom: 20,
  },
  cardStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  cardStatItem: {
    width: "23%",
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 4,
  },
  cardStatLabel: {
    fontSize: 8,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardStatValue: {
    fontSize: 14,
    fontWeight: "900",
  },

  // Shooting Bar
  shootingBar: {
    marginBottom: 8,
  },
  shootingBarCompact: {
    marginBottom: 4,
  },
  shootingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shootingBarLabel: {
    fontSize: 12,
    fontWeight: "700",
    width: 50,
  },
  shootingBarLabelCompact: {
    fontSize: 10,
    width: 45,
  },
  shootingBarTrack: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  shootingBarTrackCompact: {
    height: 8,
  },
  shootingBarFill: {
    height: "100%",
  },
  shootingBarValue: {
    fontSize: 12,
    minWidth: 70,
    textAlign: "right",
  },
  shootingBarValueCompact: {
    fontSize: 10,
    minWidth: 65,
  },
  shootingBarValueBold: {
    fontWeight: "700",
  },
  shootingBarPct: {
    fontSize: 10,
  },

  // Stat Box
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statBoxLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 16,
  },
  statBoxSub: {
    fontSize: 8,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    height: 128,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalPlayerAvatar: {
    position: "absolute",
    bottom: -48,
  },
  playerAvatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#cbd5e1",
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  playerAvatarNumber: {
    fontSize: 36,
    fontWeight: "900",
    color: "#64748b",
  },
  modalScroll: {
    flex: 1,
  },
  modalPlayerInfo: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  modalPlayerName: {
    fontSize: 24,
    fontWeight: "900",
    textTransform: "uppercase",
    lineHeight: 24,
    width: 1000,
  },
  modalPlayerTeam: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  mainStatsGrid: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 28,
  },
  statCardLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
  },
  shootingSection: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  shootingSummary: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 16,
  },
  shootingSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  shootingSummaryValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  shootingSummaryLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  detailedStatsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  detailedStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // Court View
  courtViewContainer: {
    marginBottom: 80,
  },
  courtContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 16,
    minHeight: 600,
  },
  shotStatsSummary: {
    marginTop: 24,
    padding: 16,
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
});
