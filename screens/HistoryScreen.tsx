import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import {
  SLATE_COLORS,
  BRAND_COLORS,
  COMMON_COLORS,
} from "../src/theme/clubDefaults";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { ServiceFactory } from "../services/ServiceFactory";
import { Match } from "../src/models/types";
import { Club } from "../models/Club";
import { Team } from "../models/Team";
import JerseyIconSimple from "../components/icons/JerseySimpleIcon";
import { supabase } from "../src/config/supabase";
import { ROUTES } from "../constants/routes";

interface HistoryScreenProps {
  navigation: any;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

  const isGuest = !user;

  useEffect(() => {
    loadHistoryData();
  }, [user?.id]);

  const loadHistoryData = async () => {
    try {
      setLoading(true);

      const matchRepo = new MatchRepository();

      // 1. Load LOCAL matches
      const allLocalMatches = await matchRepo.getAllMatches();
      let localMatches = allLocalMatches.filter((m) => !m.synced_to_server);

      // 2. Load SERVER matches if user authenticated
      let serverMatches: Match[] = [];
      if (user) {
        try {
          const { data: serverMatchesData, error } = await supabase
            .from("matches")
            .select("*")
            .eq("created_by", user.id)
            .order("played_at", { ascending: false });

          if (!error && serverMatchesData) {
            serverMatches = serverMatchesData.map((sm, index) => ({
              id: -(index + 1), // Use negative IDs for server matches
              supabase_id: sm.id, // Keep Supabase UUID for navigation
              my_team_name: sm.my_team_name,
              opponent_name: sm.opponent_name,
              is_home: sm.is_home ? 1 : 0,
              status: sm.status || "completed" as const,
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
            } as any));
          }
        } catch (error) {
          console.error("Error loading server matches:", error);
        }
      }

      // 3. Merge and sort
      let allMatches = [...localMatches, ...serverMatches];

      // Sort by date (most recent first)
      allMatches.sort(
        (a, b) =>
          new Date(b.ended_at || b.created_at).getTime() -
          new Date(a.ended_at || a.created_at).getTime()
      );

      setMatches(allMatches);
    } catch (error) {
      console.error("Error loading history data:", error);
    } finally {
      setLoading(false);
    }
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
        {/* Title */}
        <Text style={[styles.title, { color: textPrimary }]}>
          Historique des matchs
        </Text>

        {/* Matches List */}
        {matches.length === 0 ? (
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
              size={40}
              color={textSecondary}
              style={{ opacity: 0.5 }}
            />
            <Text style={[styles.emptyStateText, { color: textSecondary }]}>
              Aucun match enregistré.
            </Text>
          </View>
        ) : (
          <View style={styles.matchesList}>
            {matches.map((match, index) => (
              <MatchCard
                key={`match-${match.id}-${index}`}
                match={match}
                isDark={isDark}
                surfaceColor={surfaceColor}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                borderColor={borderColor}
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
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

interface MatchCardProps {
  match: Match;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  onPress: () => void;
}

function MatchCard({
  match,
  isDark,
  surfaceColor,
  textPrimary,
  textSecondary,
  borderColor,
  onPress,
}: MatchCardProps) {
  const scoreA = match.my_team_score || 0;
  const scoreB = match.opponent_score || 0;
  const isWin = scoreA > scoreB;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Determine location label - for now we don't have this info, so we skip it
  // In the future, you could add a location field to the Match model

  return (
    <TouchableOpacity
      style={[styles.matchCard, { backgroundColor: surfaceColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Date and Location */}
      <View style={styles.matchCardHeader}>
        <View style={styles.matchCardInfo}>
          <MaterialCommunityIcons
            name="calendar"
            size={12}
            color={textSecondary}
          />
          <Text style={[styles.matchCardInfoText, { color: textSecondary }]}>
            {formatDate(match.ended_at || match.created_at)}
          </Text>
        </View>
        <View style={styles.matchCardInfo}>
          <MaterialCommunityIcons
            name="map-marker"
            size={12}
            color={textSecondary}
          />
          <Text style={[styles.matchCardInfoText, { color: textSecondary }]}>
            {match.is_home ? 'Domicile' : 'Extérieur'}
          </Text>
        </View>
      </View>

      {/* Scores */}
      <View style={styles.matchScores}>
        {/* Team A (Us) */}
        <View style={styles.matchTeamContainer}>
          <Text style={[styles.matchScoreValue, { color: isWin ? textPrimary : isDark ? SLATE_COLORS[500] : SLATE_COLORS[400] }]}>
            {scoreA}
          </Text>
          <Text
            style={[styles.matchTeamLabel, { color: textSecondary }]}
            numberOfLines={1}
          >
            {match.my_team_name || "NOUS"}
          </Text>
        </View>

        {/* VS */}
        <View
          style={[
            styles.matchVs,
            {
              backgroundColor: isDark ? SLATE_COLORS[950] : SLATE_COLORS[100],
            },
          ]}
        >
          <Text style={[styles.matchVsText, { color: textSecondary }]}>VS</Text>
        </View>

        {/* Team B (Opponent) */}
        <View style={styles.matchTeamContainer}>
          <Text
            style={[
              styles.matchScoreValue,
              { color: isWin ? (isDark ? SLATE_COLORS[500] : SLATE_COLORS[400]) : textPrimary },
            ]}
          >
            {scoreB}
          </Text>
          <Text
            style={[styles.matchTeamLabel, { color: textSecondary }]}
            numberOfLines={1}
          >
            {match.opponent_name}
          </Text>
        </View>
      </View>

      {/* Result and Action */}
      <View
        style={[
          styles.matchCardFooter,
          { borderTopColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100] },
        ]}
      >
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

        <TouchableOpacity style={styles.matchAnalyzeButton} onPress={onPress}>
          <MaterialCommunityIcons
            name="chart-bar"
            size={14}
            color={BRAND_COLORS[500]}
          />
          <Text style={[styles.matchAnalyzeText, { color: BRAND_COLORS[500] }]}>
            ANALYSER
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  teamSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    marginBottom: 24,
  },
  teamSelectorIcon: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 58,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 80,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  matchesList: {
    gap: 16,
  },
  matchCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  matchCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  matchCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchCardInfoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  matchScores: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchTeamContainer: {
    flex: 1,
    alignItems: "center",
  },
  matchScoreValue: {
    fontSize: 28,
    fontWeight: "900",
  },
  matchTeamLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },
  matchVs: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginHorizontal: 8,
  },
  matchVsText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  matchCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
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
  matchAnalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  matchAnalyzeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
