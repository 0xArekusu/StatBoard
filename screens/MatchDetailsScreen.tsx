/**
 * MatchDetailsScreen - Match details and statistics screen
 *
 * Displays detailed statistics for a completed match with multiple views:
 * - Evolution View: Score evolution chart per period
 * - Statistics View: Table of all player statistics
 * - Cards View: Individual player cards
 * - Court View: Shot chart with positions on the court
 * - Player Detail Modal: Detailed statistics for a single player
 *
 * Data sources:
 * - Completed match from database (SQLite or Supabase)
 * - Actions recorded during the match
 * - Players selected for the match
 *
 * Features:
 * - Filter by team (MY_TEAM or OPPONENT)
 * - Sort statistics by column
 * - Export statistics to PDF
 * - Custom back navigation from live match
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Match, Team } from "../src/models/types";
import { Club } from "../models/Club";
import {
  ActionType,
  ShotSpecification,
  ReboundSpecification,
} from "../src/models/ActionTypes";
import { GUEST_IDS } from "../constants/matchConstants";
import { ANALYTICS_EVENTS, ANALYTICS_PDF_EXPORT_TYPE } from "../constants/analyticsEvents";
import { usePostHog } from "posthog-react-native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { Colors } from "../src/theme/colors";
import BasketballCourtSVG from "../components/BasketballCourtSVG";
import { PDFExportService } from "../src/services/export/PDFExportService";
import { Alert } from "react-native";
import { showErrorAlert } from "../utils/errorAlert";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { getSignedUrl } from "../utils/storageHelper";
import { useSignedUrl } from "../hooks/useSignedUrl";
import { recordReviewPromptSignal } from "../hooks/useReviewPrompt";
import { MatchSponsor, getSponsorUris, parseMatchSponsors } from "../src/services/SponsorService";
import { StatsTab, CardsTab, CourtTab, EvolutionTab, TimelineTab, PlayerDetailModal } from "../components/MatchDetails";
import type { PlayerStats, Tab, TeamFilter, ActionFilterType, SortBy, SortOrder } from "../constants/matchDetailsConstants";
import { TAB, ACTION_FILTER } from "../constants";
import { RootStackParamList, RootNavigationProp } from "../types/navigation";
import { calculateEfficiency, calculatePlusMinus } from "../src/utils/statsCalculator";

type MatchDetailsRouteProp = RouteProp<RootStackParamList, "MatchDetails">;

export default function MatchDetailsScreen() {
  // ========================================
  // NAVIGATION & ROUTING
  // ========================================
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<MatchDetailsRouteProp>();
  const posthog = usePostHog();
  const { match, fromLiveMatch, isLocalMatch } = route.params;
  const { colors, isDark } = useTheme();
  const { sp, font, sizes } = useResponsive();

  // ========================================
  // STATE - LOADED DATA
  // ========================================
  // Match actions (shots, rebounds, assists, etc.)
  const [actions, setActions] = useState<any[]>(route.params.actions || []);
  // Players who participated in the match
  const [players, setPlayers] = useState<any[]>(route.params.players || []);
  // Loading state if data is not provided
  const [loading, setLoading] = useState<boolean>(!route.params.actions);

  // Club associated with the match (for court colors and logo)
  const [club, setClub] = useState<Club | null>(null);

  // ========================================
  // EFFECT - LOAD MATCH DATA
  // ========================================
  // Load match actions and players if not provided in route params
  useEffect(() => {
    const loadMatchData = async () => {
      // If data is already provided (from LiveMatch), skip loading
      if (route.params.actions && route.params.players) {
        console.log('[MatchDetailsScreen] 📦 Données déjà fournies par route.params');
        console.log('[MatchDetailsScreen] 👥 Joueurs de route.params:', route.params.players.map((p: any) => ({
          id: p.id,
          num: p.num,
          name: p.name,
          team: p.team
        })));
        return;
      }

      try {
        setLoading(true);

        // Use MatchDataService to load from appropriate source (SQLite or Supabase)
        const matchDataService = ServiceFactory.getMatchDataService(supabase);
        const matchDetails = await matchDataService.loadMatchDetails(match);

        console.log('[MatchDetailsScreen] 📥 Données chargées depuis DB');
        console.log('[MatchDetailsScreen] 🎬 Actions chargées:', matchDetails.actions.length);
        console.log('[MatchDetailsScreen] 👥 Joueurs chargés:', matchDetails.players.length);
        console.log('[MatchDetailsScreen] 📋 Liste joueurs:', matchDetails.players.map((p: any) => ({
          id: p.id,
          num: p.num,
          name: p.name,
          team: p.team
        })));

        setActions(matchDetails.actions);
        setPlayers(matchDetails.players);
      } catch (error) {
        console.error("Error loading match data:", error);
        Alert.alert(
          "Erreur",
          "Impossible de charger les données du match. Veuillez réessayer."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMatchData();
  }, [match, route.params.actions, route.params.players]);

  // ========================================
  // EFFECT - LOAD CLUB DATA
  // ========================================
  // Load club data to get logo and court colors
  useEffect(() => {
    const loadClub = async () => {
      // Skip loading for guest mode (offline matches)
      if (!match.club_id || match.club_id === GUEST_IDS.CLUB) {
        return;
      }

      try {
        const clubService = ServiceFactory.getClubService(supabase);
        const clubData = await clubService.getClubById(match.club_id);
        setClub(clubData);
      } catch (error) {
        console.error("Error loading club:", error);
        // Non-blocking error - club colors are optional
      }
    };

    loadClub();
  }, [match.club_id]);

  // ========================================
  // MEMO - PLAYER NAMES MAP
  // ========================================
  // Create a fast lookup map to get player name by team-num key
  const playerNamesMap = useMemo(() => {
    if (!players) return new Map<string, string>();
    const map = new Map<string, string>();
    players.forEach((p: any) => {
      const key = `${p.team}-${p.num}`;
      // Use fallback if name is undefined, null, or empty string
      const playerName = p.name && p.name.trim() !== '' ? p.name : `Joueur ${p.num}`;
      map.set(key, playerName);
    });
    return map;
  }, [players]);

  // ========================================
  // MEMO - PLAYER PLAYING TIME MAP
  // ========================================
  // Create a fast lookup map to get playing time by team-num key
  const playerPlayingTimeMap = useMemo(() => {
    if (!players) return new Map<string, number>();
    const map = new Map<string, number>();
    players.forEach((p: any) => {
      const key = `${p.team}-${p.num}`;
      // Get playing time in seconds, default to 0
      const playingTimeSeconds = p.playingTimeSeconds || 0;
      map.set(key, playingTimeSeconds);
    });
    return map;
  }, [players]);

  // ========================================
  // STATE - USER INTERFACE
  // ========================================
  // Active tab (Evolution, Stats, Cards, Court)
  const [activeTab, setActiveTab] = useState<Tab>(TAB.EVOLUTION);
  // Active team filter (MY_TEAM or OPPONENT)
  const [activeTeamFilter, setActiveTeamFilter] = useState<TeamFilter>(
    Team.MY_TEAM
  );
  // Selected player to display detail modal
  const [viewPlayer, setViewPlayer] = useState<PlayerStats | null>(null);
  // Selected action types for court filter
  const [selectedActionTypes, setSelectedActionTypes] = useState<ActionFilterType[]>(
    []
  );
  // Selected specifications for court filter (e.g., offensive/defensive for rebounds)
  const [selectedSpecifications, setSelectedSpecifications] = useState<string[]>(
    []
  );
  // Selected players for court filter
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  // Show/hide court filters
  const [showCourtFilters, setShowCourtFilters] = useState(false);
  // Statistics sort column
  const [sortBy, setSortBy] = useState<SortBy>("pts");
  // Sort order (ascending or descending)
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  // PDF export loading state
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // ========================================
  // HANDLER - EXPORT PDF
  // ========================================
  /**
   * Generate and share a PDF with match statistics
   *
   * The PDF contains:
   * - Final score and evolution per period
   * - Complete statistics for all players
   * - Score evolution chart
   * - Shot charts on court (if available)
   */
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);

      // Determine if opponent stats are tracked by checking for opponent players
      // (excluding generic player 9999 used for opponent points without detailed tracking)
      const trackOpponentStats = players?.some(
        (p) => p.team === Team.OPPONENT && p.num !== 9999
      ) || false;

      // Generate signed URL for club logo if available (for PDF embedding)
      let clubLogoUrl: string | undefined = undefined;
      if (club?.logoUrl) {
        clubLogoUrl = (await getSignedUrl(supabase, club.logoUrl)) || undefined;
      }

      const pdfOptions = {
        myTeamName: match.my_team_name || "Notre équipe",
        opponentName: match.opponent_name || "Adversaire",
        myTeamScore: match.my_team_score || 0,
        opponentScore: match.opponent_score || 0,
        actions: actions || [], // Raw actions from database (with action_type, player_number, etc.)
        matchFormat: (match.total_periods === 2 ? "2_halves" : "4_quarters") as "2_halves" | "4_quarters",
        periodDuration: match.period_duration || 10,
        trackOpponentStats, // If true, PDF will include opponent stats
        players: players || [],
        matchDate: match.created_at ? new Date(match.created_at) : new Date(),
        isHome: match.is_home ?? true, // Pass whether my team is playing at home
        overtimePeriods: match.overtime_periods || 0, // Number of overtime periods played
        myTeamHandicap: match.my_team_handicap || 0,
        opponentHandicap: match.opponent_handicap || 0,
        clubLogoUrl, // Signed URL for PDF (valid 2h) or undefined if offline/error
        courtBackgroundColor: club?.courtBackgroundColor, // Use club court background color if configured
        courtLineColor: club?.courtLineColor, // Use club court line color if configured
        matchSponsors: parseMatchSponsors(match.match_sponsors),
      };

      await PDFExportService.generateMatchPDF(pdfOptions);
      setIsExportingPDF(false);
      posthog?.capture(ANALYTICS_EVENTS.PDF_EXPORTED, { type: ANALYTICS_PDF_EXPORT_TYPE.MATCH });
      recordReviewPromptSignal();
      Alert.alert("Succès", "Le PDF a été généré et partagé avec succès");
    } catch (error) {
      setIsExportingPDF(false);
      console.error("Error exporting PDF:", error);
      showErrorAlert({
        action: "générer le PDF",
        error,
        context: "MatchDetailsScreen",
      });
    }
  };

  // ========================================
  // EFFECT - BACK NAVIGATION FROM LIVE MATCH
  // ========================================
  // Intercept hardware back button when coming from live match
  // to redirect to Dashboard instead of going back to the live match
  useFocusEffect(
    React.useCallback(() => {
      if (fromLiveMatch) {
        const onBackPress = () => {
          // Redirect to Dashboard instead of going back to live match
          navigation.navigate("Dashboard" as never);
          return true; // Prevent default behavior
        };

        const subscription = BackHandler.addEventListener(
          "hardwareBackPress",
          onBackPress
        );

        return () => subscription.remove();
      }
    }, [fromLiveMatch, navigation])
  );

  // ========================================
  // HELPER - FORMAT PLAYING TIME
  // ========================================
  /**
   * Format playing time from seconds to MM:SS format
   * @param seconds - Playing time in seconds
   * @returns Formatted string "MM:SS"
   */
  const formatPlayingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ========================================
  // FUNCTION - CALCULATE STATISTICS
  // ========================================
  /**
   * Calculate statistics for all players of a team
   *
   * Initializes all players with 0 stats, then iterates through actions
   * to increment appropriate counters.
   *
   * Calculated statistics:
   * - Points (pts), Shots (fgm/fga, ftm/fta, fg2m/fg2a, fg3m/fg3a)
   * - Rebounds (reb, reb_off, reb_def)
   * - Assists (ast), Steals (stl), Blocks (blk)
   * - Turnovers (to), Fouls (pf)
   * - Efficiency (eff) = pts + reb + ast + stl + blk - (misses + to)
   * - Playing time (min) - actual time tracked during match in real-time (format: "MM:SS")
   *
   * @param teamFilter - Team.MY_TEAM or Team.OPPONENT
   * @returns List of statistics for all players on the team
   */
  const calculateStats = (teamFilter: TeamFilter): PlayerStats[] => {
    const playerStatsMap = new Map<string, PlayerStats>();

    // STEP 1: Initialize all players with zero stats
    // This ensures a player appears in the list even if they have no actions
    if (players && players.length > 0) {
      players
        .filter((player) => player.team === teamFilter)
        // Exclude generic player 9999 used for opponent points without tracking
        // Check both 'num' and 'player_number' fields for compatibility
        .filter((player) => {
          const playerNum = player.num || player.player_number;
          return playerNum !== 9999;
        })
        .forEach((player) => {
          const playerNum = player.num || player.player_number;
          const key = `${player.team}-${playerNum}`;
          // Use fallback if name is undefined, null, or empty string
          const playerName = (player.name || player.player_name) && (player.name || player.player_name).trim() !== ''
            ? (player.name || player.player_name)
            : `Joueur ${playerNum}`;
          playerStatsMap.set(key, {
            playerNumber: playerNum,
            name: playerName,
            team: player.team,
            photoUrl: player.photoUrl || player.photo_url || undefined,
            isSubstitute: player.isSubstitute ?? false,
            pts: 0,
            reb: 0,
            reb_off: 0,
            reb_def: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            to: 0,
            pf: 0,
            fd: 0,
            fgm: 0,
            fga: 0,
            ftm: 0,
            fta: 0,
            fg2m: 0,
            fg2a: 0,
            fg3m: 0,
            fg3a: 0,
            eff: 0,
            pm: 0,
            min: "0:00",
          });
        });
    }

    // STEP 2: Iterate through all actions and increment counters
    if (actions && actions.length > 0) {
      actions
        .filter((action) => action.team === teamFilter)
        .forEach((action) => {
          // Handle both data formats (player_number from database, player from app)
          const playerNum = action.player_number || action.player;

          // Skip invalid player numbers (9999 = generic opponent, -1 = team rebound)
          if (!playerNum || playerNum === 9999 || playerNum === -1) {
            return;
          }

          const key = `${action.team}-${playerNum}`;

          // Rare case: action recorded for a player not in the players list
          // Create an entry for this player with default stats
          // IMPORTANT: Don't create stats entry for player 9999 (generic opponent player)
          // This player is only used internally to track opponent points without individual stats
          if (!playerStatsMap.has(key)) {
            const playerName = playerNamesMap.get(key) || `Joueur ${playerNum}`;
            playerStatsMap.set(key, {
              playerNumber: playerNum,
              name: playerName,
              team: action.team,
              photoUrl: undefined,
              isSubstitute: false,
              pts: 0,
              reb: 0,
              reb_off: 0,
              reb_def: 0,
              ast: 0,
              stl: 0,
              blk: 0,
              to: 0,
              pf: 0,
              fd: 0,
              fgm: 0,
              fga: 0,
              ftm: 0,
              fta: 0,
              fg2m: 0,
              fg2a: 0,
              fg3m: 0,
              fg3a: 0,
              eff: 0,
              pm: 0,
              min: "0:00",
            });
          }

          const stats = playerStatsMap.get(key);

          // Skip updating stats if player is 9999 (shouldn't happen but safety check)
          if (!stats) {
            return;
          }

        // Normalize action types for comparison
        // Database actions use action_type (e.g., "SHOT", "REBOUND")
        // Enums are in PascalCase (e.g., ActionType.SHOT = "Shot")
        const actionType = (
          action.action_type ||
          action.type ||
          ""
        ).toUpperCase();
        const specification = (action.specification || "").toLowerCase();

        // COUNT SHOTS AND POINTS
        if (actionType === ActionType.SHOT.toUpperCase()) {
          if (specification === ShotSpecification.MADE) {
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

        // COUNT REBOUNDS
        if (actionType === ActionType.REBOUND.toUpperCase()) {
          stats.reb += 1;
          if (specification === ReboundSpecification.OFFENSIVE) stats.reb_off += 1;
          else if (specification === ReboundSpecification.DEFENSIVE) stats.reb_def += 1;
        }

        // COUNT OTHER ACTIONS
        if (actionType === ActionType.ASSIST.toUpperCase()) stats.ast += 1;
        if (actionType === ActionType.STEAL.toUpperCase()) stats.stl += 1;
        if (actionType === ActionType.BLOCK.toUpperCase()) stats.blk += 1;
        if (actionType === ActionType.TURNOVER.toUpperCase()) stats.to += 1;
        if (actionType === ActionType.FOUL.toUpperCase()) stats.pf += 1;
        if (actionType === ActionType.FOUL_DRAWN.toUpperCase()) stats.fd += 1;
      });

    // STEP 3: Calculate efficiency and playing time
    playerStatsMap.forEach((stats) => {
      // Efficiency formula: positive actions - negative actions
      // Uses the standard basketball efficiency formula
      stats.eff = calculateEfficiency(stats);

      // Get actual playing time from player data (tracked in real-time during match)
      const key = `${stats.team}-${stats.playerNumber}`;
      const playingTimeSeconds = playerPlayingTimeMap.get(key) || 0;

      // Format playing time as MM:SS
      stats.min = formatPlayingTime(playingTimeSeconds);
    });
  }

    // STEP 4: Calculate +/- for all players in the map
    const allPlayersForPm = (players || [])
      .filter((p) => {
        const num = p.num || p.player_number;
        return num && num !== 9999 && num !== -1;
      })
      .map((p) => ({
        player_number: p.num || p.player_number,
        team: p.team as "MyTeam" | "Opponent",
        is_starter: !p.isSubstitute,
      }));

    const pmMap = calculatePlusMinus(actions || [], allPlayersForPm);

    playerStatsMap.forEach((stats, key) => {
      stats.pm = match.has_sub_tracking ? (pmMap.get(key) ?? null) : null;
    });

    // Convert map to array and sort by points (default sort)
    const playersList = Array.from(playerStatsMap.values()).sort(
      (a, b) => b.pts - a.pts
    );

    return playersList;
  };

  // ========================================
  // MEMO - SORTED STATISTICS
  // ========================================
  // Calculate and sort statistics according to active filters
  const stats = useMemo(() => {
    const calculatedStats = calculateStats(activeTeamFilter);

    // Apply sorting on selected column
    return calculatedStats.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // Special case for "min" - convert "MM:SS" to seconds for proper sorting
      if (sortBy === "min" && typeof aValue === "string" && typeof bValue === "string") {
        const aSeconds = aValue.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
        const bSeconds = bValue.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
        return sortOrder === "desc" ? bSeconds - aSeconds : aSeconds - bSeconds;
      }

      // Numeric sort (for pts, reb, ast, etc.)
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      }

      // Alphabetical sort (for name)
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "desc"
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      return 0;
    });
  }, [actions, activeTeamFilter, playerNamesMap, sortBy, sortOrder]);

  // ========================================
  // THEME COLORS
  // ========================================
  const bgColor = colors.background;
  const surfaceColor = colors.surface;
  const borderColor = colors.border;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  // Determine if our team won
  const isWin = match.my_team_score > match.opponent_score;

  // ========================================
  // HANDLER - COLUMN SORTING
  // ========================================
  /**
   * Handle click on column header to sort statistics
   * - If clicking on same column: reverse order (asc ↔ desc)
   * - If clicking on new column: default to descending sort
   */
  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      // Reverse order if clicking on same column
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      // New column: default to descending sort
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // ========================================
  // COURT CONFIGURATION
  // ========================================
  // Court colors and logo (from club or default values)
  const courtBackgroundColor = club?.courtBackgroundColor || colors.court.background;
  const courtLineColor = club?.courtLineColor || colors.court.line;
  const logoUri = useSignedUrl(club?.logoUrl);

  // Sponsors — parsed once from SQLite/Supabase snapshot (works offline)
  const matchSponsors = useMemo<MatchSponsor[]>(
    () => parseMatchSponsors(match.match_sponsors),
    [match.match_sponsors],
  );

  const sponsorUris = useMemo(
    () => getSponsorUris(matchSponsors, courtBackgroundColor, isDark),
    [matchSponsors, courtBackgroundColor, isDark],
  );

  // ========================================
  // LOADING SCREEN
  // ========================================
  // Display loading indicator while data is being loaded
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 16 }}>
          Chargement des données du match...
        </Text>
      </SafeAreaView>
    );
  }

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* PLAYER DETAIL MODAL */}
      <PlayerDetailModal
        player={viewPlayer}
        onClose={() => setViewPlayer(null)}
        myTeamName={match.my_team_name || "Notre équipe"}
        opponentName={match.opponent_name}
        actions={actions}
        club={club}
        matchDate={match.created_at ? new Date(match.created_at) : undefined}
        matchSponsors={matchSponsors}
      />

      {/* PDF EXPORT LOADER MODAL */}
      <Modal visible={isExportingPDF} transparent animationType="fade">
        <View style={styles.pdfLoaderOverlay}>
          <View style={[styles.pdfLoaderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.pdfLoaderText, { color: colors.text.primary }]}>
              Génération du PDF…
            </Text>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: surfaceColor,
            borderBottomColor: borderColor,
            padding: sp.md,
          },
        ]}
      >
        <View style={[styles.headerTop, { marginBottom: sp.md }]}>
          {!fromLiveMatch ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <View style={styles.backButtonContent}>
                <Ionicons
                  name="arrow-back"
                  size={sizes.iconMd}
                  color={colors.text.secondary}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View />
          )}
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={handleExportPDF}
              style={[
                styles.menuButton,
                {
                  backgroundColor: bgColor,
                  marginRight: sp.sm,
                  paddingVertical: sp.xs,
                  paddingHorizontal: sp.sm,
                  borderRadius: sp.sm,
                },
              ]}
            >
              <Ionicons name="document-text-outline" size={font.md} color={colors.primary} />
              <Text style={[styles.menuButtonText, { color: colors.primary, fontSize: font.xs }]}>
                PDF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Dashboard" as never)}
              style={[
                styles.menuButton,
                {
                  backgroundColor: bgColor,
                  paddingVertical: sp.xs,
                  paddingHorizontal: sp.sm,
                  borderRadius: sp.sm,
                },
              ]}
            >
              <Ionicons name="grid-outline" size={font.md} color={colors.primary} />
              <Text style={[styles.menuButtonText, { color: colors.primary, fontSize: font.xs }]}>
                Menu
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.scoreContainer}>
          {/* LEFT SIDE - My team when home, opponent when away */}
          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: textSecondary, fontSize: font.sm }]}>
              {match.is_home ? (match.my_team_name || "Notre équipe") : match.opponent_name}
            </Text>
            <Text
              style={[
                styles.scoreValue,
                {
                  color: match.is_home ? (isWin ? textPrimary : textTertiary) : (!isWin ? textPrimary : textTertiary),
                  fontSize: font.xxxl,
                },
              ]}
            >
              {match.is_home ? match.my_team_score : match.opponent_score}
            </Text>
            {match.is_home ? (
              isWin && (
                <Ionicons
                  name="trophy-outline"
                  size={sizes.iconMd}
                  color={colors.primary}
                />
              )
            ) : (
              !isWin && (
                <Ionicons
                  name="trophy-outline"
                  size={sizes.iconMd}
                  color={colors.primary}
                />
              )
            )}
          </View>

          <View
            style={[styles.scoreDivider, { backgroundColor: borderColor }]}
          />

          {/* RIGHT SIDE - Opponent when home, my team when away */}
          <View style={styles.teamScore}>
            <Text style={[styles.teamLabel, { color: textSecondary, fontSize: font.sm }]}>
              {match.is_home ? match.opponent_name : (match.my_team_name || "Notre équipe")}
            </Text>
            <Text
              style={[
                styles.scoreValue,
                {
                  color: match.is_home ? (!isWin ? textPrimary : textTertiary) : (isWin ? textPrimary : textTertiary),
                  fontSize: font.xxxl,
                },
              ]}
            >
              {match.is_home ? match.opponent_score : match.my_team_score}
            </Text>
            {match.is_home ? (
              !isWin && (
                <Ionicons
                  name="trophy-outline"
                  size={sizes.iconMd}
                  color={colors.primary}
                />
              )
            ) : (
              isWin && (
                <Ionicons
                  name="trophy-outline"
                  size={sizes.iconMd}
                  color={colors.primary}
                />
              )
            )}
          </View>
        </View>
      </View>

      {/* FILTERS & TABS */}
      <View style={[styles.filtersTabsContainer, { backgroundColor: bgColor, padding: sp.md, gap: sp.sm }]}>
        <View style={styles.leftSection}>
          {activeTab !== TAB.EVOLUTION && (
            <View
              style={[
                styles.teamFilterContainer,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: sp.sm,
                  padding: sp.xs,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setActiveTeamFilter(Team.MY_TEAM)}
                style={[
                  styles.teamFilterButton,
                  {
                    paddingHorizontal: sp.md,
                    paddingVertical: sp.xs,
                    borderRadius: sp.xs,
                  },
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
                          ? colors.primary
                          : textSecondary,
                      fontSize: font.xs,
                    },
                  ]}
                >
                  {match.my_team_name || "Mon équipe"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTeamFilter(Team.OPPONENT)}
                style={[
                  styles.teamFilterButton,
                  {
                    paddingHorizontal: sp.md,
                    paddingVertical: sp.xs,
                    borderRadius: sp.xs,
                  },
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
                          ? colors.primary
                          : textSecondary,
                      fontSize: font.xs,
                    },
                  ]}
                >
                  {match.opponent_name || "Adversaire"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.tabsContainer, { gap: sp.xs }]}>
        <TouchableOpacity
            onPress={() => setActiveTab(TAB.EVOLUTION)}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === TAB.EVOLUTION ? colors.primary : surfaceColor,
                borderColor: borderColor,
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="trending-up"
              size={sizes.iconSm}
              color={activeTab === TAB.EVOLUTION ? colors.text.primary : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB.STATS)}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === TAB.STATS ? colors.primary : surfaceColor,
                borderColor: borderColor,
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="list"
              size={sizes.iconSm}
              color={activeTab === TAB.STATS ? colors.text.primary : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB.CARDS)}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === TAB.CARDS ? colors.primary : surfaceColor,
                borderColor: borderColor,
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={sizes.iconSm}
              color={activeTab === TAB.CARDS ? colors.text.primary : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB.COURT)}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === TAB.COURT ? colors.primary : surfaceColor,
                borderColor: borderColor,
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="basketball-outline"
              size={sizes.iconSm}
              color={activeTab === TAB.COURT ? colors.text.primary : textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab(TAB.TIMELINE)}
            style={[
              styles.tabButton,
              {
                backgroundColor:
                  activeTab === TAB.TIMELINE ? colors.primary : surfaceColor,
                borderColor: borderColor,
                width: sizes.avatarSm,
                height: sizes.avatarSm,
                borderRadius: sp.sm,
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={sizes.iconSm}
              color={activeTab === TAB.TIMELINE ? colors.text.primary : textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* TIMELINE — gère son propre scroll avec header sticky */}
      {activeTab === TAB.TIMELINE && (
        <TimelineTab
          actions={actions}
          match={match}
          playerNamesMap={playerNamesMap}
        />
      )}

      {/* CONTENT (tous les autres onglets) */}
      {activeTab !== TAB.TIMELINE && (
      <ScrollView style={[styles.content, { padding: sp.md }]} showsVerticalScrollIndicator={false}>

          {/* EVOLUTION VIEW */}
          {activeTab === TAB.EVOLUTION && (
          <EvolutionTab
            match={match}
            actions={actions}
            colors={colors}
          />
        )}

        {/* TABLE VIEW */}
        {activeTab === TAB.STATS && (
          <StatsTab
            stats={stats}
            sortBy={sortBy}
            sortOrder={sortOrder}
            handleSort={handleSort}
            setViewPlayer={setViewPlayer}
            handicap={activeTeamFilter === Team.MY_TEAM ? (match.my_team_handicap || 0) : (match.opponent_handicap || 0)}
            teamRebounds={(actions || []).filter((a) => {
              const num = a.player_number ?? a.player;
              const type = (a.action_type || a.type || "").toUpperCase();
              return a.team === activeTeamFilter && num === -1 && type === "REBOUND";
            }).length}
          />
        )}

        {/* CARDS VIEW */}
        {activeTab === TAB.CARDS && (
          <CardsTab
            stats={stats}
            sortBy={sortBy}
            sortOrder={sortOrder}
            handleSort={handleSort}
            setViewPlayer={setViewPlayer}
          />
        )}

        {/* COURT VIEW */}
        {activeTab === TAB.COURT && (
          <CourtTab
            stats={stats}
            actions={actions}
            selectedActionTypes={selectedActionTypes}
            setSelectedActionTypes={setSelectedActionTypes}
            selectedSpecifications={selectedSpecifications}
            setSelectedSpecifications={setSelectedSpecifications}
            selectedPlayers={selectedPlayers}
            setSelectedPlayers={setSelectedPlayers}
            courtBackgroundColor={courtBackgroundColor}
            courtLineColor={courtLineColor}
            logoUri={logoUri}
            activeTeamFilter={activeTeamFilter}
            totalPeriods={match.total_periods || 4}
            sponsorUris={sponsorUris}
          />
        )}

      </ScrollView>
      )}
    </SafeAreaView>
  );
}

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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 15,
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
  leftSection: {
    flex: 1,
  },
  teamFilterContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
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
  cardsSortSection: {
    marginBottom: 16,
    paddingVertical: 8,
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

  // Empty State
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
  },

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
  pdfLoaderOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  pdfLoaderBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pdfLoaderText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
