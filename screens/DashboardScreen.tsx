import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  BackHandler,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../src/theme";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { ServiceFactory } from "../services/ServiceFactory";
import { Match } from "../src/models/types";
import { Club } from "../models/Club";
import { Team, TeamStatus } from "../models/Team";
import { supabase } from "../src/config/supabase";
import JerseyIconSimple from "../components/icons/JerseySimpleIcon";
import DashboardStatsCards from "../components/dashboard/DashboardStatsCards";
import DashboardResumeMatchModal from "../components/dashboard/DashboardResumeMatchModal";
import DashboardRecentMatches from "../components/dashboard/DashboardRecentMatches";
import { ROUTES } from "../constants/routes";

/**
 * DashboardScreen navigation prop type
 * Uses generic navigation type until we define full navigation params
 */
interface DashboardScreenProps {
  navigation: {
    navigate: (route: string, params?: any) => void;
    goBack: () => void;
    replace: (route: string, params?: any) => void;
  };
}

/**
 * DashboardScreen - Main dashboard view displaying:
 * - User greeting and header with theme toggle, logout, and club logo
 * - CTA card for club/team setup (if not configured)
 * - Team selector (for users with multiple teams)
 * - Quick stats (total matches, wins/losses ratio)
 * - "New Match" button
 * - Recent matches list (last 3 completed matches)
 *
 * Features:
 * - Displays matches from both local SQLite and Supabase (for authenticated users)
 * - Detects and prompts to resume unfinished matches
 * - Supports guest mode with local-only data
 * - Auto-reloads on screen focus and user changes
 */
export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const { colors, isDark, setThemeMode } = useTheme();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveMatchToResume, setLiveMatchToResume] = useState<Match | null>(
    null
  );
  const [isNewMatchFlow, setIsNewMatchFlow] = useState(false); // true if opened from "Nouveau match" button

  const isGuest = !user;
  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Invité";

  // Block hardware back button to prevent going back to auth screen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Return true to prevent default behavior (going back)
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  /**
   * Reload dashboard data when:
   * - Screen comes into focus (navigation)
   * - User changes (login/logout/switch account)
   *
   * Using useFocusEffect instead of useEffect to avoid double loading
   * when both screen focus and user ID change simultaneously
   */
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 DashboardScreen: Screen focused or user changed", {
        userId: user?.id,
        isGuest,
      });

      // Reset state when user changes
      setClub(null);
      setTeams([]);
      setActiveTeamId(null);
      setMatches([]);

      // Load fresh data
      loadDashboardData();
    }, [user?.id, isGuest])
  );

  // Check for active match when team changes
  useEffect(() => {
    const checkForActiveMatch = async () => {
      if (activeTeamId) {
        const matchRepo = new MatchRepository();
        const activeMatch = await matchRepo.findActiveMatch();
        if (activeMatch && activeMatch.team_id === activeTeamId) {
          setLiveMatchToResume(activeMatch);
        }
      }
    };
    checkForActiveMatch();
  }, [activeTeamId]);

  /**
   * Loads all dashboard data including:
   * - Active/unfinished matches
   * - Local matches from SQLite (non-synced)
   * - Server matches from Supabase (for authenticated users)
   * - User's clubs and teams
   *
   * Merges local and server data for comprehensive view
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("📊 DashboardScreen: Loading dashboard data...");

      const matchRepo = new MatchRepository();

      // Check for active match to resume
      const activeMatch = await matchRepo.findActiveMatch();
      if (activeMatch) {
        console.log("🎮 DashboardScreen: Active match found", {
          matchId: activeMatch.id,
          opponent: activeMatch.opponent_name,
        });
        setLiveMatchToResume(activeMatch);
      }

      // 1. Load LOCAL matches from SQLite (non-synced ones)
      console.log("💾 DashboardScreen: Fetching local matches from SQLite");
      const allLocalMatches = await matchRepo.getAllMatches();
      console.log("✅ DashboardScreen: Local matches fetched", {
        totalLocalMatches: allLocalMatches.length,
      });

      let localMatches = allLocalMatches.filter(
        (match) => !match.synced_to_server
      );

      // 2. Load SERVER matches from Supabase if user is authenticated
      let serverMatches: Match[] = [];
      if (user) {
        console.log(
          "📡 DashboardScreen: User authenticated, fetching server matches",
          {
            userId: user.id,
          }
        );

        try {
          const { data: serverMatchesData, error } = await supabase
            .from("matches")
            .select("*")
            .eq("created_by", user.id)
            .order("played_at", { ascending: false });

          if (error) {
            console.error(
              "❌ DashboardScreen: Error fetching server matches",
              error.message
            );
          } else if (serverMatchesData) {
            console.log("✅ DashboardScreen: Server matches fetched", {
              serverMatchesCount: serverMatchesData.length,
            });

            // Transform server matches to Match format
            serverMatches = serverMatchesData.map(
              (sm, index) =>
                ({
                  id: -(index + 1), // Use negative IDs for server matches
                  supabase_id: sm.id, // Keep Supabase UUID for navigation
                  my_team_name: sm.my_team_name,
                  opponent_name: sm.opponent_name,
                  is_home: sm.is_home ? 1 : 0,
                  status: sm.status || ("completed" as const),
                  total_periods: sm.total_periods,
                  period_duration: sm.period_duration,
                  overtime_duration: sm.overtime_duration || 300,
                  overtime_periods: sm.overtime_periods || 0,
                  club_id: sm.club_id,
                  team_id: sm.team_id,
                  current_period: 0,
                  time_elapsed: 0,
                  my_team_score: sm.my_team_score,
                  opponent_score: sm.opponent_score,
                  synced_to_server: 1,
                  created_at: sm.created_at,
                  started_at: sm.started_at,
                  ended_at: sm.ended_at,
                  played_at: sm.played_at,
                  last_updated: sm.created_at,
                } as any)
            );
          }
        } catch (error) {
          console.error(
            "❌ DashboardScreen: Error loading server matches",
            error
          );
        }
      } else {
        console.log(
          "👤 DashboardScreen: Guest mode - showing only local matches"
        );
      }

      // 3. Merge local and server matches
      const allMatches = [...localMatches, ...serverMatches];
      console.log("🔀 DashboardScreen: Merged matches", {
        localCount: localMatches.length,
        serverCount: serverMatches.length,
        totalCount: allMatches.length,
      });

      setMatches(allMatches);

      // Load club and teams if user is authenticated
      if (user) {
        console.log("📡 DashboardScreen: Fetching user clubs from Supabase", {
          userId: user.id,
        });

        try {
          const clubService = ServiceFactory.getClubService(supabase);
          const clubs = await clubService.getUserMemberClubs(user.id);

          console.log("✅ DashboardScreen: User clubs fetched", {
            userId: user.id,
            clubCount: clubs.length,
            clubIds: clubs.map((c) => c.id),
            clubNames: clubs.map((c) => c.name),
          });

          // Select first club if available
          const firstClub = clubs.length > 0 ? clubs[0] : null;
          setClub(firstClub);

          if (firstClub) {
            console.log("✅ DashboardScreen: Club selected", {
              clubId: firstClub.id,
              clubName: firstClub.name,
            });

            // Load teams for the club - only approved teams where user is owner
            const teamService = ServiceFactory.getTeamService(supabase);
            const clubTeams = await teamService.getClubTeams(firstClub.id);

            // Filter to only show approved teams where user is the owner
            const myApprovedTeams = clubTeams.filter(
              (team) =>
                team.ownerId === user.id && team.status === TeamStatus.APPROVED
            );

            console.log("✅ DashboardScreen: Teams fetched", {
              clubId: firstClub.id,
              totalTeams: clubTeams.length,
              myApprovedTeams: myApprovedTeams.length,
              teamNames: myApprovedTeams.map((t) => t.name),
            });

            setTeams(myApprovedTeams);

            // Select first team if available
            if (myApprovedTeams.length > 0) {
              setActiveTeamId(myApprovedTeams[0].id);
            }
          } else {
            console.log("ℹ️ DashboardScreen: No clubs found for user");
          }
        } catch (error) {
          console.error("❌ DashboardScreen: Error loading clubs/teams", error);
        }
      }
    } catch (error) {
      console.error("❌ DashboardScreen: Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Signs out the current user and navigates to Auth screen
   */
  const handleSignOut = async () => {
    await signOut();
    navigation.navigate("Auth");
  };

  /**
   * Resumes an active/unfinished match
   * Navigates to LiveMatch screen with the match ID
   */
  const handleResumeMatch = () => {
    if (liveMatchToResume) {
      // Navigate to LiveMatch with the resume data
      navigation.navigate("LiveMatch", { matchId: liveMatchToResume.id });
      setLiveMatchToResume(null);
      setIsNewMatchFlow(false);
    }
  };

  /**
   * Abandons an active match after confirmation
   * Deletes the match and all associated data from the database
   */
  const handleAbandonMatch = async () => {
    if (!liveMatchToResume) return;

    Alert.alert(
      "Abandonner le match ?",
      "Cette action est irréversible. Toutes les données du match seront supprimées définitivement.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: async () => {
            try {
              const matchRepo = new MatchRepository();

              // Delete all match data (actions and players are cascade deleted via FOREIGN KEY)
              await matchRepo.delete(liveMatchToResume.id);

              // Remove from state
              setLiveMatchToResume(null);
              setIsNewMatchFlow(false);

              // Refresh dashboard data
              loadDashboardData();
            } catch (error) {
              console.error("Failed to abandon match:", error);
              Alert.alert(
                "Erreur",
                "Impossible d'abandonner le match. Veuillez réessayer."
              );
            }
          },
        },
      ]
    );
  };

  /**
   * Handles "New Match" button click
   * Checks for active matches and shows modal if one exists
   * Otherwise navigates to NewMatch screen
   */
  const handleNewMatchClick = async () => {
    // Check if there's an active match
    const matchRepo = new MatchRepository();
    const activeMatch = await matchRepo.findActiveMatch();

    if (activeMatch) {
      // Show popup with live match (from "Nouveau match" button)
      setIsNewMatchFlow(true);
      setLiveMatchToResume(activeMatch);
    } else {
      // No active match, proceed to new match screen
      navigation.navigate("NewMatch", { teamId: activeTeamId });
    }
  };

  /**
   * Confirms abandoning active match to create a new one
   * Shows confirmation dialog and navigates to NewMatch screen if confirmed
   */
  const handleNewMatchConfirm = async () => {
    if (!liveMatchToResume) return;

    Alert.alert(
      "Nouveau match",
      "Un match est déjà en cours. Voulez-vous l'abandonner pour en créer un nouveau ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Abandonner et créer",
          style: "destructive",
          onPress: async () => {
            try {
              const matchRepo = new MatchRepository();

              // Delete the active match
              await matchRepo.delete(liveMatchToResume.id);

              // Close popup
              setLiveMatchToResume(null);
              setIsNewMatchFlow(false);

              // Navigate to new match screen
              navigation.navigate("NewMatch", { teamId: activeTeamId });
            } catch (error) {
              console.error("Failed to abandon match:", error);
              Alert.alert(
                "Erreur",
                "Impossible d'abandonner le match. Veuillez réessayer."
              );
            }
          },
        },
      ]
    );
  };

  /**
   * Formats a date string to French locale (e.g., "15 janv. 2025")
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Filter matches based on selected team
  const filteredMatches =
    club && activeTeamId
      ? matches.filter((m) => m.team_id === activeTeamId)
      : matches;

  const recentMatches = filteredMatches
    .filter((m) => m.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.ended_at || b.created_at).getTime() -
        new Date(a.ended_at || a.created_at).getTime()
    )
    .slice(0, 3);

  // Calculate stats based on filtered matches
  const completedMatches = filteredMatches.filter(
    (m) => m.status === "completed"
  );
  const wins = completedMatches.filter(
    (m) =>
      m.my_team_score !== undefined &&
      m.opponent_score !== undefined &&
      m.my_team_score > m.opponent_score
  ).length;
  const losses = completedMatches.filter(
    (m) =>
      m.my_team_score !== undefined &&
      m.opponent_score !== undefined &&
      m.my_team_score < m.opponent_score
  ).length;

  const activeTeamName = teams.find((t) => t.id === activeTeamId)?.name;

  /**
   * Toggles between light and dark theme
   */
  const handleToggleTheme = () => {
    const nextMode = isDark ? "light" : "dark";
    setThemeMode(nextMode);
  };

  /**
   * Loads match details (actions and players) from either Supabase or local SQLite
   * @param match - The match to load details for
   */
  const loadMatchDetails = async (match: Match) => {
    try {
      const matchId = (match as any).supabase_id || match.id;
      const isUUID = typeof matchId === "string" && matchId.includes("-");

      let actionDataList: any[] = [];
      let players: any[] = [];

      if (isUUID) {
        // Load from Supabase - get match_players with actions embedded
        const { data: matchPlayers, error } = await supabase
          .from("match_players")
          .select("*")
          .eq("match_id", matchId);

        if (error) {
          console.error("Error loading match players:", error);
          return;
        }

        if (matchPlayers) {
          // Convert match players to expected format
          players = matchPlayers.map((mp: any) => ({
            id: mp.player_number,
            num: mp.player_number,
            name: mp.player_name,
            team: mp.team,
            isSubstitute: !mp.is_starter,
            photoUrl: mp.photo_url,
          }));

          // Extract actions from match_players
          matchPlayers.forEach((mp: any) => {
            if (mp.actions && Array.isArray(mp.actions)) {
              const playerActions = mp.actions.map((action: any) => ({
                type: action.action_type,
                specification: action.specification,
                points: action.points,
                player: mp.player_number,
                team: mp.team,
                timestamp: new Date(action.timestamp),
                period_number: action.period_number,
                time_in_period: action.time_in_period,
                position: { x: 0, y: 0 },
                semanticPosition: {
                  xNormalized: action.semantic_x,
                  yNormalized: action.semantic_y,
                },
              }));
              actionDataList.push(...playerActions);
            }
          });
        }
      } else {
        // Load from local SQLite
        const actionRepo = new ActionRepository();
        const actions = await actionRepo.getActionsForMatch(Number(matchId));

        // Convert to ActionData format
        actionDataList = actions.map((action: any) => ({
          type: action.action_type,
          specification: action.specification,
          points: action.points,
          player: action.player_number,
          team: action.team,
          timestamp: new Date(action.timestamp),
          period_number: action.period_number,
          time_in_period: action.time_in_period,
          position: { x: 0, y: 0 },
          semanticPosition: {
            xNormalized: action.semantic_x,
            yNormalized: action.semantic_y,
          },
        }));
      }

      navigation.navigate(ROUTES.MATCH_DETAILS as never, {
        match,
        actions: actionDataList,
        players,
      });
    } catch (error) {
      console.error("Error loading match details:", error);
    }
  };

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
        <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
      </View>
    );
  }

  return (
    <>
      {/* Resume Match Modal */}
      <DashboardResumeMatchModal
        visible={!!liveMatchToResume}
        match={liveMatchToResume}
        colors={colors}
        isNewMatchFlow={isNewMatchFlow}
        onResume={handleResumeMatch}
        onAbandon={handleAbandonMatch}
        onNewMatch={handleNewMatchConfirm}
        onClose={() => {
          setLiveMatchToResume(null);
          setIsNewMatchFlow(false);
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: colors.text.primary }]}>
                Bonjour, {"\n"}
                <Text style={{ color: BRAND_COLORS[500] }}>{userName}</Text>
              </Text>
              <Text
                style={[styles.subGreeting, { color: colors.text.secondary }]}
              >
                Prêt pour le match ?
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleToggleTheme}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
                  size={20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSignOut}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[100],
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={20}
                  color={colors.error}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.clubLogo,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[100],
                    borderColor:
                      club && club.logoUrl ? BRAND_COLORS[500] : colors.border,
                  },
                ]}
              >
                {club && club.logoUrl ? (
                  <Image
                    source={{ uri: club.logoUrl }}
                    style={styles.clubLogoImage}
                  />
                ) : (
                  <Image
                    source={require("../components/icons/coachassistant-logo-margin.png")}
                    style={styles.clubLogoImage}
                  />
                )}
              </View>
            </View>
          </View>

          {/* No Club/Team CTA - Only for non-guests who haven't set up a club/team yet */}
          {(!club || teams.length === 0) && !isGuest && (
            <View
              style={[
                styles.ctaCard,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : COMMON_COLORS.white,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.ctaIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${BRAND_COLORS[500]}33`
                      : `${BRAND_COLORS[500]}1A`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={!club ? "shield-outline" : "account-group"}
                  size={24}
                  color={BRAND_COLORS[500]}
                />
              </View>
              <Text style={[styles.ctaTitle, { color: colors.text.primary }]}>
                {!club
                  ? "Rejoignez ou créez un club"
                  : "Créez votre première équipe"}
              </Text>
              <Text
                style={[
                  styles.ctaDescription,
                  { color: colors.text.secondary },
                ]}
              >
                {!club
                  ? "Pour commencer à suivre les statistiques, vous devez associer votre compte à une équipe."
                  : "Vous faites partie d'un club, créez maintenant une équipe pour commencer à suivre vos matchs."}
              </Text>
              <TouchableOpacity
                style={[
                  styles.ctaPrimaryButton,
                  {
                    backgroundColor: isDark
                      ? COMMON_COLORS.white
                      : SLATE_COLORS[900],
                  },
                ]}
                onPress={() => navigation.navigate("Club")}
              >
                <Text
                  style={[
                    styles.ctaPrimaryButtonText,
                    {
                      color: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
                    },
                  ]}
                >
                  Commencer
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color={isDark ? SLATE_COLORS[900] : COMMON_COLORS.white}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Stats & Team Selector - Displayed for Club Users OR Guests */}
          {(club || isGuest) && (
            <>
              {/* Team Selector (Only if club exists) */}
              {club && teams.length > 0 && (
                <View
                  style={[
                    styles.teamSelector,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.teamSelectorIcon}>
                    <JerseyIconSimple width={30} height={30} />
                  </View>
                  <Picker
                    selectedValue={activeTeamId || ""}
                    onValueChange={(value) => setActiveTeamId(value)}
                    style={[styles.picker, { color: colors.text.primary }]}
                    dropdownIconColor={colors.text.secondary}
                  >
                    {teams.map((team) => (
                      <Picker.Item
                        key={team.id}
                        label={`${team.name}`}
                        value={team.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}

              {/* Guest Label if no club */}
              {isGuest && (
                <View
                  style={[
                    styles.guestBanner,
                    {
                      backgroundColor: isDark
                        ? `${BRAND_COLORS[500]}1A`
                        : `${BRAND_COLORS[500]}1A`,
                      borderColor: isDark
                        ? `${BRAND_COLORS[500]}33`
                        : `${BRAND_COLORS[500]}33`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={BRAND_COLORS[500]}
                  />
                  <Text
                    style={[
                      styles.guestBannerText,
                      {
                        color: isDark ? BRAND_COLORS[100] : BRAND_COLORS[600],
                      },
                    ]}
                  >
                    Mode Invité : Les matchs sont sauvegardés en local sur cet
                    appareil.
                  </Text>
                </View>
              )}

              {/* Stats Cards */}
              <DashboardStatsCards
                totalMatches={filteredMatches.length}
                wins={wins}
                losses={losses}
                colors={colors}
              />

              {/* Action Bar - New Match Button - Only show if user has teams */}
              {teams.length > 0 && (
                <TouchableOpacity
                  style={styles.newMatchButton}
                  onPress={handleNewMatchClick}
                >
                  <View style={styles.newMatchButtonLeft}>
                    <Text style={styles.newMatchButtonTitle}>
                      Nouveau Match
                    </Text>
                    <Text style={styles.newMatchButtonSubtitle}>
                      Pour {activeTeamName}
                    </Text>
                  </View>
                  <View style={styles.newMatchButtonIcon}>
                    <MaterialCommunityIcons
                      name="plus"
                      size={24}
                      color={COMMON_COLORS.white}
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Recent History */}
              <DashboardRecentMatches
                matches={recentMatches}
                colors={colors}
                onMatchPress={loadMatchDetails}
                onViewAllPress={() => navigation.navigate("History")}
                formatDate={formatDate}
              />
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 32,
  },
  subGreeting: {
    fontSize: 14,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clubLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  clubLogoImage: {
    width: "100%",
    height: "100%",
  },
  ctaCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  ctaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  ctaPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  teamSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    marginBottom: 16,
  },
  teamSelectorIcon: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 58,
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  guestBannerText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  newMatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    backgroundColor: BRAND_COLORS[500],
  },
  newMatchButtonLeft: {
    flex: 1,
  },
  newMatchButtonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COMMON_COLORS.white,
    marginBottom: 4,
  },
  newMatchButtonSubtitle: {
    fontSize: 14,
    color: `${COMMON_COLORS.white}CC`,
  },
  newMatchButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COMMON_COLORS.white}33`,
    alignItems: "center",
    justifyContent: "center",
  },
});
