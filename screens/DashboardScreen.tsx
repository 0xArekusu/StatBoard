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
  Platform,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { useClub } from "../src/contexts/ClubContext";
import { ServiceFactory } from "../services/ServiceFactory";
import { shareLogs, logInfo, logError } from "../utils/logger";
import { Match, MatchStatus } from "../src/models/types";
import { Club } from "../models/Club";
import { Team, TeamStatus } from "../models/Team";
import { supabase } from "../src/config/supabase";
import JerseyIconSimple from "../components/icons/JerseySimpleIcon";
import DashboardStatsCards from "../components/dashboard/DashboardStatsCards";
import DashboardResumeMatchModal from "../components/dashboard/DashboardResumeMatchModal";
import DashboardRecentMatches from "../components/dashboard/DashboardRecentMatches";
import GuestWelcomeModal from "../components/GuestWelcomeModal";
import { ROUTES } from "../constants/routes";
import { COACH_ASSISTANT_LOGO_MARGIN } from "../src/utils/logoHelper";

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
  const { currentClub, allClubs, setCurrentClub: setGlobalCurrentClub, activeTeamId, setActiveTeamId } = useClub();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveMatchToResume, setLiveMatchToResume] = useState<Match | null>(
    null
  );
  const [isNewMatchFlow, setIsNewMatchFlow] = useState(false); // true if opened from "Nouveau match" button
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showGuestWelcome, setShowGuestWelcome] = useState(false);
  const [showClubSwitcher, setShowClubSwitcher] = useState(false);

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
   * Check if guest welcome modal should be shown
   * Checks on every focus if we need to show the welcome modal
   * IMPORTANT: Only show if there's NO active match to avoid modal conflicts
   */
  useFocusEffect(
    useCallback(() => {
      const checkGuestWelcome = async () => {
        logInfo("DashboardScreen", "🔍 Checking guest welcome on focus", { isGuest });

        if (isGuest) {
          const SHOW_ONCE_KEY = '@show_guest_welcome_once';
          const shouldShowValue = await AsyncStorage.getItem(SHOW_ONCE_KEY);
          const shouldShow = shouldShowValue !== null;

          logInfo("DashboardScreen", "📱 Guest welcome check", {
            shouldShow,
            willShow: shouldShow
          });

          if (shouldShow) {
            // Check if there's an active match - if yes, don't show guest welcome
            const matchListService = ServiceFactory.getMatchListService(supabase);
            const activeMatch = await matchListService.findActiveMatch();

            if (activeMatch) {
              logInfo("DashboardScreen", "⏭️ Skipping guest welcome - active match found");
              // Clear the flag anyway so it won't show later
              await AsyncStorage.removeItem(SHOW_ONCE_KEY);
            } else {
              logInfo("DashboardScreen", "✅ Showing guest welcome modal");
              setShowGuestWelcome(true);
              // Clear the flag so it won't show again on next focus
              await AsyncStorage.removeItem(SHOW_ONCE_KEY);
            }
          }
        }
      };

      checkGuestWelcome();
    }, [isGuest])
  );

  /**
   * Reload dashboard data when:
   * - Screen comes into focus (navigation)
   * - User changes (login/logout/switch account)
   * - Current club changes
   *
   * Using useFocusEffect instead of useEffect to avoid double loading
   * when both screen focus and user ID change simultaneously
   */
  useFocusEffect(
    useCallback(() => {
      logInfo("DashboardScreen", "🔄 Screen focused or club changed", {
        userId: user?.id,
        isGuest,
        clubId: currentClub?.id,
        clubName: currentClub?.name,
        clubLogoUrl: currentClub?.logoUrl,
        activeTeamId,
      });

      // Reset local state (but NOT activeTeamId from context)
      setTeams([]);
      setMatches([]);

      // Load fresh data only if we have a club (for authenticated users) or are in guest mode
      if (isGuest || currentClub) {
        loadDashboardData();
      } else {
        // Still loading club context, wait for it
        setLoading(false);
      }
    }, [user?.id, isGuest, currentClub?.id, activeTeamId])
  );

  // Check for active match and reload matches when team changes
  useEffect(() => {
    const reloadTeamData = async () => {
      if (activeTeamId && user && currentClub) {
        const matchListService = ServiceFactory.getMatchListService(supabase);

        // Check for active match
        const activeMatch = await matchListService.findActiveMatch();
        if (activeMatch && activeMatch.team_id === activeTeamId) {
          setLiveMatchToResume(activeMatch);
        }

        // Reload matches for the selected team
        logInfo("DashboardScreen", "🔄 Reloading matches for team change", {
          teamId: activeTeamId,
        });
        const allMatches = await matchListService.loadAllMatches(
          user.id,
          currentClub.id,
          activeTeamId
        );
        setMatches(allMatches);
        logInfo("DashboardScreen", "✅ Matches reloaded", {
          totalCount: allMatches.length,
        });
      }
    };
    reloadTeamData();
  }, [activeTeamId]);

  /**
   * Loads all dashboard data including:
   * - Active/unfinished matches
   * - Local matches from SQLite (non-synced)
   * - Server matches from Supabase (for authenticated users)
   * - User's teams for current club
   *
   * Merges local and server data for comprehensive view
   * @param skipActiveMatchCheck - If true, skip checking for active matches (used after abandoning)
   */
  const loadDashboardData = async (skipActiveMatchCheck: boolean = false) => {
    try {
      setLoading(true);
      logInfo("DashboardScreen", "📊 Loading dashboard data");

      // Use MatchListService to load matches
      const matchListService = ServiceFactory.getMatchListService(supabase);

      // Check for active match to resume (skip if we just abandoned one)
      if (!skipActiveMatchCheck) {
        const activeMatch = await matchListService.findActiveMatch();
        if (activeMatch) {
          logInfo("DashboardScreen", "🎮 Active match found", {
            matchId: activeMatch.id,
            opponent: activeMatch.opponent_name,
          });
          setLiveMatchToResume(activeMatch);
        }
      }

      let clubId: string | null = null;
      let teamId: string | null = null;

      // Use current club from context
      if (user && currentClub) {
        clubId = currentClub.id;

        logInfo("DashboardScreen", "📌 Using current club from context", {
          clubId: currentClub.id,
          clubName: currentClub.name,
        });

        try {
          // Load teams for the club - only approved teams where user is owner
          const teamService = ServiceFactory.getTeamService(supabase);
          const clubTeams = await teamService.getClubTeams(clubId);

          // Filter to only show approved teams where user is the owner
          const myApprovedTeams = clubTeams.filter(
            (team) =>
              team.ownerId === user.id && team.status === TeamStatus.APPROVED
          );

          logInfo("DashboardScreen", "✅ Teams fetched", {
            clubId: clubId,
            totalTeams: clubTeams.length,
            myApprovedTeams: myApprovedTeams.length,
            teamNames: myApprovedTeams.map((t) => t.name),
          });

          setTeams(myApprovedTeams);

          // Select first team if available and no team is selected
          if (myApprovedTeams.length > 0) {
            // Check if activeTeamId is set and is in the list of approved teams
            const isActiveTeamValid = activeTeamId && myApprovedTeams.some(t => t.id === activeTeamId);

            if (isActiveTeamValid) {
              // Use the existing valid activeTeamId
              teamId = activeTeamId;
              logInfo("DashboardScreen", "Using existing activeTeamId", { teamId });
            } else if (!activeTeamId) {
              // Only set activeTeamId if it's null (first time)
              teamId = myApprovedTeams[0].id;
              await setActiveTeamId(teamId);
              logInfo("DashboardScreen", "First time - selecting first team", { teamId });
            } else {
              // activeTeamId is set but not valid (team was deleted?) - reset to first team
              teamId = myApprovedTeams[0].id;
              await setActiveTeamId(teamId);
              logInfo("DashboardScreen", "activeTeamId not valid - resetting to first team", {
                oldTeamId: activeTeamId,
                newTeamId: teamId
              });
            }
          }
        } catch (error) {
          logError("DashboardScreen", "❌ Error loading teams", { error });
        }
      }

      // Load all matches from both sources (AFTER loading club and team)
      logInfo("DashboardScreen", "📡 Loading matches");
      const allMatches = await matchListService.loadAllMatches(
        user?.id || null,
        clubId,
        teamId
      );

      logInfo("DashboardScreen", "✅ Matches loaded", {
        totalCount: allMatches.length,
      });

      setMatches(allMatches);
    } catch (error) {
      logError("DashboardScreen", "❌ Error loading dashboard data", { error });
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
              const matchListService = ServiceFactory.getMatchListService(supabase);

              // Delete all match data (actions and players are cascade deleted via FOREIGN KEY)
              await matchListService.deleteMatch(liveMatchToResume.id);

              // Remove from state
              setLiveMatchToResume(null);
              setIsNewMatchFlow(false);

              // Refresh dashboard data (skip active match check since we just deleted it)
              loadDashboardData(true);
            } catch (error) {
              logError("DashboardScreen", "❌ Failed to abandon match", { error });
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
    const matchListService = ServiceFactory.getMatchListService(supabase);
    const activeMatch = await matchListService.findActiveMatch();

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
              const matchListService = ServiceFactory.getMatchListService(supabase);

              // Delete the active match
              await matchListService.deleteMatch(liveMatchToResume.id);

              // Close popup
              setLiveMatchToResume(null);
              setIsNewMatchFlow(false);

              // Navigate to new match screen
              navigation.navigate("NewMatch", { teamId: activeTeamId });
            } catch (error) {
              logError("DashboardScreen", "❌ Failed to abandon match", { error });
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
    currentClub && activeTeamId
      ? matches.filter((m) => m.team_id === activeTeamId)
      : matches;

  const recentMatches = filteredMatches
    .filter((m) => m.status === MatchStatus.COMPLETED)
    .sort(
      (a, b) =>
        new Date(b.ended_at || b.created_at).getTime() -
        new Date(a.ended_at || a.created_at).getTime()
    )
    .slice(0, 3);

  // Calculate stats based on filtered matches
  const completedMatches = filteredMatches.filter(
    (m) => m.status === MatchStatus.COMPLETED
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
   * Export logs for debugging
   */
  const handleExportLogs = async () => {
    try {
      setShowProfileMenu(false);

      const message = Platform.OS === "ios"
        ? "Les logs de l'application vont être partagés via la feuille de partage iOS."
        : "Les logs de l'application vont être sauvegardés. Choisissez un emplacement.";

      Alert.alert(
        "Exporter les logs",
        message,
        [
          {
            text: "Annuler",
            style: "cancel",
          },
          {
            text: "Exporter",
            onPress: async () => {
              try {
                const result = await shareLogs();

                if (result && result.success) {
                  Alert.alert("Succès", result.message);
                } else {
                  Alert.alert(
                    "Erreur",
                    result?.message || "Impossible d'exporter les logs. Veuillez réessayer."
                  );
                }
              } catch (error) {
                logError("DashboardScreen", "❌ Error exporting logs", { error });
                Alert.alert(
                  "Erreur",
                  "Impossible d'exporter les logs. Veuillez réessayer."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      logError("DashboardScreen", "❌ Error in handleExportLogs", { error });
    }
  };

  /**
   * Opens club switcher modal
   */
  const handleOpenClubSwitcher = () => {
    setShowProfileMenu(false);
    setShowClubSwitcher(true);
  };

  /**
   * Switches to a different club
   */
  const handleSwitchClub = async (clubId: string) => {
    setShowClubSwitcher(false);

    const selectedClub = allClubs.find((c) => c.id === clubId);
    if (selectedClub) {
      await setGlobalCurrentClub(selectedClub);
      // Data will reload automatically via useFocusEffect watching currentClub
    }
  };

  /**
   * Creates a new club
   * Only club owners can create additional clubs
   */
  const handleCreateNewClub = () => {
    setShowClubSwitcher(false);

    // Check if user is owner of current club
    const isOwner = currentClub?.ownerId === user?.id;

    if (!isOwner && currentClub) {
      Alert.alert(
        "Créer un nouveau club",
        "Seuls les propriétaires de club peuvent créer de nouveaux clubs. Vous êtes actuellement membre du club mais pas propriétaire.",
        [{ text: "OK" }]
      );
      return;
    }

    // Navigate to Club screen with forceCreate param
    navigation.navigate("Club", { forceCreate: true });
  };

  /**
   * Navigates to match details screen
   * Data loading is handled by MatchDetailsScreen itself
   * @param match - The match to view details for
   */
  const navigateToMatchDetails = (match: Match) => {
    navigation.navigate(ROUTES.MATCH_DETAILS as never, {
      match,
    } as never);
  };

  /**
   * Closes the guest welcome modal
   */
  const handleCloseGuestWelcome = () => {
    setShowGuestWelcome(false);
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {/* Guest Welcome Modal */}
      <GuestWelcomeModal
        visible={showGuestWelcome}
        onClose={handleCloseGuestWelcome}
      />

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

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowProfileMenu(false)}
        >
          <View style={styles.profileMenuContainer}>
            <View
              style={[
                styles.profileMenu,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleExportLogs}
              >
                <MaterialCommunityIcons
                  name="file-download-outline"
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={[styles.profileMenuItemText, { color: colors.text.primary }]}>
                  Exporter les logs
                </Text>
              </TouchableOpacity>

              {!isGuest && (
                <TouchableOpacity
                  style={styles.profileMenuItem}
                  onPress={handleOpenClubSwitcher}
                >
                  <MaterialCommunityIcons
                    name="swap-horizontal"
                    size={20}
                    color={colors.text.primary}
                  />
                  <Text style={[styles.profileMenuItemText, { color: colors.text.primary }]}>
                    Changer de club
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Club Switcher Modal */}
      <Modal
        visible={showClubSwitcher}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowClubSwitcher(false)}
      >
        <View style={styles.clubSwitcherOverlay}>
          <View
            style={[
              styles.clubSwitcherContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.clubSwitcherHeader}>
              <Text style={[styles.clubSwitcherTitle, { color: colors.text.primary }]}>
                Changer de club
              </Text>
              <TouchableOpacity onPress={() => setShowClubSwitcher(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.clubSwitcherList}>
              {allClubs.map((userClub) => (
                <TouchableOpacity
                  key={userClub.id}
                  style={[
                    styles.clubSwitcherItem,
                    {
                      backgroundColor:
                        currentClub?.id === userClub.id
                          ? isDark
                            ? `${colors.primary}33`
                            : `${colors.primary}1A`
                          : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleSwitchClub(userClub.id)}
                >
                  <View style={styles.clubSwitcherItemLeft}>
                    {userClub.logoUrl ? (
                      <Image
                        source={{ uri: userClub.logoUrl }}
                        style={styles.clubSwitcherLogo}
                      />
                    ) : (
                      <View
                        style={[
                          styles.clubSwitcherLogoPlaceholder,
                          { backgroundColor: colors.surfaceVariant },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="shield-outline"
                          size={24}
                          color={colors.text.secondary}
                        />
                      </View>
                    )}
                    <View>
                      <Text
                        style={[
                          styles.clubSwitcherItemName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {userClub.name}
                      </Text>
                      <Text
                        style={[
                          styles.clubSwitcherItemAcronym,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {userClub.acronym}
                      </Text>
                    </View>
                  </View>
                  {currentClub?.id === userClub.id && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.clubSwitcherCreateButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateNewClub}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={20}
                  color={colors.text.primary}
                />
                <Text
                  style={[
                    styles.clubSwitcherCreateButtonText,
                    { color: colors.text.primary },
                  ]}
                >
                  Créer un nouveau club
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: colors.text.primary }]}>
                Bonjour, {"\n"}
                <Text style={{ color: colors.primary }}>{userName}</Text>
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
                    backgroundColor: colors.surfaceVariant,
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

              <TouchableOpacity
                onPress={() => setShowProfileMenu(true)}
                style={[
                  styles.clubLogo,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor:
                      colors.primary,
                  },
                ]}
              >
                {currentClub && currentClub.logoUrl ? (
                  <Image
                    source={{ uri: currentClub.logoUrl }}
                    style={styles.clubLogoImage}
                  />
                ) : (
                  <Image
                    source={COACH_ASSISTANT_LOGO_MARGIN}
                    style={styles.clubLogoImage}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* No Club/Team CTA - Only for non-guests who haven't set up a club/team yet */}
          {(!currentClub || teams.length === 0) && !isGuest && (
            <View
              style={[
                styles.ctaCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.ctaIconContainer,
                  {
                    backgroundColor: isDark
                      ? `${colors.primary}33`
                      : `${colors.primary}1A`,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={!currentClub ? "shield-outline" : "account-group"}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.ctaTitle, { color: colors.text.primary }]}>
                {!currentClub
                  ? "Rejoignez ou créez un club"
                  : "Créez votre première équipe"}
              </Text>
              <Text
                style={[
                  styles.ctaDescription,
                  { color: colors.text.secondary },
                ]}
              >
                {!currentClub
                  ? "Pour commencer à suivre les statistiques, vous devez associer votre compte à une équipe."
                  : "Vous faites partie d'un club, créez maintenant une équipe pour commencer à suivre vos matchs."}
              </Text>
              <TouchableOpacity
                style={[
                  styles.ctaPrimaryButton,
                  {
                    backgroundColor: colors.button.secondary,
                  },
                ]}
                onPress={() => navigation.navigate("Club")}
              >
                <Text
                  style={[
                    styles.ctaPrimaryButtonText,
                    {
                      color: colors.text.primary,
                    },
                  ]}
                >
                  Commencer
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Stats & Team Selector - Displayed for Club Users OR Guests */}
          {(currentClub || isGuest) && (
            <>
              {/* Team Selector (Only if club exists) */}
              {currentClub && teams.length > 0 && (
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
                  {Platform.OS === 'ios' && (
                    <Text style={[styles.teamSelectorLabel, { color: colors.text.primary }]}>
                      {teams.find(t => t.id === activeTeamId)?.name || 'Sélectionner une équipe'}
                    </Text>
                  )}
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
                        ? `${colors.primary}1A`
                        : `${colors.primary}1A`,
                      borderColor: isDark
                        ? `${colors.primary}33`
                        : `${colors.primary}33`,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.guestBannerText,
                      {
                        color: colors.warning,
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

              {/* Action Bar - New Match Button - Show for authenticated users with teams OR guests */}
              {(teams.length > 0 || isGuest) && (
                <TouchableOpacity
                  style={[styles.newMatchButton, { backgroundColor: colors.primary }]}
                  onPress={handleNewMatchClick}
                >
                  <View style={styles.newMatchButtonLeft}>
                    <Text style={styles.newMatchButtonTitle}>
                      Nouveau Match
                    </Text>
                    <Text style={styles.newMatchButtonSubtitle}>
                      {isGuest ? "Mode Invité" : `Pour ${activeTeamName}`}
                    </Text>
                  </View>
                  <View style={styles.newMatchButtonIcon}>
                    <MaterialCommunityIcons
                      name="plus"
                      size={24}
                      color="#FFFFFF"
                    />
                  </View>
                </TouchableOpacity>
              )}

              {/* Recent History */}
              <DashboardRecentMatches
                matches={recentMatches}
                colors={colors}
                onMatchPress={navigateToMatchDetails}
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
  teamSelectorLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  picker: {
    ...Platform.select({
      ios: {
        height: 58,
        width: '100%',
      },
      android: {
        flex: 1,
        height: 58,
      },
    }),
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
  },
  newMatchButtonLeft: {
    flex: 1,
  },
  newMatchButtonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  newMatchButtonSubtitle: {
    fontSize: 14,
    color: "#FFFFFFCC",
  },
  newMatchButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF33",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 70,
    paddingRight: 24,
  },
  profileMenuContainer: {
    minWidth: 200,
  },
  profileMenu: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  profileMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  profileMenuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  clubSwitcherOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  clubSwitcherContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  clubSwitcherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  clubSwitcherTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  clubSwitcherList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  clubSwitcherItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  clubSwitcherItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  clubSwitcherLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clubSwitcherLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  clubSwitcherItemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  clubSwitcherItemAcronym: {
    fontSize: 14,
    marginTop: 2,
  },
  clubSwitcherCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  clubSwitcherCreateButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
