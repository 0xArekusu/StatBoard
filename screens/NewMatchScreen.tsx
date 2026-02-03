/**
 * New Match Screen
 *
 * Two-step flow for creating a new match:
 * - Step 1: Match configuration (team, opponent, format, location)
 * - Step 2: Roster selection (home team and opponent players)
 */

import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { useClub } from "../src/contexts/ClubContext";
import { DEFAULT_COURT_COLORS, DEFAULT_CLUB_COLORS } from "../src/theme";
import {
  MATCH_VALIDATION_MESSAGES,
  ROSTER_LIMITS,
  DEFAULT_OPPONENT_PLAYERS_COUNT,
  getDefaultOpponentPlayerName,
  DEFAULT_MATCH_PRESET,
  type MatchCreationStep,
  ROUTES,
} from "../constants";
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";
import { Club } from "../models/Club";
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
  RosterTabSwitch,
  HomeRosterView,
  OpponentRosterView,
  MatchFooter,
} from "../components/NewMatch";
import { RootStackParamList, RootNavigationProp } from "../types/navigation";

type NewMatchRouteProp = RouteProp<RootStackParamList, "NewMatch">;
type RosterTab = "HOME" | "AWAY";

/**
 * New Match Screen Component
 *
 * Handles the creation of a new match with a two-step process.
 * Manages team selection, match configuration, and roster setup.
 */
export default function NewMatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<NewMatchRouteProp>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { currentClub } = useClub();

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

  // Step 2: Rosters
  const [rosterTab, setRosterTab] = useState<RosterTab>("HOME");

  // My Team Management
  const [availableHomePlayers, setAvailableHomePlayers] = useState<Player[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Player[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [tempHomePlayerName, setTempHomePlayerName] = useState("");
  const [tempHomePlayerNumber, setTempHomePlayerNumber] = useState("");

  // Opponent Management
  const [opponentRoster, setOpponentRoster] = useState<Player[]>([]);
  const [opponentStarters, setOpponentStarters] = useState<string[]>([]);
  const [newOppPlayerName, setNewOppPlayerName] = useState("");
  const [newOppPlayerNumber, setNewOppPlayerNumber] = useState("");

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
    }
  }, [trackOpponentStats]);

  /**
   * Set default team when current club and teams load
   */
  useEffect(() => {
    if (currentClub && teams.length > 0) {
      setSelectedTeamId(teams[0].id);
    }
  }, [currentClub, teams]);

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

  /**
   * Load teams for current club
   */
  const loadClubData = async () => {
    if (!user) {
      // Guest mode: create temporary local team
      const guestTeam: Team = {
        id: "guest-team",
        name: "Mon Équipe",
        clubId: "guest-club",
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
        teamId: "guest-team",
        createdAt: now,
        updatedAt: now,
      }));

      setTeams([guestTeam]);
      setSelectedTeamId("guest-team");
      setMyTeamName("Mon Équipe"); // Default team name for guests

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
            "Aucune équipe active",
            "Vos équipes ont été suspendues suite au changement d'abonnement. Veuillez passer à une offre supérieure pour les réactiver.",
            [
              {
                text: "OK",
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error loading teams:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load roster for a specific team
   */
  const loadTeamRoster = async (teamId: string) => {
    // Skip for guest users
    if (!user || teamId === "guest-team") {
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
      Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.NO_OPPONENT);
      return;
    }
    // For guest users, validate team name instead of selectedTeamId
    if (!user && !myTeamName) {
      Alert.alert("Erreur", "Veuillez saisir le nom de votre équipe");
      return;
    }
    if (user && !selectedTeamId) {
      Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.NO_TEAM);
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
        Alert.alert("5 majeur complet", MATCH_VALIDATION_MESSAGES.STARTERS_FULL);
        return;
      }
      setStarters([...starters, playerId]);
    }
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
      createdAt: now,
      updatedAt: now,
    };

    setOpponentRoster([...opponentRoster, newPlayer]);
    setNewOppPlayerName("");
    setNewOppPlayerNumber("");
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
        Alert.alert("5 majeur complet", MATCH_VALIDATION_MESSAGES.STARTERS_FULL);
        return;
      }
      setOpponentStarters([...opponentStarters, playerId]);
    }
  };

  // ===========================
  // START MATCH
  // ===========================

  /**
   * Validate rosters and navigate to live match
   */
  const handleStart = () => {
    // Validate home team
    if (selectedHomePlayers.length < ROSTER_LIMITS.MIN_PLAYERS) {
      Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.MIN_PLAYERS);
      return;
    }

    const requiredStarters = Math.min(ROSTER_LIMITS.STARTERS, selectedHomePlayers.length);
    if (starters.length !== requiredStarters) {
      Alert.alert(
        "Erreur",
        MATCH_VALIDATION_MESSAGES.STARTERS_REQUIRED(requiredStarters)
      );
      return;
    }

    // Validate opponent roster if tracking stats
    if (trackOpponentStats) {
      if (opponentRoster.length < ROSTER_LIMITS.STARTERS) {
        Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.OPPONENT_MIN_PLAYERS);
        return;
      }
      if (opponentStarters.length !== ROSTER_LIMITS.STARTERS) {
        Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.OPPONENT_STARTERS_REQUIRED);
        return;
      }
    }

    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) return;

    // Get club (from context for authenticated users, or create guest club)
    const club = user && currentClub ? currentClub : {
      id: "guest-club",
      name: "Club Local",
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
      Alert.alert("Erreur", MATCH_VALIDATION_MESSAGES.NO_CLUB);
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
      teamName: finalTeamName,
      clubLogoUrl: club?.logoUrl || null,
      courtBackgroundColor: club?.courtBackgroundColor || DEFAULT_COURT_COLORS.background,
      courtLineColor: club?.courtLineColor || DEFAULT_COURT_COLORS.line,
      createdAt: new Date().toISOString(),
    };

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
  // For guests, validate myTeamName; for authenticated users, validate selectedTeamId
  const isStep1Valid = opponent && (user ? selectedTeamId : myTeamName);
  const isStep2Valid =
    selectedHomePlayers.length >= ROSTER_LIMITS.MIN_PLAYERS &&
    starters.length === Math.min(ROSTER_LIMITS.STARTERS, selectedHomePlayers.length);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Progress Bar */}
      <MatchHeader step={step} onBack={handleBack} colors={themeColors} />

      {/* STEP 1: CONFIGURATION */}
      {step === 1 && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
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
        </ScrollView>
      )}

      {/* STEP 2: ROSTERS */}
      {step === 2 && (
        <View style={styles.rosterContainer}>
          <RosterTabSwitch
            activeTab={rosterTab}
            onTabChange={setRosterTab}
            homeCount={selectedHomePlayers.length}
            opponentCount={opponentRoster.length}
            isDark={isDark}
            colors={themeColors}
          />

          <ScrollView
            style={styles.rosterContent}
            contentContainerStyle={styles.rosterScrollContent}
          >
            {rosterTab === "HOME" ? (
              <HomeRosterView
                availablePlayers={availableHomePlayers}
                selectedPlayers={selectedHomePlayers}
                starters={starters}
                tempPlayerName={tempHomePlayerName}
                tempPlayerNumber={tempHomePlayerNumber}
                onTogglePlayer={toggleHomePlayer}
                onToggleStarter={toggleStarter}
                onTempNameChange={setTempHomePlayerName}
                onTempNumberChange={setTempHomePlayerNumber}
                onAddTempPlayer={addTempHomePlayer}
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
                onNewNameChange={setNewOppPlayerName}
                onNewNumberChange={setNewOppPlayerNumber}
                onAddPlayer={addOpponentPlayer}
                onGeneratePlayers={generateOpponentRoster}
                onToggleStarter={toggleOpponentStarter}
                onRemovePlayer={removeOpponentPlayer}
                onGoToStep1={() => setStep(1)}
                isDark={isDark}
                colors={themeColors}
              />
            )}
          </ScrollView>
        </View>
      )}

      {/* Footer with Action Button */}
      <MatchFooter
        step={step}
        enabled={step === 1 ? !!isStep1Valid : !!isStep2Valid}
        onPress={step === 1 ? handleNextStep : handleStart}
        isDark={isDark}
        colors={themeColors}
      />
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
    paddingBottom: 100,
  },
});
