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
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { ServiceFactory } from "../services/ServiceFactory";
import { Match } from "../src/models/types";
import { Club } from "../models/Club";
import { Team, TeamStatus } from "../models/Team";
import { supabase } from "../src/config/supabase";
import JerseyIconSimple from "../components/icons/JerseySimpleIcon";
import { ROUTES } from "../constants/routes";

interface DashboardScreenProps {
  navigation: any;
}

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

  // Reload dashboard data when user changes (login/logout/switch account)
  useEffect(() => {
    console.log("🔄 DashboardScreen: User changed, reloading dashboard", {
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
  }, [user?.id]); // Re-run when user ID changes

  // Reload dashboard data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 DashboardScreen: Screen focused, reloading data");
      loadDashboardData();
    }, [user?.id])
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

  const handleSignOut = async () => {
    await signOut();
    navigation.navigate("Auth");
  };

  const handleResumeMatch = () => {
    if (liveMatchToResume) {
      // Navigate to LiveMatch with the resume data
      navigation.navigate("LiveMatch", { matchId: liveMatchToResume.id });
      setLiveMatchToResume(null);
      setIsNewMatchFlow(false);
    }
  };

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

  const handleToggleTheme = () => {
    const nextMode = isDark ? "light" : "dark";
    setThemeMode(nextMode);
  };

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
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
      <Modal
        visible={!!liveMatchToResume}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLiveMatchToResume(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark
                  ? SLATE_COLORS[900]
                  : COMMON_COLORS.white,
              },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                {
                  backgroundColor: isDark
                    ? "rgba(239, 68, 68, 0.3)"
                    : "rgba(239, 68, 68, 0.1)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="basketball"
                size={32}
                color="#ef4444"
              />
            </View>

            <Text style={[styles.modalTitle, { color: textPrimary }]}>
              Match en cours détecté !
            </Text>

            <Text style={[styles.modalDescription, { color: textSecondary }]}>
              Il semble que le match contre{" "}
              <Text style={{ fontWeight: "bold" }}>
                {liveMatchToResume?.opponent_name}
              </Text>{" "}
              ne soit pas terminé.
            </Text>

            <TouchableOpacity
              style={[
                styles.modalPrimaryButton,
                { backgroundColor: BRAND_COLORS[600] },
              ]}
              onPress={handleResumeMatch}
            >
              <MaterialCommunityIcons
                name="play-circle"
                size={20}
                color={COMMON_COLORS.white}
              />
              <Text
                style={[
                  styles.modalPrimaryButtonText,
                  { color: COMMON_COLORS.white },
                ]}
              >
                Reprendre le match
              </Text>
            </TouchableOpacity>

            {/* Show "Nouveau match" button only when clicked from "Nouveau match" button */}
            {isNewMatchFlow ? (
              <TouchableOpacity
                style={[
                  styles.modalSecondaryButton,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : COMMON_COLORS.white,
                    borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200],
                  },
                ]}
                onPress={handleNewMatchConfirm}
              >
                <MaterialCommunityIcons
                  name="plus-circle"
                  size={20}
                  color={BRAND_COLORS[600]}
                />
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    { color: BRAND_COLORS[600] },
                  ]}
                >
                  Nouveau match
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.modalSecondaryButton,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : COMMON_COLORS.white,
                    borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200],
                  },
                ]}
                onPress={handleAbandonMatch}
              >
                <MaterialCommunityIcons
                  name="delete-forever"
                  size={20}
                  color="#ef4444"
                />
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    { color: "#ef4444" },
                  ]}
                >
                  Abandonner le match
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.modalSecondaryButton,
                {
                  backgroundColor: isDark
                    ? SLATE_COLORS[800]
                    : COMMON_COLORS.white,
                  borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200],
                },
              ]}
              onPress={() => {
                setLiveMatchToResume(null);
                setIsNewMatchFlow(false);
              }}
            >
              <Text
                style={[
                  styles.modalSecondaryButtonText,
                  { color: textSecondary },
                ]}
              >
                Ignorer pour l'instant
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[styles.greeting, { color: textPrimary }]}>
                Bonjour, {"\n"}
                <Text style={{ color: BRAND_COLORS[500] }}>{userName}</Text>
              </Text>
              <Text style={[styles.subGreeting, { color: textSecondary }]}>
                Prêt pour le match ?
              </Text>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleToggleTheme}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: surfaceColor,
                    borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={isDark ? "white-balance-sunny" : "moon-waning-crescent"}
                  size={20}
                  color={textPrimary}
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
                    borderColor,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={20}
                  color="#ef4444"
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
                      club && club.logoUrl ? BRAND_COLORS[500] : borderColor,
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
                  borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200],
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
              <Text style={[styles.ctaTitle, { color: textPrimary }]}>
                {!club
                  ? "Rejoignez ou créez un club"
                  : "Créez votre première équipe"}
              </Text>
              <Text style={[styles.ctaDescription, { color: textSecondary }]}>
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
                      backgroundColor: surfaceColor,
                      borderColor,
                    },
                  ]}
                >
                  <View style={styles.teamSelectorIcon}>
                    <JerseyIconSimple width={30} height={30} />
                  </View>
                  <Picker
                    selectedValue={activeTeamId || ""}
                    onValueChange={(value) => setActiveTeamId(value)}
                    style={[styles.picker, { color: textPrimary }]}
                    dropdownIconColor={textSecondary}
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
              <View style={styles.statsContainer}>
                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? `${SLATE_COLORS[800]}80`
                        : COMMON_COLORS.white,
                      borderColor,
                    },
                  ]}
                >
                  <View style={styles.statHeader}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={18}
                      color={BRAND_COLORS[500]}
                    />
                    <Text
                      style={[styles.statLabel, { color: BRAND_COLORS[500] }]}
                    >
                      MATCHS
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: textPrimary }]}>
                    {filteredMatches.length}
                  </Text>
                  <Text style={[styles.statSubtext, { color: textSecondary }]}>
                    Cette saison
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: isDark
                        ? `${SLATE_COLORS[800]}80`
                        : COMMON_COLORS.white,
                      borderColor,
                    },
                  ]}
                >
                  <View style={styles.statHeader}>
                    <MaterialCommunityIcons
                      name="trending-up"
                      size={18}
                      color="#10b981"
                    />
                    <Text style={[styles.statLabel, { color: "#10b981" }]}>
                      VICTOIRES
                    </Text>
                  </View>
                  <Text style={[styles.statValue, { color: textPrimary }]}>
                    {wins}{" "}
                    <Text
                      style={[styles.statValueSmall, { color: textSecondary }]}
                    >
                      / {losses}
                    </Text>
                  </Text>
                  <Text style={[styles.statSubtext, { color: textSecondary }]}>
                    Ratio V/D
                  </Text>
                </View>
              </View>

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
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                    Derniers Matchs
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("History")}
                  >
                    <Text
                      style={[styles.sectionLink, { color: BRAND_COLORS[500] }]}
                    >
                      Voir tout
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.matchesList}>
                  {recentMatches.length > 0 ? (
                    recentMatches.map((match, index) => {
                      const scoreA = match.my_team_score || 0;
                      const scoreB = match.opponent_score || 0;
                      const isWin = scoreA > scoreB;

                      return (
                        <TouchableOpacity
                          key={`match-${match.id}-${index}`}
                          style={[
                            styles.matchCard,
                            {
                              backgroundColor: isDark
                                ? SLATE_COLORS[900]
                                : COMMON_COLORS.white,
                              borderColor,
                            },
                          ]}
                          onPress={async () => {
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
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.matchCardLeft}>
                            <View
                              style={[
                                styles.matchIndicator,
                                {
                                  backgroundColor: isWin
                                    ? "#10b981"
                                    : "#ef4444",
                                },
                              ]}
                            />
                            <View style={styles.matchInfo}>
                              <View style={styles.matchScoreLine}>
                                <Text
                                  style={[
                                    styles.matchScore,
                                    { color: textPrimary },
                                  ]}
                                >
                                  {scoreA} - {scoreB}
                                </Text>
                                <View
                                  style={[
                                    styles.matchTeamBadge,
                                    {
                                      backgroundColor: isDark
                                        ? SLATE_COLORS[800]
                                        : SLATE_COLORS[100],
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.matchTeamBadgeText,
                                      { color: textSecondary },
                                    ]}
                                  >
                                    {match.my_team_name || "Nous"}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={[
                                  styles.matchOpponent,
                                  { color: textSecondary },
                                ]}
                                numberOfLines={1}
                              >
                                vs {match.opponent_name}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.matchCardRight}>
                            <Text
                              style={[
                                styles.matchDate,
                                { color: SLATE_COLORS[400] },
                              ]}
                            >
                              {formatDate(match.ended_at || match.created_at)}
                            </Text>
                            <View
                              style={[
                                styles.matchResultBadge,
                                {
                                  backgroundColor: isWin
                                    ? isDark
                                      ? "#10b98133"
                                      : "#10b9811A"
                                    : isDark
                                    ? "#ef444433"
                                    : "#ef44441A",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.matchResultText,
                                  { color: isWin ? "#10b981" : "#ef4444" },
                                ]}
                              >
                                {isWin ? "VICTOIRE" : "DÉFAITE"}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View
                      style={[
                        styles.emptyState,
                        {
                          backgroundColor: isDark
                            ? `${SLATE_COLORS[900]}80`
                            : SLATE_COLORS[100],
                          borderColor,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="calendar-blank"
                        size={32}
                        color={textSecondary}
                        style={{ opacity: 0.5 }}
                      />
                      <Text
                        style={[
                          styles.emptyStateText,
                          { color: textSecondary },
                        ]}
                      >
                        Aucun match récent
                      </Text>
                    </View>
                  )}
                </View>
              </View>
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
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  statValueSmall: {
    fontSize: 14,
    fontWeight: "normal",
  },
  statSubtext: {
    fontSize: 10,
    marginTop: 2,
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
    color: "rgba(255, 255, 255, 0.8)",
  },
  newMatchButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  matchesList: {
    gap: 12,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  matchCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  matchIndicator: {
    width: 6,
    height: 40,
    borderRadius: 3,
  },
  matchInfo: {
    flex: 1,
  },
  matchScoreLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  matchScore: {
    fontSize: 16,
    fontWeight: "bold",
  },
  matchTeamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchTeamBadgeText: {
    fontSize: 10,
  },
  matchOpponent: {
    fontSize: 12,
  },
  matchCardRight: {
    alignItems: "flex-end",
  },
  matchDate: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  matchResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchResultText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});
