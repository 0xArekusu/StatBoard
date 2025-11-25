import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  BackHandler,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme/clubDefaults";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ServiceFactory } from "../services/ServiceFactory";
import { Match } from "../src/models/types";
import { Club } from "../models/Club";
import { Team } from "../models/Team";
import Logo from "../components/icons/Logo";
import JerseyIcon from "../components/icons/JerseyIcon";
import { supabase } from "../src/config/supabase";

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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("📊 DashboardScreen: Loading dashboard data...");

      const matchRepo = new MatchRepository();

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
            serverMatches = serverMatchesData.map((sm, index) => ({
              id: sm.local_match_id || -(index + 1), // Use negative IDs for server matches without local_match_id
              team_a_name: sm.team_a,
              team_b_name: sm.team_b,
              team_mode: sm.team_mode,
              status: "completed" as const,
              match_format: sm.match_format,
              period_duration: sm.period_duration,
              club_id: sm.club_id,
              team_id: sm.team_id,
              current_period: 0,
              time_elapsed: 0,
              final_score_a: sm.final_score_a,
              final_score_b: sm.final_score_b,
              score_manually_adjusted: sm.score_manually_adjusted ? 1 : 0,
              synced_to_server: true,
              created_at: sm.played_at,
              started_at: sm.played_at,
              ended_at: sm.played_at,
              last_updated: sm.created_at,
            }));
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

            // Load teams for the club
            const teamService = ServiceFactory.getTeamService(supabase);
            const clubTeams = await teamService.getClubTeams(firstClub.id);

            console.log("✅ DashboardScreen: Teams fetched", {
              clubId: firstClub.id,
              teamsCount: clubTeams.length,
              teamNames: clubTeams.map((t) => t.name),
            });

            setTeams(clubTeams);

            // Select first team if available
            if (clubTeams.length > 0) {
              setActiveTeamId(clubTeams[0].id);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
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
      m.final_score_a !== undefined &&
      m.final_score_b !== undefined &&
      m.final_score_a > m.final_score_b
  ).length;
  const losses = completedMatches.filter(
    (m) =>
      m.final_score_a !== undefined &&
      m.final_score_b !== undefined &&
      m.final_score_a < m.final_score_b
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
              <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            </TouchableOpacity>

            {club && club.logoUrl ? (
              <View
                style={[styles.clubLogo, { borderColor: BRAND_COLORS[500] }]}
              >
                <Image
                  source={{ uri: club.logoUrl }}
                  style={styles.clubLogoImage}
                />
              </View>
            ) : (
              <View
                style={[
                  styles.clubLogo,
                  {
                    backgroundColor: isDark
                      ? SLATE_COLORS[800]
                      : SLATE_COLORS[100],
                    borderColor,
                  },
                ]}
              >
                {isGuest ? (
                  <Logo
                    width={24}
                    height={24}
                    primaryColor={COMMON_COLORS.black}
                    secondaryColor={COMMON_COLORS.white}
                    ballColor={BRAND_COLORS[500]}
                    ballBackgroundColor={BRAND_COLORS[900]}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="shield"
                    size={24}
                    color={SLATE_COLORS[400]}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* No Club CTA - Only for non-guests who haven't set up a club yet */}
        {!club && !isGuest && (
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
                name="shield"
                size={24}
                color={BRAND_COLORS[500]}
              />
            </View>
            <Text style={[styles.ctaTitle, { color: textPrimary }]}>
              Rejoignez ou créez un club
            </Text>
            <Text style={[styles.ctaDescription, { color: textSecondary }]}>
              Pour commencer à suivre les statistiques, vous devez associer
              votre compte à une équipe.
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
                  <JerseyIcon
                    width={20}
                    height={20}
                    primaryColor={BRAND_COLORS[500]}
                    secondaryColor={BRAND_COLORS[500]}
                    number=""
                  />
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

            {/* Action Bar - New Match Button */}
            <TouchableOpacity
              style={styles.newMatchButton}
              onPress={() => {
                // Navigation to be implemented later
              }}
            >
              <View style={styles.newMatchButtonLeft}>
                <Text style={styles.newMatchButtonTitle}>Nouveau Match</Text>
                <Text style={styles.newMatchButtonSubtitle}>
                  {activeTeamName ? `Pour ${activeTeamName}` : "Match Rapide"}
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
                    const scoreA = match.final_score_a || 0;
                    const scoreB = match.final_score_b || 0;
                    const isWin = scoreA > scoreB;

                    return (
                      <View
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
                      >
                        <View style={styles.matchCardLeft}>
                          <View
                            style={[
                              styles.matchIndicator,
                              {
                                backgroundColor: isWin ? "#10b981" : "#ef4444",
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
                                  {match.team_a_name || "Nous"}
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
                              vs {match.team_b_name}
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
                      </View>
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
                      style={[styles.emptyStateText, { color: textSecondary }]}
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
});
