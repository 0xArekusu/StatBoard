/**
 * MatchHistoryScreen
 *
 * Displays list of completed matches from both local SQLite and Supabase.
 * Features:
 * - View match history with scores
 * - Delete matches (local and server)
 * - Sync local matches to Supabase (subscription-based)
 * - Navigate to match details/summary
 * - Filter by club (if clubId provided in route params)
 * All database operations (SQLite and Supabase) are logged for debugging.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { Match } from "../src/models/types";
import { ActionData } from "../components/ActionSystem";
import { useMatchSync } from "../src/hooks/useMatchSync";
import SyncErrorModal from "../components/SyncErrorModal";
import { useAuth } from "../src/contexts/AuthContext";
import { supabase } from "../src/config/supabase";
import { resolveTeamNames } from "../src/utils/teamNameResolver";
import { determineClubTeam, isUUID } from "../src/utils/clubTeamDetection";
import { logInfo, logError } from "../utils/logger";
import {
  ActionType,
  ShotSpecification,
} from "../src/models/ActionTypes";
import { useTheme } from "../src/contexts/ThemeContext";
import { CommonStyles } from "../src/theme";

interface MatchWithDetails extends Match {
  scoreA: number;
  scoreB: number;
  actionsCount: number;
  isFromServer?: boolean; // Flag to identify server matches
  serverMatchId?: string; // UUID from Supabase
  team_a?: string; // Team A value (can be UUID or name)
  team_b?: string; // Team B value (can be UUID or name)
}

export default function MatchHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const clubId = (route.params as any)?.clubId || null;
  const { user } = useAuth();
  const { colors } = useTheme();
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncMatch, checkEligibility } = useMatchSync();
  const [syncingMatchId, setSyncingMatchId] = useState<number | null>(null);
  const [syncErrorModalVisible, setSyncErrorModalVisible] = useState(false);
  const [syncErrorReason, setSyncErrorReason] = useState("");
  const [syncErrorIsNotConnected, setSyncErrorIsNotConnected] = useState(false);
  const [syncErrorIsFreemium, setSyncErrorIsFreemium] = useState(false);

  /**
   * Log screen mount when user arrives on the view
   */
  useEffect(() => {
    logInfo('MatchHistoryScreen', '📱 Screen mounted - User arrived on match history view', {
      userId: user?.id,
      userEmail: user?.email,
      isAuthenticated: !!user,
      clubId: clubId,
      hasClubFilter: !!clubId
    });
  }, []);

  /**
   * Reload matches when screen gains focus
   * Ensures list is updated after creating/editing matches
   */
  useFocusEffect(
    React.useCallback(() => {
      logInfo('MatchHistoryScreen', '🔄 Screen focused, reloading matches');
      loadCompletedMatches();
    }, [])
  );

  /**
   * Load completed matches from both SQLite and Supabase
   * Combines local non-synced matches with server matches
   */
  const loadCompletedMatches = async () => {
    logInfo('MatchHistoryScreen', '💾 Loading completed matches from databases');

    try {
      const matchRepository = new MatchRepository();
      const actionRepository = new ActionRepository();

      // 1. Get LOCAL completed matches from SQLite (only non-synced ones)
      logInfo('MatchHistoryScreen', '💾 Fetching all local matches from SQLite');
      const allLocalMatches = await matchRepository.getAllMatches();
      logInfo('MatchHistoryScreen', '✅ Local matches fetched from SQLite', {
        totalLocalMatches: allLocalMatches.length
      });

      let completedLocalMatches = allLocalMatches.filter(
        (match) => match.status === "completed" && !match.synced_to_server
      );
      logInfo('MatchHistoryScreen', '✅ Filtered completed local matches (not synced)', {
        completedLocalCount: completedLocalMatches.length
      });

      // Filter by club if clubId is provided
      if (clubId) {
        completedLocalMatches = completedLocalMatches.filter(
          (match) => match.club_id === clubId
        );
        logInfo('MatchHistoryScreen', '🔍 Applied club filter', {
          clubId,
          matchesAfterFilter: completedLocalMatches.length
        });
      }

      // Collect all team identifiers from local matches for batch resolution
      const localTeamIdentifiers = new Set<string>();
      completedLocalMatches.forEach((match) => {
        localTeamIdentifiers.add(match.team_a_name);
        localTeamIdentifiers.add(match.team_b_name);
      });

      // Resolve team names in batch
      const localTeamNamesMap = await resolveTeamNames(
        Array.from(localTeamIdentifiers),
        supabase
      );

      // Load details for each LOCAL match
      const localMatchesWithDetails = await Promise.all(
        completedLocalMatches.map(async (match) => {
          const actions = await actionRepository.getActionsForMatch(match.id);

          // Use final scores if available, otherwise calculate from actions
          let scoreA = match.final_score_a || 0;
          let scoreB = match.final_score_b || 0;

          // If no final scores saved, calculate from actions
          if (scoreA === 0 && scoreB === 0 && actions.length > 0) {
            scoreA = actions
              .filter(
                (a) =>
                  a.team === "A" &&
                  a.action_type === ActionType.SHOT &&
                  a.specification === ShotSpecification.MADE
              )
              .reduce((sum, a) => {
                const points = a.points || 2;
                return sum + points;
              }, 0);

            scoreB = actions
              .filter(
                (a) =>
                  a.team === "B" &&
                  a.action_type === ActionType.SHOT &&
                  a.specification === ShotSpecification.MADE
              )
              .reduce((sum, a) => {
                const points = a.points || 2;
                return sum + points;
              }, 0);
          }

          // Resolve team names (UUID -> name)
          const teamAName = localTeamNamesMap.get(match.team_a_name) || match.team_a_name;
          const teamBName = localTeamNamesMap.get(match.team_b_name) || match.team_b_name;

          return {
            ...match,
            team_a_name: teamAName, // Override with resolved name
            team_b_name: teamBName, // Override with resolved name
            scoreA,
            scoreB,
            actionsCount: actions.length,
            isFromServer: false,
            team_a: match.team_a_name, // Keep original for UUID detection
            team_b: match.team_b_name, // Keep original for UUID detection
          };
        })
      );

      logInfo('MatchHistoryScreen', '✅ Local matches processed with details', {
        localMatchesWithDetailsCount: localMatchesWithDetails.length
      });

      // 2. Get SERVER matches from Supabase if user is authenticated
      let serverMatches: MatchWithDetails[] = [];
      if (user) {
        logInfo('MatchHistoryScreen', '📡 User authenticated, fetching server matches from Supabase', {
          userId: user.id
        });
        try {
          let query = supabase
            .from("matches")
            .select("*")
            .eq("created_by", user.id)
            .order("played_at", { ascending: false });

          // Filter by club if provided
          if (clubId) {
            query = query.eq("club_id", clubId);
          }

          const { data: serverMatchesData, error: serverError } = await query;

          if (serverError) {
            logError('MatchHistoryScreen', '❌ Error fetching server matches from Supabase', {
              userId: user.id,
              clubId,
              error: serverError.message
            });
          } else if (serverMatchesData) {
            logInfo('MatchHistoryScreen', '✅ Server matches fetched from Supabase', {
              serverMatchesCount: serverMatchesData.length,
              userId: user.id
            });

            // Collect all unique team UUIDs to fetch team names
            const teamUUIDs = new Set<string>();
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            serverMatchesData.forEach((sm) => {
              if (uuidRegex.test(sm.team_a)) teamUUIDs.add(sm.team_a);
              if (uuidRegex.test(sm.team_b)) teamUUIDs.add(sm.team_b);
            });

            // Fetch team names for all UUIDs
            const teamNamesMap = new Map<string, string>();
            if (teamUUIDs.size > 0) {
              const { data: teamsData } = await supabase
                .from("teams")
                .select("id, name")
                .in("id", Array.from(teamUUIDs));

              if (teamsData) {
                teamsData.forEach((team) => {
                  teamNamesMap.set(team.id, team.name);
                });
              }
            }

            // Transform server matches to MatchWithDetails format
            serverMatches = serverMatchesData.map((sm) => {
              // Resolve team names: if UUID, use team name, otherwise use string value
              const teamAName = teamNamesMap.get(sm.team_a) || sm.team_a;
              const teamBName = teamNamesMap.get(sm.team_b) || sm.team_b;

              return {
                id: sm.local_match_id || 0, // Use local_match_id or 0 as placeholder
                team_a_name: teamAName,
                team_b_name: teamBName,
                team_a: sm.team_a,
                team_b: sm.team_b,
                team_mode: sm.team_mode,
                status: "completed" as const,
                match_format: sm.match_format,
                period_duration: sm.period_duration,
                club_id: sm.club_id,
                current_period: 0,
                time_elapsed: 0,
                final_score_a: sm.final_score_a,
                final_score_b: sm.final_score_b,
                score_manually_adjusted: sm.score_manually_adjusted ? 1 : 0,
                synced_to_server: true, // Server matches are by definition synced
                created_at: sm.played_at,
                started_at: sm.played_at,
                ended_at: sm.played_at,
                last_updated: sm.created_at,
                scoreA: sm.final_score_a,
                scoreB: sm.final_score_b,
                actionsCount: 0, // We'll get this from match_players if needed
                isFromServer: true,
                serverMatchId: sm.id,
              };
            });
          }
        } catch (error) {
          logError('MatchHistoryScreen', '❌ Error loading server matches', {
            userId: user.id,
            error: error instanceof Error ? error.message : error
          });
        }
      }

      // 3. Merge LOCAL and SERVER matches into combined list
      const allMatches = [...localMatchesWithDetails, ...serverMatches];
      logInfo('MatchHistoryScreen', '🔀 Merged local and server matches', {
        localMatchesCount: localMatchesWithDetails.length,
        serverMatchesCount: serverMatches.length,
        totalMatchesCount: allMatches.length
      });

      // Sort by date (most recent first)
      allMatches.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      logInfo('MatchHistoryScreen', '✅ Matches loaded and ready to display', {
        totalMatchesToDisplay: allMatches.length
      });
      setMatches(allMatches);
    } catch (error) {
      logError('MatchHistoryScreen', '❌ Error loading completed matches', {
        error: error instanceof Error ? error.message : error,
        clubId
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle match press to view details/summary
   * Loads match data from SQLite or Supabase based on source
   */
  const handleMatchPress = async (match: MatchWithDetails) => {
    logInfo('MatchHistoryScreen', '👆 User pressed on match', {
      matchId: match.id,
      isFromServer: match.isFromServer,
      serverMatchId: match.serverMatchId,
      teamA: match.team_a_name,
      teamB: match.team_b_name
    });

    try {
      let actionDataList: ActionData[] = [];
      let players: any[] = [];
      let matchPlayers: any[] | null = null;

      if (match.isFromServer && match.serverMatchId) {
        // Load match data from Supabase
        logInfo('MatchHistoryScreen', '📡 Loading match data from Supabase', {
          serverMatchId: match.serverMatchId
        });

        // First, load match details to get team_a and team_b UUIDs
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("team_a, team_b")
          .eq("id", match.serverMatchId)
          .single();

        if (matchError) {
          logError('MatchHistoryScreen', '❌ Error loading match from Supabase', {
            serverMatchId: match.serverMatchId,
            error: matchError.message
          });
        } else if (matchData) {
          // Update match with team_a and team_b from server
          match.team_a = matchData.team_a;
          match.team_b = matchData.team_b;
          logInfo('MatchHistoryScreen', '✅ Match team IDs loaded', {
            serverMatchId: match.serverMatchId,
            teamA: matchData.team_a,
            teamB: matchData.team_b
          });
        }

        const { data, error } = await supabase
          .from("match_players")
          .select("*")
          .eq("match_id", match.serverMatchId);

        matchPlayers = data;

        if (error) {
          logError('MatchHistoryScreen', '❌ Error loading match players from Supabase', {
            serverMatchId: match.serverMatchId,
            error: error.message
          });
          Alert.alert(
            "Erreur",
            "Impossible de charger les données du match depuis le serveur."
          );
          return;
        }

        if (matchPlayers) {
          logInfo('MatchHistoryScreen', '✅ Match players loaded from Supabase', {
            serverMatchId: match.serverMatchId,
            playersCount: matchPlayers.length
          });

          // Convert server match players to expected format
          players = matchPlayers.map((mp) => ({
            id: mp.player_number,
            num: mp.player_number,
            name: mp.player_name,
            team: mp.team,
            isSubstitute: !mp.is_starter,
            photoUrl: mp.photo_url,
          }));

          // Extract all actions from all players
          matchPlayers.forEach((mp) => {
            if (mp.actions && Array.isArray(mp.actions)) {
              const playerActions: ActionData[] = mp.actions.map(
                (action: any) => ({
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
                })
              );
              actionDataList.push(...playerActions);
            }
          });

          logInfo('MatchHistoryScreen', '✅ Actions extracted from server players', {
            serverMatchId: match.serverMatchId,
            actionsCount: actionDataList.length
          });
        }
      } else {
        // Load match data from local SQLite database
        logInfo('MatchHistoryScreen', '💾 Loading match data from SQLite', {
          matchId: match.id
        });

        const actionRepository = new ActionRepository();
        const matchPlayerRepository = new MatchPlayerRepository();

        const actions = await actionRepository.getActionsForMatch(match.id);
        const matchPlayers = await matchPlayerRepository.getPlayersForMatch(
          match.id
        );

        // Convert actions to ActionData format
        actionDataList = actions.map((action) => ({
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

        // Convert match players to expected format
        players = matchPlayers.map((mp) => ({
          id: mp.player_number,
          num: mp.player_number,
          name: mp.player_name,
          team: mp.team,
          isSubstitute: !mp.is_starter,
          photoUrl: mp.photo_url,
        }));

        logInfo('MatchHistoryScreen', '✅ Match data loaded from SQLite', {
          matchId: match.id,
          actionsCount: actionDataList.length,
          playersCount: players.length
        });
      }

      // Determine club team based on team_mode configuration and UUID detection
      const clubTeamLetter = determineClubTeam(match.team_mode, match.team_a, match.team_b);

      logInfo('MatchHistoryScreen', '✅ Navigating to match summary', {
        matchId: match.id,
        clubTeamLetter,
        actionsCount: actionDataList.length,
        playersCount: players.length
      });

      // Navigate to MatchSummary screen with match data
      (navigation.navigate as any)("MatchSummary", {
        matchId: match.id,
        teamA: match.team_a_name,
        teamB: match.team_b_name,
        scoreA: match.final_score_a || match.scoreA,
        scoreB: match.final_score_b || match.scoreB,
        actions: actionDataList,
        matchFormat: match.match_format,
        periodDuration: match.period_duration,
        teamMode: match.team_mode,
        players,
        fromHistory: true, // Indicate this is from history (read-only mode)
        scoreWasManuallyAdjusted: match.score_manually_adjusted === 1,
        clubTeamOverride: clubTeamLetter, // Override club team detection
        teamAId: isUUID(match.team_a) ? match.team_a : null,
        teamBId: isUUID(match.team_b) ? match.team_b : null,
      });
    } catch (error) {
      logError('MatchHistoryScreen', '❌ Error loading match details', {
        matchId: match.id,
        isFromServer: match.isFromServer,
        error: error instanceof Error ? error.message : error
      });
      Alert.alert("Erreur", "Impossible de charger les détails du match.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (match: Match) => {
    if (!match.started_at || !match.ended_at) {
      // Calculate duration based on match format and period duration
      const totalPeriods = match.match_format === "2_halves" ? 2 : 4;
      const totalMinutes = totalPeriods * (match.period_duration / 60); // Convert seconds to minutes
      return `~${totalMinutes} min`;
    }
    const start = new Date(match.started_at).getTime();
    const end = new Date(match.ended_at).getTime();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    return `${minutes} min`;
  };

  /**
   * Handle match deletion with confirmation
   * Deletes from Supabase or SQLite based on match source
   */
  const handleDeleteMatch = async (match: MatchWithDetails) => {
    logInfo('MatchHistoryScreen', '🗑️ User requested to delete match', {
      matchId: match.id,
      isFromServer: match.isFromServer,
      serverMatchId: match.serverMatchId,
      teamA: match.team_a_name,
      teamB: match.team_b_name
    });

    Alert.alert(
      "Supprimer le match",
      `Êtes-vous sûr de vouloir supprimer le match ${match.team_a_name} vs ${match.team_b_name} ?\n\nCette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => {
            logInfo('MatchHistoryScreen', 'ℹ️ Match deletion cancelled by user');
          }
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              // If match is from server, delete from Supabase
              if (match.isFromServer && match.serverMatchId) {
                logInfo('MatchHistoryScreen', '📡 Deleting match from Supabase', {
                  serverMatchId: match.serverMatchId
                });

                const { error: deleteMatchError } = await supabase
                  .from("matches")
                  .delete()
                  .eq("id", match.serverMatchId);

                if (deleteMatchError) {
                  logError('MatchHistoryScreen', '❌ Error deleting match from Supabase', {
                    serverMatchId: match.serverMatchId,
                    error: deleteMatchError.message
                  });
                  Alert.alert(
                    "Erreur",
                    "Impossible de supprimer le match du serveur."
                  );
                  return;
                }

                logInfo('MatchHistoryScreen', '✅ Match deleted from Supabase successfully', {
                  serverMatchId: match.serverMatchId
                });
              } else {
                // Delete from local SQLite database
                logInfo('MatchHistoryScreen', '💾 Deleting match from SQLite', {
                  matchId: match.id
                });

                const matchRepository = new MatchRepository();
                const actionRepository = new ActionRepository();
                const matchPlayerRepository = new MatchPlayerRepository();

                await actionRepository.deleteActionsForMatch(match.id);
                await matchPlayerRepository.deletePlayersForMatch(match.id);
                await matchRepository.delete(match.id);

                logInfo('MatchHistoryScreen', '✅ Match deleted from SQLite successfully', {
                  matchId: match.id
                });
              }

              // Reload matches list
              await loadCompletedMatches();
            } catch (error) {
              logError('MatchHistoryScreen', '❌ Error deleting match', {
                matchId: match.id,
                isFromServer: match.isFromServer,
                error: error instanceof Error ? error.message : error
              });
              Alert.alert("Erreur", "Impossible de supprimer le match.");
            }
          },
        },
      ]
    );
  };

  const handleSyncMatch = async (match: MatchWithDetails) => {
    // Check eligibility first
    const eligibility = await checkEligibility(match.id);

    if (!eligibility.canSync) {
      // Determine the type of error
      const isNotConnected = !user;
      const isFreemium = !!user && (eligibility.reason?.includes("abonnement") || false);

      setSyncErrorReason(eligibility.reason || "Une erreur est survenue");
      setSyncErrorIsNotConnected(isNotConnected);
      setSyncErrorIsFreemium(isFreemium);
      setSyncErrorModalVisible(true);
      return;
    }

    // Show confirmation
    Alert.alert(
      "Synchroniser avec le serveur",
      "Voulez-vous sauvegarder ce match sur le serveur ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Synchroniser",
          onPress: async () => {
            setSyncingMatchId(match.id);
            const result = await syncMatch(match.id);
            setSyncingMatchId(null);

            if (result.success) {
              Alert.alert("Succès", "Match synchronisé avec succès !", [
                { text: "OK" },
              ]);
              // Reload matches to update sync status
              await loadCompletedMatches();
            } else {
              Alert.alert(
                "Erreur",
                result.error || "Impossible de synchroniser le match"
              );
            }
          },
        },
      ]
    );
  };

  const renderMatchItem = ({ item }: { item: MatchWithDetails }) => {
    const winner =
      item.scoreA > item.scoreB ? "A" : item.scoreB > item.scoreA ? "B" : null;

    const isDraw = !winner;

    // Determine which team is the club team
    const clubTeam = determineClubTeam(item.team_mode, item.team_a, item.team_b);

    const isClubMatch = clubTeam !== null;
    const clubLost = isClubMatch && winner !== null && winner !== clubTeam;

    // Log match render details for debugging win/loss detection and club team identification
    logInfo('MatchHistoryScreen', '🏀 Rendering match item', {
      matchId: item.id,
      teamA: item.team_a_name,
      teamB: item.team_b_name,
      scoreA: item.scoreA,
      scoreB: item.scoreB,
      winner,
      teamMode: item.team_mode,
      teamA_uuid: item.team_a,
      teamB_uuid: item.team_b,
      clubTeam,
      isClubMatch,
      clubLost,
      isFromServer: item.isFromServer
    });

    return (
      /* Match card - tap to view details */
      <TouchableOpacity
        style={[styles.matchCard, {
          backgroundColor: colors.surface,
          borderColor: colors.border
        }]}
        onPress={() => handleMatchPress(item)}
      >
        {/* Match header - date and duration */}
        <View style={styles.matchHeader}>
          <Text style={[styles.matchDate, { color: colors.text.secondary }]}>{formatDate(item.created_at)}</Text>
          <Text style={[styles.matchDuration, { color: colors.text.tertiary }]}>{formatDuration(item)}</Text>
        </View>

        {/* Match score section - teams and scores */}
        <View style={[styles.matchScore, { backgroundColor: colors.surfaceVariant }]}>
          {/* Team A */}
          <View style={styles.teamContainer}>
            <Text
              style={[
                styles.teamName,
                { color: colors.text.secondary },
                winner === "A" && !clubLost && styles.winnerText,
                clubLost && winner === "A" && styles.loserText,
              ]}
            >
              {item.team_a_name}
            </Text>
            <Text
              style={[
                styles.score,
                { color: colors.text.primary },
                winner === "A" && !clubLost && styles.winnerScore,
                clubLost && winner === "A" && styles.loserScore,
              ]}
            >
              {item.scoreA}
            </Text>
          </View>

          <Text style={[styles.scoreSeparator, { color: colors.text.disabled }]}>-</Text>

          {/* Team B */}
          <View style={styles.teamContainer}>
            <Text
              style={[
                styles.teamName,
                { color: colors.text.secondary },
                winner === "B" && !clubLost && styles.winnerText,
                clubLost && winner === "B" && styles.loserText,
              ]}
            >
              {item.team_b_name}
            </Text>
            <Text
              style={[
                styles.score,
                { color: colors.text.primary },
                winner === "B" && !clubLost && styles.winnerScore,
                clubLost && winner === "B" && styles.loserScore,
              ]}
            >
              {item.scoreB}
            </Text>
          </View>
        </View>

        {/* Winner badge - shows winning team with appropriate styling (green if club wins, red if club loses) */}
        {winner && (
          <View
            style={[
              styles.winnerBadge,
              clubLost && styles.loserWinnerBadge, // n'appliquer que si le club perd
            ]}
          >
            <Text
              style={[
                styles.winnerBadgeText,
                clubLost
                  ? styles.loserText
                  : styles.winnerText, // Vert si le club gagne OU si match neutre
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {(clubLost ? "😔 " : "🏆 ") +
                (winner === "A" ? item.team_a_name : item.team_b_name) +
                " remporte le match"}
            </Text>
          </View>
        )}

        {/* Draw badge - shown for tied matches */}
        {isDraw && (
          <View style={styles.drawBadge}>
            <Text style={styles.drawBadgeText}>Match nul</Text>
          </View>
        )}

        {/* Match footer - format info and action buttons */}
        <View style={styles.matchFooter}>
          <Text style={styles.matchInfo}>
            {item.match_format === "2_halves" ? "2 mi-temps" : "4 quarts"} •{" "}
            {item.period_duration / 60} min
          </Text>

          {/* Sync status badge - shows if match is synced to Supabase */}
          {item.isFromServer || item.synced_to_server ? (
            <View style={styles.syncedBadge}>
              <Ionicons name="cloud-done-outline" size={12} color="#4CAF50" />
              <Text style={styles.syncedText}>Synchronisé</Text>
            </View>
          ) : (
            <View style={styles.notSyncedBadge}>
              <Ionicons
                name="cloud-offline-outline"
                size={12}
                color="#FF9800"
              />
              <Text style={styles.notSyncedText}>Non synchronisé</Text>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {/* Sync button - only show if not synced and not from server */}
          {!item.synced_to_server && !item.isFromServer && (
            <TouchableOpacity
              style={styles.syncButton}
              onPress={(e) => {
                e.stopPropagation();
                handleSyncMatch(item);
              }}
              disabled={syncingMatchId === item.id}
            >
              {syncingMatchId === item.id ? (
                <ActivityIndicator size="small" color="#9C27B0" />
              ) : (
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={20}
                  color="#9C27B0"
                />
              )}
            </TouchableOpacity>
          )}

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteMatch(item);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[CommonStyles.header, {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border
        }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
            <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>Retour</Text>
          </TouchableOpacity>
          <Text style={[CommonStyles.headerTitle, { color: colors.text.primary }]}>Historique des matchs</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with back button and title */}
      <View style={[CommonStyles.header, {
        backgroundColor: colors.surface,
        borderBottomColor: colors.border
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
          <Text style={[styles.backButtonText, { color: colors.text.secondary }]}>Retour</Text>
        </TouchableOpacity>
        <Text style={[CommonStyles.headerTitle, { color: colors.text.primary }]}>Historique des matchs</Text>
        <View style={styles.backButton} />
      </View>

      {/* Empty state - shown when no matches exist */}
      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏀</Text>
          <Text style={styles.emptyTitle}>Aucun match terminé</Text>
          <Text style={styles.emptySubtitle}>
            Les matchs terminés apparaîtront ici
          </Text>
        </View>
      ) : (
        /* Matches list - displays all completed matches from SQLite and Supabase */
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) =>
            item.isFromServer && item.serverMatchId
              ? item.serverMatchId
              : item.id.toString()
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Sync Error Modal - shown when match sync fails due to subscription limits */}
      <SyncErrorModal
        visible={syncErrorModalVisible}
        reason={syncErrorReason}
        isNotConnected={syncErrorIsNotConnected}
        isFreemium={syncErrorIsFreemium}
        onClose={() => setSyncErrorModalVisible(false)}
        onUpgrade={() => {
          // TODO: Navigate to subscription screen
          logInfo('MatchHistoryScreen', 'ℹ️ User requested subscription upgrade from sync error modal');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  listContainer: {
    padding: 16,
  },
  matchCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
    overflow: "hidden",
  },
  matchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchDate: {
    fontSize: 12,
    fontWeight: "600",
  },
  matchDuration: {
    fontSize: 12,
  },
  matchScore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  matchScoreLost: {
    backgroundColor: "#ffebee",
    borderWidth: 2,
    borderColor: "#F44336",
  },
  teamContainer: {
    alignItems: "center",
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "600",
  },
  score: {
    fontSize: 32,
    fontWeight: "bold",
  },
  scoreSeparator: {
    fontSize: 24,
    marginHorizontal: 16,
  },
  normalText: {
    color: "#666",
  },
  winnerText: {
    color: "#4CAF50",
  },
  winnerScore: {
    color: "#4CAF50",
  },
  loserText: {
    color: "#F44336",
  },
  loserScore: {
    color: "#F44336",
  },
  winnerBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  loserWinnerBadge: {
    backgroundColor: "#ffebee",
    borderColor: "#F44336",
    borderWidth: 2,
  },
  winnerBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    flexShrink: 1,
  },
  loserBadge: {
    backgroundColor: "#ffebee",
  },
  loserBadgeText: {
    color: "#F44336",
  },
  drawBadge: {
    backgroundColor: "#fff3e0",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  drawBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF9800",
  },
  matchFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchInfo: {
    fontSize: 12,
    color: "#999",
  },
  syncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
  },
  syncedText: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "600",
  },
  notSyncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff3e0",
    borderRadius: 6,
  },
  notSyncedText: {
    fontSize: 10,
    color: "#FF9800",
    fontWeight: "600",
  },
  actionButtons: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3e5f5",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
