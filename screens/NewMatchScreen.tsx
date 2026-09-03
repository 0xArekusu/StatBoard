/**
 * New Match Screen
 *
 * Two-step flow for creating a new match:
 * - Step 1: Match configuration (team, opponent, format, location)
 * - Step 2: Roster selection (home team and opponent players)
 */

import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, TouchableWithoutFeedback, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../src/contexts/ThemeContext";
import { useResponsive } from "../src/hooks/useResponsive";
import { useAuth } from "../src/contexts/AuthContext";
import { useClub } from "../src/contexts/ClubContext";
import { DEFAULT_COURT_COLORS, DEFAULT_CLUB_COLORS } from "../src/theme";
import { getSignedUrl } from "../utils/storageHelper";
import {
  ROSTER_LIMITS,
  DEFAULT_OPPONENT_PLAYERS_COUNT,
  getDefaultOpponentPlayerName,
  DEFAULT_MATCH_PRESET,
  type MatchCreationStep,
  ROUTES,
  PlatformOS,
  GUEST_IDS,
  ANALYTICS_EVENTS,
} from "../constants";
import { usePostHog } from "posthog-react-native";
import { useInterstitialAd } from "../hooks/useInterstitialAd";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { Team, TeamStatus } from "../models/Team";
import { Player } from "../models/Player";
import { SUBSCRIPTION_TIER } from "../models/Subscription";
import {
  MatchHeader,
  TeamSelector,
  OpponentInput,
  MatchFormatSelector,
  LocationSelector,
  OpponentStatsToggle,
  HandicapSelector,
  RosterTabSwitch,
  HomeRosterView,
  AddPlayerForm,
  OpponentRosterView,
  AddOpponentForm,
  MatchFooter,
} from "../components/NewMatch";
import { RootStackParamList, RootNavigationProp } from "../types/navigation";
import { showErrorAlert } from "../utils/errorAlert";
import { OpponentTemplateRepository, OpponentTemplate } from "../src/services/database/OpponentTemplateRepository";

type NewMatchRouteProp = RouteProp<RootStackParamList, "NewMatch">;
type RosterTab = "HOME" | "AWAY";

/**
 * New Match Screen Component
 *
 * Handles the creation of a new match with a two-step process.
 * Manages team selection, match configuration, and roster setup.
 */
export default function NewMatchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<NewMatchRouteProp>();
  const { colors, isDark } = useTheme();
  const { sp } = useResponsive();
  const { user } = useAuth();
  const posthog = usePostHog();
  const { currentClub } = useClub();
  const { showIfReady: showInterstitial } = useInterstitialAd();

  // ===========================
  // STATE
  // ===========================

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<MatchCreationStep>(1);

  // Step 1: General Info
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [myTeamName, setMyTeamName] = useState(""); // For guest users
  const [opponent, setOpponent] = useState("");
  const [isHome, setIsHome] = useState(true);
  const [trackOpponentStats, setTrackOpponentStats] = useState(false);

  // Match Format Settings
  const [periodCount, setPeriodCount] = useState<number>(DEFAULT_MATCH_PRESET.totalPeriods);
  const [periodDuration, setPeriodDuration] = useState<number>(DEFAULT_MATCH_PRESET.periodDuration);

  // Handicap
  const [showHandicap, setShowHandicap] = useState(false);
  const [myTeamHandicap, setMyTeamHandicap] = useState(0);
  const [opponentHandicap, setOpponentHandicap] = useState(0);

  const handleHandicapToggle = () => {
    if (showHandicap) {
      setMyTeamHandicap(0);
      setOpponentHandicap(0);
    }
    setShowHandicap(!showHandicap);
  };

  // Step 2: Rosters
  const [rosterTab, setRosterTab] = useState<RosterTab>("HOME");
  const [bottomBarHeight, setBottomBarHeight] = useState(120);

  // My Team Management
  const [availableHomePlayers, setAvailableHomePlayers] = useState<Player[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Player[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [tempHomePlayerName, setTempHomePlayerName] = useState("");
  const [tempHomePlayerNumber, setTempHomePlayerNumber] = useState("");
  const [tempHomePlayerLicense, setTempHomePlayerLicense] = useState("");
  const [playerNumberErrors, setPlayerNumberErrors] = useState<Set<string>>(new Set());

  // Opponent Management
  const [opponentRoster, setOpponentRoster] = useState<Player[]>([]);
  const [opponentStarters, setOpponentStarters] = useState<string[]>([]);
  const [newOppPlayerName, setNewOppPlayerName] = useState("");
  const [newOppPlayerNumber, setNewOppPlayerNumber] = useState("");
  const [newOppPlayerLicense, setNewOppPlayerLicense] = useState("");

  // Opponent Templates
  const [savedTemplates, setSavedTemplates] = useState<OpponentTemplate[]>([]);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ===========================
  // EFFECTS
  // ===========================

  /**
   * Load teams when current club changes
   */
  useEffect(() => {
    loadClubData();
  }, [currentClub?.id]);

  /**
   * Load saved opponent templates on mount
   */
  useEffect(() => {
    loadTemplates();
  }, []);

  /**
   * Auto-create default opponent players when stats tracking is enabled
   */
  useEffect(() => {
    if (trackOpponentStats && opponentRoster.length === 0) {
      const defaultOpponents: Player[] = [];
      const now = new Date();
      for (let i = 1; i <= DEFAULT_OPPONENT_PLAYERS_COUNT; i++) {
        defaultOpponents.push({
          id: `opp-${Date.now()}-${i}`,
          name: getDefaultOpponentPlayerName(i),
          jerseyNumber: i,
          teamId: "opponent",
          createdAt: now,
          updatedAt: now,
        });
      }
      setOpponentRoster(defaultOpponents);
      setOpponentStarters(defaultOpponents.map((p) => p.id));
    } else if (!trackOpponentStats) {
      setOpponentRoster([]);
      setOpponentStarters([]);
      setLoadedTemplateName(null);
    }
  }, [trackOpponentStats]);

  /**
   * Set default team when current club and teams load
   * Use teamId from route params if provided, otherwise use first team
   */
  useEffect(() => {
    if (currentClub && teams.length > 0) {
      const teamIdFromRoute = route.params?.teamId;
      if (teamIdFromRoute && teams.some(t => t.id === teamIdFromRoute)) {
        setSelectedTeamId(teamIdFromRoute);
      } else {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [currentClub, teams, route.params?.teamId]);

  /**
   * Load roster when team changes
   */
  useEffect(() => {
    // Skip loading roster for guest users (they create players manually)
    if (!user) {
      return;
    }

    if (currentClub && selectedTeamId && teams.length > 0) {
      const team = teams.find((t) => t.id === selectedTeamId);
      if (team) {
        loadTeamRoster(team.id);
      }
    }
  }, [selectedTeamId, currentClub, teams, user]);

  // ===========================
  // DATA LOADING
  // ===========================

  const loadTemplates = async () => {
    try {
      const repo = new OpponentTemplateRepository();
      setSavedTemplates(await repo.getAll());
    } catch (error) {
      console.error("Error loading opponent templates:", error);
    }
  };

  const applyTemplate = (template: OpponentTemplate) => {
    const now = new Date();
    const players: Player[] = template.players.map((p, i) => ({
      id: `opp-${Date.now()}-${i}`,
      name: p.name,
      jerseyNumber: p.number,
      teamId: "",
      licenseNumber: p.licenseNumber,
      createdAt: now,
      updatedAt: now,
    }));
    setOpponentRoster(players);
    setOpponentStarters(
      players.filter((_, i) => template.players[i].isStarter).map(p => p.id)
    );
    setLoadedTemplateName(template.name);
  };

  const handleLoadTemplate = (template: OpponentTemplate) => {
    if (opponentRoster.length > 0) {
      Alert.alert(
        t("newMatchScreen.alerts.loadTemplateTitle"),
        t("newMatchScreen.alerts.loadTemplateMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.continue"), onPress: () => applyTemplate(template) },
        ]
      );
    } else {
      applyTemplate(template);
    }
  };

  const handleSaveTemplate = async (name: string) => {
    try {
      const repo = new OpponentTemplateRepository();
      const templatePlayers = opponentRoster.map(p => ({
        number: p.jerseyNumber,
        name: p.name,
        isStarter: opponentStarters.includes(p.id),
        licenseNumber: p.licenseNumber,
      }));
      await repo.upsertByName(name, templatePlayers);
      await loadTemplates();
      setLoadedTemplateName(name);
      posthog?.capture(ANALYTICS_EVENTS.OPPONENT_TEMPLATE_SAVED, { players_count: templatePlayers.length });
      Alert.alert(t("newMatchScreen.alerts.templateSavedTitle"), t("newMatchScreen.alerts.templateSavedMessage", { name }));
    } catch (error) {
      console.error("Error saving opponent template:", error);
    }
  };

  /**
   * Load teams for current club
   */
  const loadClubData = async () => {
    if (!user) {
      // Guest mode: create temporary local team
      const guestTeam: Team = {
        id: GUEST_IDS.TEAM,
        name: t("newMatchScreen.myTeamFallback"),
        clubId: GUEST_IDS.CLUB,
        ownerId: "guest",
        status: TeamStatus.APPROVED,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create 5 default players for guests
      const now = new Date();
      const defaultPlayers: Player[] = Array.from({ length: 5 }).map((_, i) => ({
        id: `guest-player-${i + 1}`,
        name: `Joueur ${i + 1}`,
        jerseyNumber: i + 1,
        teamId: GUEST_IDS.TEAM,
        createdAt: now,
        updatedAt: now,
      }));

      setTeams([guestTeam]);
      setSelectedTeamId(GUEST_IDS.TEAM);
      setMyTeamName(t("newMatchScreen.myTeamFallback")); // Default team name for guests

      // Set default players as available and selected
      setAvailableHomePlayers(defaultPlayers);
      setSelectedHomePlayers(defaultPlayers);
      setStarters(defaultPlayers.map((p) => p.id)); // All 5 as starters

      setLoading(false);
      return;
    }

    // Use current club from context
    if (!currentClub) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const teamService = ServiceFactory.getTeamService(supabase);
      const clubTeams = await teamService.getClubTeams(currentClub.id);

      // Check if the team from route params exists but is suspended
      const teamIdFromRoute = route.params?.teamId;
      if (teamIdFromRoute) {
        const requestedTeam = clubTeams.find(
          (team) => team.id === teamIdFromRoute && team.ownerId === user.id
        );

        if (requestedTeam && (!requestedTeam.isActive || requestedTeam.status !== TeamStatus.APPROVED)) {
          Alert.alert(
            t("newMatchScreen.alerts.teamSuspendedTitle"),
            t("newMatchScreen.alerts.teamSuspendedMessage"),
            [
              {
                text: t("common.ok"),
                onPress: () => navigation.goBack(),
              },
            ]
          );
          setLoading(false);
          return;
        }
      }

      // Filter to only show approved and active teams where user is the owner
      const myApprovedTeams = clubTeams.filter(
        (team) =>
          team.ownerId === user.id &&
          team.status === TeamStatus.APPROVED &&
          team.isActive &&
          !team.isDeleted
      );
      setTeams(myApprovedTeams);

      // Alert user if they have no active teams
      if (myApprovedTeams.length === 0) {
        const allTeams = clubTeams.filter((team) => team.ownerId === user.id);
        if (allTeams.length > 0) {
          Alert.alert(
            t("newMatchScreen.alerts.noActiveTeamTitle"),
            t("newMatchScreen.alerts.noActiveTeamMessage"),
            [
              {
                text: t("common.ok"),
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error loading teams:", error);
      showErrorAlert({
        messageKey: "newMatchScreen.errors.loadTeamsFailed",
        error,
        context: "NewMatchScreen",
        showRetry: true,
        onRetry: () => loadClubData(),
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load roster for a specific team
   */
  const loadTeamRoster = async (teamId: string) => {
    // Skip for guest users
    if (!user || teamId === GUEST_IDS.TEAM) {
      return;
    }

    try {
      const playerService = ServiceFactory.getPlayerService(supabase);
      const roster = await playerService.getTeamPlayers(teamId);
      setAvailableHomePlayers(roster);
      setSelectedHomePlayers(roster); // Select all by default
      // Auto-select first 5 as starters if available
      setStarters(roster.slice(0, ROSTER_LIMITS.STARTERS).map((p) => p.id));
    } catch (error) {
      console.error("Error loading team roster:", error);
      showErrorAlert({
        messageKey: "newMatchScreen.errors.loadRosterFailed",
        error,
        context: "NewMatchScreen",
        showRetry: true,
        onRetry: () => loadTeamRoster(teamId),
      });
    }
  };

  // ===========================
  // HANDLERS: STEP 1
  // ===========================

  /**
   * Navigate to Step 2 if validation passes
   */
  const handleNextStep = () => {
    if (!opponent) {
      Alert.alert(t("common.error"), t("newMatchScreen.validation.noOpponent"));
      return;
    }
    // For guest users, validate team name instead of selectedTeamId
    if (!user && !myTeamName) {
      Alert.alert(t("common.error"), t("newMatchScreen.validation.noTeamName"));
      return;
    }
    if (user && !selectedTeamId) {
      Alert.alert(t("common.error"), t("newMatchScreen.validation.noTeam"));
      return;
    }

    setStep(2);
  };

  /**
   * Handle back/close button in header
   */
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  // ===========================
  // HANDLERS: STEP 2 (HOME TEAM)
  // ===========================

  /**
   * Toggle player selection in roster
   */
  const toggleHomePlayer = (player: Player) => {
    const isSelected = selectedHomePlayers.some((p) => p.id === player.id);

    if (isSelected) {
      // Remove from roster AND starters
      setSelectedHomePlayers(
        selectedHomePlayers.filter((p) => p.id !== player.id)
      );
      setStarters(starters.filter((id) => id !== player.id));
    } else {
      // Check for duplicate jersey number before re-selecting
      const conflict = selectedHomePlayers.find(
        (p) => p.jerseyNumber === player.jerseyNumber
      );
      if (conflict) {
        Alert.alert(
          t("newMatchScreen.alerts.duplicateNumberTitle"),
          t("newMatchScreen.alerts.duplicateNumberMessage", {
            playerName: player.name,
            number: player.jerseyNumber,
            conflictName: conflict.name,
          })
        );
        return;
      }
      setSelectedHomePlayers([...selectedHomePlayers, player]);
    }
  };

  /**
   * Toggle starter status for a player
   */
  const toggleStarter = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter((id) => id !== playerId));
    } else {
      if (starters.length >= ROSTER_LIMITS.STARTERS) {
        Alert.alert(t("newMatchScreen.alerts.lineupFullTitle"), t("newMatchScreen.validation.startersFull"));
        return;
      }
      setStarters([...starters, playerId]);
    }
  };

  /**
   * Update player jersey number
   */
  const handlePlayerNumberChange = (playerId: string, newNumber: number) => {
    // Update in both available and selected player lists
    setAvailableHomePlayers(prev =>
      prev.map(p => p.id === playerId ? { ...p, jerseyNumber: newNumber } : p)
    );
    setSelectedHomePlayers(prev =>
      prev.map(p => p.id === playerId ? { ...p, jerseyNumber: newNumber } : p)
    );
  };

  /**
   * Handle player number error state changes
   */
  const handlePlayerNumberError = (playerId: string, hasError: boolean) => {
    setPlayerNumberErrors(prev => {
      const newErrors = new Set(prev);
      if (hasError) {
        newErrors.add(playerId);
      } else {
        newErrors.delete(playerId);
      }
      return newErrors;
    });
  };

  /**
   * Add temporary player (reinforcement) to home roster
   */
  const addTempHomePlayer = () => {
    if (!tempHomePlayerName || !tempHomePlayerNumber) return;

    const now = new Date();
    const newPlayer: Player = {
      id: `temp-${Date.now()}`,
      name: tempHomePlayerName,
      jerseyNumber: parseInt(tempHomePlayerNumber, 10),
      teamId: selectedTeamId,
      licenseNumber: tempHomePlayerLicense.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    // Add to both lists so it appears as selectable and selected
    setAvailableHomePlayers([...availableHomePlayers, newPlayer]);
    setSelectedHomePlayers([...selectedHomePlayers, newPlayer]);

    // Auto add to starter if space
    if (starters.length < ROSTER_LIMITS.STARTERS) {
      setStarters([...starters, newPlayer.id]);
    }

    setTempHomePlayerName("");
    setTempHomePlayerNumber("");
    setTempHomePlayerLicense("");
    posthog?.capture(ANALYTICS_EVENTS.REINFORCEMENT_ADDED);
  };

  // ===========================
  // HANDLERS: STEP 2 (OPPONENT)
  // ===========================

  /**
   * Add opponent player
   */
  const addOpponentPlayer = () => {
    if (!newOppPlayerNumber) return;

    const now = new Date();
    const newPlayer: Player = {
      id: `opp-${Date.now()}`,
      name: newOppPlayerName || getDefaultOpponentPlayerName(parseInt(newOppPlayerNumber, 10)),
      jerseyNumber: parseInt(newOppPlayerNumber, 10),
      teamId: "",
      licenseNumber: newOppPlayerLicense.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    setOpponentRoster([...opponentRoster, newPlayer]);
    setNewOppPlayerName("");
    setNewOppPlayerNumber("");
    setNewOppPlayerLicense("");
  };

  /**
   * Generate multiple opponent players quickly
   */
  const generateOpponentRoster = (count: number) => {
    const now = new Date();
    const generated: Player[] = Array.from({ length: count }).map((_, i) => ({
      id: `opp-gen-${Date.now()}-${i}`,
      name: getDefaultOpponentPlayerName(i + 4),
      jerseyNumber: i + 4,
      teamId: "",
      createdAt: now,
      updatedAt: now,
    }));
    setOpponentRoster([...opponentRoster, ...generated]);
  };

  /**
   * Remove opponent player from roster
   */
  const removeOpponentPlayer = (id: string) => {
    setOpponentRoster(opponentRoster.filter((p) => p.id !== id));
    setOpponentStarters(opponentStarters.filter((starterId) => starterId !== id));
  };

  /**
   * Toggle opponent starter status
   */
  const toggleOpponentStarter = (playerId: string) => {
    if (opponentStarters.includes(playerId)) {
      setOpponentStarters(opponentStarters.filter((id) => id !== playerId));
    } else {
      if (opponentStarters.length >= ROSTER_LIMITS.STARTERS) {
        Alert.alert(t("newMatchScreen.alerts.lineupFullTitle"), t("newMatchScreen.validation.startersFull"));
        return;
      }
      setOpponentStarters([...opponentStarters, playerId]);
    }
  };

  // ===========================
  // START MATCH
  // ===========================

  /**
   * Validate rosters then show confirmation modal
   */
  const handleStart = () => {
    // Validate home team
    if (selectedHomePlayers.length < ROSTER_LIMITS.MIN_PLAYERS) {
      Alert.alert(t("common.error"), t("newMatchScreen.validation.minPlayers"));
      return;
    }

    // Check for duplicate jersey numbers in home team
    const homeNumbers = selectedHomePlayers.map(p => p.jerseyNumber);
    const homeDuplicates = homeNumbers.filter((num, index) => homeNumbers.indexOf(num) !== index);
    if (homeDuplicates.length > 0) {
      Alert.alert(
        t("common.error"),
        t("newMatchScreen.validation.duplicateHomeNumbers", { numbers: [...new Set(homeDuplicates)].join(", ") })
      );
      return;
    }

    const requiredStarters = Math.min(ROSTER_LIMITS.STARTERS, selectedHomePlayers.length);
    if (starters.length !== requiredStarters) {
      Alert.alert(
        t("common.error"),
        t("newMatchScreen.validation.startersRequired", { count: requiredStarters })
      );
      return;
    }

    // Validate opponent roster if tracking stats
    if (trackOpponentStats) {
      if (opponentRoster.length < ROSTER_LIMITS.STARTERS) {
        Alert.alert(t("common.error"), t("newMatchScreen.validation.opponentMinPlayers"));
        return;
      }

      // Check for duplicate jersey numbers in opponent team
      const opponentNumbers = opponentRoster.map(p => p.jerseyNumber);
      const opponentDuplicates = opponentNumbers.filter((num, index) => opponentNumbers.indexOf(num) !== index);
      if (opponentDuplicates.length > 0) {
        Alert.alert(
          t("common.error"),
          t("newMatchScreen.validation.duplicateOpponentNumbers", { numbers: [...new Set(opponentDuplicates)].join(", ") })
        );
        return;
      }

      if (opponentStarters.length !== ROSTER_LIMITS.STARTERS) {
        Alert.alert(t("common.error"), t("newMatchScreen.validation.opponentStartersRequired"));
        return;
      }
    }

    setShowConfirmModal(true);
  };

  /**
   * Start match after confirmation
   */
  const handleConfirmStart = async () => {
    setShowConfirmModal(false);

    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    // Get club (from context for authenticated users, or create guest club)
    const club = user && currentClub ? currentClub : {
      id: GUEST_IDS.CLUB,
      name: t("newMatchScreen.localClubFallback"),
      acronym: "CL",
      code: "guest",
      ownerId: "guest",
      ownerEmail: "guest@local.com",
      subscriptionTier: SUBSCRIPTION_TIER.FREE,
      createdAt: new Date(),
      updatedAt: new Date(),
      logoUrl: undefined,
      primaryColor: DEFAULT_CLUB_COLORS.primary,
      secondaryColor: DEFAULT_CLUB_COLORS.secondary,
      courtBackgroundColor: DEFAULT_COURT_COLORS.background,
      courtLineColor: DEFAULT_COURT_COLORS.line,
    };

    // Validate club exists
    if (!club || !club.id) {
      Alert.alert(t("common.error"), t("newMatchScreen.validation.noClub"));
      return;
    }

    // For guest users, update the team name with the user-provided value
    const finalTeamName = !user ? myTeamName : team.name;

    console.log("📋 [NewMatchScreen] Starting match with club:", {
      clubId: club.id,
      clubName: club.name,
      teamId: team.id,
      teamName: finalTeamName,
      isGuest: !user,
    });

    // Serialize players (convert Date objects to strings for React Navigation)
    const serializePlayers = (players: Player[]) =>
      players.map((p) => ({
        ...p,
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : p.updatedAt?.toISOString?.() || new Date().toISOString(),
      }));

    // Create match object
    // created_at is set NOW when user clicks "Start Match" (coup d'envoi)
    const createdAt = new Date().toISOString();

    // Generate signed URL for club logo if online (2h expiration)
    let clubLogoUrl: string | null = null;
    if (club?.logoUrl) {
      clubLogoUrl = await getSignedUrl(supabase, club.logoUrl);
    }

    const matchData = {
      id: Date.now().toString(),
      clubId: club.id,
      teamId: team.id,
      opponent,
      isHome, // Use boolean instead of "HOME"/"AWAY" string
      trackOpponentStats,
      periodCount,
      periodDuration,
      myTeamPlayers: serializePlayers(selectedHomePlayers), // MY_TEAM roster (regardless of home/away)
      starters,
      opponentPlayers: trackOpponentStats ? serializePlayers(opponentRoster) : [], // OPPONENT roster (regardless of home/away)
      opponentStarters: trackOpponentStats ? opponentStarters : [],
      teamName: finalTeamName,
      clubLogoUrl, // Signed URL (valid 2h) or null if offline/error
      courtBackgroundColor: club?.courtBackgroundColor || DEFAULT_COURT_COLORS.background,
      courtLineColor: club?.courtLineColor || DEFAULT_COURT_COLORS.line,
      createdAt, // Timestamp when user configured match and clicked "Start Match"
      myTeamHandicap,
      opponentHandicap,
    };

    posthog?.capture(ANALYTICS_EVENTS.MATCH_SETUP_STARTED, {
      team_name: finalTeamName,
      opponent_name: opponent,
      is_home: isHome,
      track_opponent_stats: trackOpponentStats,
      period_count: periodCount,
      period_duration: periodDuration,
      my_team_players_count: selectedHomePlayers.length,
      my_team_starters_count: starters.length,
      opponent_players_count: trackOpponentStats ? opponentRoster.length : 0,
      opponent_starters_count: trackOpponentStats ? opponentStarters.length : 0,
      my_team_handicap: myTeamHandicap,
      opponent_handicap: opponentHandicap,
      is_guest: !user,
    });

    // Show interstitial ad at the natural transition point (roster → live match)
    await showInterstitial();

    // Navigate to LiveMatch screen
    console.log("🚀 [NewMatchScreen] Navigating with matchData:", JSON.stringify({
      clubId: matchData.clubId,
      teamId: matchData.teamId,
      opponent: matchData.opponent,
      isHome: matchData.isHome,
      periodCount: matchData.periodCount,
    }));
    navigation.navigate(ROUTES.LIVE_MATCH, { matchData });
  };

  // ===========================
  // THEME COLORS
  // ===========================

  const themeColors = {
    surfaceColor: colors.surface,
    textPrimary: colors.text.primary,
    textSecondary: colors.text.secondary,
    borderColor: colors.border,
  };

  // ===========================
  // LOADING STATE
  // ===========================

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ===========================
  // RENDER
  // ===========================

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;
  const isStep1Valid = opponent && (user ? selectedTeamId : myTeamName);

  const myName = !user ? myTeamName : (teams.find(t => t.id === selectedTeamId)?.name || t("newMatchScreen.myTeamFallback"));
  const today = new Date().toISOString().split("T")[0];
  const opponentFallback = opponent || t("newMatchScreen.opponentFallback");
  const defaultTemplateName = isHome
    ? `${myName}_${opponentFallback}_${today}`
    : `${opponentFallback}_${myName}_${today}`;
  const selectedHomePlayerIds = new Set(selectedHomePlayers.map((p) => p.id));
  const selectedPlayerNumberErrors = [...playerNumberErrors].filter((id) =>
    selectedHomePlayerIds.has(id)
  );
  const isStep2Valid =
    selectedHomePlayers.length >= ROSTER_LIMITS.MIN_PLAYERS &&
    starters.length === Math.min(ROSTER_LIMITS.STARTERS, selectedHomePlayers.length) &&
    selectedPlayerNumberErrors.length === 0 &&
    (!trackOpponentStats || (
      opponentRoster.length >= ROSTER_LIMITS.STARTERS &&
      opponentStarters.length === ROSTER_LIMITS.STARTERS
    ));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Progress Bar */}
      <MatchHeader step={step} onBack={handleBack} />

      {/* STEP 1: CONFIGURATION */}
      {step === 1 && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { padding: sp.md, gap: sp.md }]}
        >
          <TeamSelector
            team={selectedTeam}
            teams={teams}
            myTeamName={myTeamName}
            onMyTeamNameChange={setMyTeamName}
            isGuest={!user}
            colors={themeColors}
          />

          <OpponentInput
            value={opponent}
            onChangeText={setOpponent}
            colors={themeColors}
          />

          <MatchFormatSelector
            periodCount={periodCount}
            periodDuration={periodDuration}
            onPeriodCountChange={setPeriodCount}
            onPeriodDurationChange={setPeriodDuration}
            isDark={isDark}
            colors={themeColors}
          />

          <LocationSelector
            isHome={isHome}
            onLocationChange={setIsHome}
            colors={themeColors}
          />

          <OpponentStatsToggle
            enabled={trackOpponentStats}
            onToggle={() => setTrackOpponentStats(!trackOpponentStats)}
            isDark={isDark}
            colors={themeColors}
          />

          <HandicapSelector
            enabled={showHandicap}
            onToggle={handleHandicapToggle}
            myTeamName={myName}
            opponentName={opponentFallback}
            myTeamHandicap={myTeamHandicap}
            opponentHandicap={opponentHandicap}
            onMyTeamHandicapChange={setMyTeamHandicap}
            onOpponentHandicapChange={setOpponentHandicap}
            isDark={isDark}
            colors={themeColors}
          />
        </ScrollView>
      )}

      {/* Step 1: footer */}
      {step === 1 && (
        <MatchFooter
          step={step}
          enabled={!!isStep1Valid}
          onPress={handleNextStep}
          isDark={isDark}
          colors={themeColors}
        />
      )}

      {/* STEP 2: ROSTERS */}
      {step === 2 && (
        <KeyboardAvoidingView
          style={styles.rosterContainer}
          behavior={Platform.OS === PlatformOS.IOS ? "padding" : "height"}
          keyboardVerticalOffset={80}
        >
          <RosterTabSwitch
            activeTab={rosterTab}
            onTabChange={setRosterTab}
            homeCount={selectedHomePlayers.length}
            opponentCount={opponentRoster.length}
            homeTeamName={myName}
            opponentName={opponentFallback}
            isDark={isDark}
            colors={themeColors}
          />

          <ScrollView
            style={styles.rosterContent}
            contentContainerStyle={[styles.rosterScrollContent, { padding: sp.md }]}
            keyboardShouldPersistTaps="handled"
          >
            {rosterTab === "HOME" ? (
              <HomeRosterView
                availablePlayers={availableHomePlayers}
                selectedPlayers={selectedHomePlayers}
                starters={starters}
                tempPlayerName={tempHomePlayerName}
                tempPlayerNumber={tempHomePlayerNumber}
                tempPlayerLicense={tempHomePlayerLicense}
                onTogglePlayer={toggleHomePlayer}
                onToggleStarter={toggleStarter}
                onTempNameChange={setTempHomePlayerName}
                onTempNumberChange={setTempHomePlayerNumber}
                onTempLicenseChange={setTempHomePlayerLicense}
                onAddTempPlayer={addTempHomePlayer}
                onPlayerNumberChange={handlePlayerNumberChange}
                onNumberError={handlePlayerNumberError}
                hideAddForm
                isDark={isDark}
                colors={themeColors}
              />
            ) : (
              <OpponentRosterView
                trackOpponentStats={trackOpponentStats}
                opponentRoster={opponentRoster}
                opponentStarters={opponentStarters}
                newPlayerName={newOppPlayerName}
                newPlayerNumber={newOppPlayerNumber}
                newPlayerLicense={newOppPlayerLicense}
                onNewNameChange={setNewOppPlayerName}
                onNewNumberChange={setNewOppPlayerNumber}
                onNewLicenseChange={setNewOppPlayerLicense}
                onAddPlayer={addOpponentPlayer}
                onGeneratePlayers={generateOpponentRoster}
                onToggleStarter={toggleOpponentStarter}
                onRemovePlayer={removeOpponentPlayer}
                onGoToStep1={() => setStep(1)}
                savedTemplates={savedTemplates}
                defaultTemplateName={defaultTemplateName}
                loadedTemplateName={loadedTemplateName}
                onLoadTemplate={handleLoadTemplate}
                onSaveTemplate={handleSaveTemplate}
                hideAddForm
                isDark={isDark}
                colors={themeColors}
              />
            )}
          </ScrollView>

          {/* Sticky form + action button — inside KAV so the keyboard pushes it up */}
          <View
            style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}
          >
            {(rosterTab === "HOME" || trackOpponentStats) && (
              <View style={{ paddingHorizontal: sp.md, paddingTop: sp.md, paddingBottom: sp.sm }}>
                {rosterTab === "HOME" ? (
                  <AddPlayerForm
                    name={tempHomePlayerName}
                    number={tempHomePlayerNumber}
                    license={tempHomePlayerLicense}
                    onNameChange={setTempHomePlayerName}
                    onNumberChange={setTempHomePlayerNumber}
                    onLicenseChange={setTempHomePlayerLicense}
                    onAdd={addTempHomePlayer}
                    allPlayers={availableHomePlayers}
                    selectedPlayers={selectedHomePlayers}
                    compact
                    isDark={isDark}
                    colors={themeColors}
                  />
                ) : (
                  <AddOpponentForm
                    playerName={newOppPlayerName}
                    playerNumber={newOppPlayerNumber}
                    playerLicense={newOppPlayerLicense}
                    onNameChange={setNewOppPlayerName}
                    onNumberChange={setNewOppPlayerNumber}
                    onLicenseChange={setNewOppPlayerLicense}
                    onAdd={addOpponentPlayer}
                    existingPlayers={opponentRoster}
                    colors={themeColors}
                  />
                )}
              </View>
            )}
            <MatchFooter
              step={step}
              enabled={!!isStep2Valid}
              onPress={handleStart}
              absolute={false}
              isDark={isDark}
              colors={themeColors}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Confirmation modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowConfirmModal(false)}>
          <View style={confirmStyles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={confirmStyles.wrapper}>
          <View style={[confirmStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="basketball" size={30} color={colors.primary} />
            <Text style={[confirmStyles.label, { color: colors.text.secondary }]}>{t("newMatchScreen.confirmModal.title")}</Text>
            <Text style={[confirmStyles.versus, { color: colors.text.primary }]}>
              {myName}
            </Text>
            <Text style={[confirmStyles.vsLabel, { color: colors.text.tertiary }]}>{t("newMatchScreen.confirmModal.vs")}</Text>
            <Text style={[confirmStyles.versus, { color: colors.text.primary }]}>
              {opponentFallback}
            </Text>
            <Text style={[confirmStyles.format, { color: colors.text.secondary }]}>
              {periodCount === 2 ? t("newMatchScreen.confirmModal.halves") : t("newMatchScreen.confirmModal.quarters", { count: periodCount })} · {periodDuration} min
            </Text>
            <View style={confirmStyles.buttons}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[confirmStyles.btn, confirmStyles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[confirmStyles.btnText, { color: colors.text.secondary }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmStart}
                style={[confirmStyles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={[confirmStyles.btnText, { color: colors.onPrimary }]}>{t("newMatchScreen.confirmModal.start")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===========================
// STYLES
// ===========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  rosterContainer: {
    flex: 1,
  },
  rosterContent: {
    flex: 1,
  },
  rosterScrollContent: {
    padding: 24,
  },
  bottomBar: {
    borderTopWidth: 1,
  },
});

const confirmStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 28,
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  versus: {
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  vsLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  format: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
