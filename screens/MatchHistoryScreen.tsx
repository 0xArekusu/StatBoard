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
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
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

interface MatchWithDetails extends Match {
  scoreA: number;
  scoreB: number;
  actionsCount: number;
  isFromServer?: boolean; // Flag to identify server matches
  serverMatchId?: string; // UUID from Supabase
}

export default function MatchHistoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const clubId = (route.params as any)?.clubId || null;
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSyncing, syncMatch, checkEligibility } = useMatchSync();
  const [syncingMatchId, setSyncingMatchId] = useState<number | null>(null);
  const [syncErrorModalVisible, setSyncErrorModalVisible] = useState(false);
  const [syncErrorReason, setSyncErrorReason] = useState("");
  const [syncErrorIsNotConnected, setSyncErrorIsNotConnected] = useState(false);
  const [syncErrorIsFreemium, setSyncErrorIsFreemium] = useState(false);

  // Reload matches when screen gains focus (to refresh after creating new match)
  useFocusEffect(
    React.useCallback(() => {
      loadCompletedMatches();
    }, [])
  );

  const loadCompletedMatches = async () => {
    console.log('📂 [MatchHistory] Loading completed matches...');
    try {
      const matchRepository = new MatchRepository();
      const actionRepository = new ActionRepository();

      // 1. Get LOCAL completed matches (only non-synced ones)
      const allLocalMatches = await matchRepository.getAllMatches();
      console.log('📂 [MatchHistory] All local matches:', allLocalMatches.length);

      let completedLocalMatches = allLocalMatches.filter(
        (match) => match.status === "completed" && !match.synced_to_server
      );
      console.log('📂 [MatchHistory] Completed local matches (not synced):', completedLocalMatches.length);

      // Filter by club if clubId is provided
      if (clubId) {
        completedLocalMatches = completedLocalMatches.filter((match) => match.club_id === clubId);
        console.log('📂 [MatchHistory] After club filter:', completedLocalMatches.length);
      }

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
                  a.action_type === "tir" &&
                  a.specification === "reussi"
              )
              .reduce((sum, a) => {
                const points = a.points || 2;
                return sum + points;
              }, 0);

            scoreB = actions
              .filter(
                (a) =>
                  a.team === "B" &&
                  a.action_type === "tir" &&
                  a.specification === "reussi"
              )
              .reduce((sum, a) => {
                const points = a.points || 2;
                return sum + points;
              }, 0);
          }

          return {
            ...match,
            scoreA,
            scoreB,
            actionsCount: actions.length,
            isFromServer: false,
          };
        })
      );

      console.log('📂 [MatchHistory] Local matches loaded:', localMatchesWithDetails.length);

      // 2. Get SERVER matches if user is connected
      let serverMatches: MatchWithDetails[] = [];
      if (user) {
        console.log('☁️ [MatchHistory] User connected, fetching server matches...');
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
            console.error("❌ [MatchHistory] Error fetching server matches:", serverError);
          } else if (serverMatchesData) {
            console.log('☁️ [MatchHistory] Server matches fetched:', serverMatchesData.length);

            // Collect all unique team UUIDs to fetch team names
            const teamUUIDs = new Set<string>();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            serverMatchesData.forEach(sm => {
              if (uuidRegex.test(sm.team_a)) teamUUIDs.add(sm.team_a);
              if (uuidRegex.test(sm.team_b)) teamUUIDs.add(sm.team_b);
            });

            // Fetch team names for all UUIDs
            const teamNamesMap = new Map<string, string>();
            if (teamUUIDs.size > 0) {
              const { data: teamsData } = await supabase
                .from('teams')
                .select('id, name')
                .in('id', Array.from(teamUUIDs));

              if (teamsData) {
                teamsData.forEach(team => {
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
              synced_to_server: 1,
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
          console.error("Error loading server matches:", error);
        }
      }

      // 3. Merge LOCAL and SERVER matches
      const allMatches = [...localMatchesWithDetails, ...serverMatches];
      console.log('🔀 [MatchHistory] Merged matches:', {
        local: localMatchesWithDetails.length,
        server: serverMatches.length,
        total: allMatches.length
      });

      // Sort by date (most recent first)
      allMatches.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ [MatchHistory] Final matches to display:', allMatches.length);
      setMatches(allMatches);
    } catch (error) {
      console.error("Error loading completed matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPress = async (match: MatchWithDetails) => {
    try {
      let actionDataList: ActionData[] = [];
      let players: any[] = [];
      let matchPlayers: any[] | null = null;

      if (match.isFromServer && match.serverMatchId) {
        // Load data from Supabase
        console.log('☁️ [MatchHistory] Loading match data from server:', match.serverMatchId);

        const { data, error } = await supabase
          .from("match_players")
          .select("*")
          .eq("match_id", match.serverMatchId);

        matchPlayers = data;

        if (error) {
          console.error("❌ [MatchHistory] Error loading match players from server:", error);
          Alert.alert("Erreur", "Impossible de charger les données du match depuis le serveur.");
          return;
        }

        if (matchPlayers) {
          console.log('☁️ [MatchHistory] Loaded', matchPlayers.length, 'players from server');

          // Convert server match players to expected format
          players = matchPlayers.map(mp => ({
            id: mp.player_number,
            num: mp.player_number,
            name: mp.player_name,
            team: mp.team,
            isSubstitute: !mp.is_starter,
          }));

          // Extract all actions from all players
          matchPlayers.forEach(mp => {
            if (mp.actions && Array.isArray(mp.actions)) {
              const playerActions: ActionData[] = mp.actions.map((action: any) => ({
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

          console.log('☁️ [MatchHistory] Loaded', actionDataList.length, 'actions from server');
        }
      } else {
        // Load data from local database
        console.log('📂 [MatchHistory] Loading match data from local DB:', match.id);

        const actionRepository = new ActionRepository();
        const matchPlayerRepository = new MatchPlayerRepository();

        const actions = await actionRepository.getActionsForMatch(match.id);
        const matchPlayers = await matchPlayerRepository.getPlayersForMatch(match.id);

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
        players = matchPlayers.map(mp => ({
          id: mp.player_number,
          num: mp.player_number,
          name: mp.player_name,
          team: mp.team,
          isSubstitute: !mp.is_starter,
        }));

        console.log('📂 [MatchHistory] Loaded', actionDataList.length, 'actions and', players.length, 'players from local DB');
      }

      // Determine which team is from the club by checking player_id
      // Players with player_id (not null) are from the club
      let clubTeamLetter: "A" | "B" | null = null;
      if (match.isFromServer && matchPlayers) {
        const teamAHasClubPlayers = matchPlayers.some(mp => mp.team === "A" && mp.player_id !== null);
        const teamBHasClubPlayers = matchPlayers.some(mp => mp.team === "B" && mp.player_id !== null);

        if (teamAHasClubPlayers && !teamBHasClubPlayers) {
          clubTeamLetter = "A";
        } else if (teamBHasClubPlayers && !teamAHasClubPlayers) {
          clubTeamLetter = "B";
        }
      }

      console.log('📋 [MatchHistory] Club team determined:', clubTeamLetter);

      // Navigate to MatchSummary
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
      });
    } catch (error) {
      console.error("Error loading match details:", error);
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

  const handleDeleteMatch = async (match: MatchWithDetails) => {
    Alert.alert(
      "Supprimer le match",
      `Êtes-vous sûr de vouloir supprimer le match ${match.team_a_name} vs ${match.team_b_name} ?\n\nCette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              // If match is from server, delete from Supabase
              if (match.isFromServer && match.serverMatchId) {
                const { error: deleteMatchError } = await supabase
                  .from("matches")
                  .delete()
                  .eq("id", match.serverMatchId);

                if (deleteMatchError) {
                  console.error("Error deleting match from server:", deleteMatchError);
                  Alert.alert("Erreur", "Impossible de supprimer le match du serveur.");
                  return;
                }

                console.log("✅ Match deleted from server successfully");
              } else {
                // Delete from local database
                const matchRepository = new MatchRepository();
                const actionRepository = new ActionRepository();
                const matchPlayerRepository = new MatchPlayerRepository();

                await actionRepository.deleteActionsForMatch(match.id);
                await matchPlayerRepository.deletePlayersForMatch(match.id);
                await matchRepository.delete(match.id);

                console.log("✅ Match deleted from local database successfully");
              }

              // Reload matches
              await loadCompletedMatches();
            } catch (error) {
              console.error("Error deleting match:", error);
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
      const isFreemium = !!user && eligibility.reason?.includes("abonnement");

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
              Alert.alert(
                "Succès",
                "Match synchronisé avec succès !",
                [{ text: "OK" }]
              );
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

    // Determine which team is from the club based on team_mode
    // team_mode "A" = managing team A (our club team)
    // team_mode "B" = managing team B (our club team)
    // team_mode "BOTH" = managing both teams (friendly match, no club)
    const clubTeam = item.team_mode === "A" ? "A" : item.team_mode === "B" ? "B" : null;
    const isClubMatch = clubTeam !== null; // Is there a club team involved?
    const clubWon = isClubMatch && winner === clubTeam;
    const clubLost = isClubMatch && winner !== null && winner !== clubTeam;

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => handleMatchPress(item)}
      >
        <View style={styles.matchHeader}>
          <Text style={styles.matchDate}>{formatDate(item.created_at)}</Text>
          <Text style={styles.matchDuration}>{formatDuration(item)}</Text>
        </View>

        <View style={styles.matchScore}>
          <View style={styles.teamContainer}>
            <Text
              style={[
                styles.teamName,
                // Green if team A won (and it's a club match with team A as club, or both teams mode)
                (clubTeam === "A" && clubWon) && styles.winnerText,
                // Red if team A lost and opponent won (club is team A)
                (clubTeam === "A" && clubLost) && styles.normalText,
                // Green if team A won but club is team B (opponent won against us)
                (clubTeam === "B" && winner === "A") && styles.loserText,
                // Normal victory for non-club match
                (!isClubMatch && winner === "A") && styles.winnerText,
              ]}
            >
              {item.team_a_name}
            </Text>
            <Text style={[
              styles.score,
              // Green if team A won and is club team
              (clubTeam === "A" && clubWon) && styles.winnerScore,
              // Red if team A won but club is team B (we lost)
              (clubTeam === "B" && winner === "A") && styles.loserScore,
              // Green for non-club match winner
              (!isClubMatch && winner === "A") && styles.winnerScore,
            ]}>
              {item.scoreA}
            </Text>
          </View>

          <Text style={styles.scoreSeparator}>-</Text>

          <View style={styles.teamContainer}>
            <Text
              style={[
                styles.teamName,
                // Green if team B won and is club team
                (clubTeam === "B" && clubWon) && styles.winnerText,
                // Normal if team B is club and lost
                (clubTeam === "B" && clubLost) && styles.normalText,
                // Red if team B won but club is team A (we lost)
                (clubTeam === "A" && winner === "B") && styles.loserText,
                // Normal victory for non-club match
                (!isClubMatch && winner === "B") && styles.winnerText,
              ]}
            >
              {item.team_b_name}
            </Text>
            <Text style={[
              styles.score,
              // Green if team B won and is club team
              (clubTeam === "B" && clubWon) && styles.winnerScore,
              // Red if team B won but club is team A (we lost)
              (clubTeam === "A" && winner === "B") && styles.loserScore,
              // Green for non-club match winner
              (!isClubMatch && winner === "B") && styles.winnerScore,
            ]}>
              {item.scoreB}
            </Text>
          </View>
        </View>

        {winner && (
          <View style={[
            styles.winnerBadge,
            clubLost && styles.loserBadge,
          ]}>
            <Text style={[
              styles.winnerBadgeText,
              clubLost && styles.loserBadgeText,
            ]} numberOfLines={1} ellipsizeMode="tail">
              {clubLost ? "😔" : "🏆"} {winner === "A" ? item.team_a_name : item.team_b_name}
            </Text>
          </View>
        )}

        {isDraw && (
          <View style={styles.drawBadge}>
            <Text style={styles.drawBadgeText}>Match nul</Text>
          </View>
        )}

        <View style={styles.matchFooter}>
          <Text style={styles.matchInfo}>
            {item.match_format === "2_halves" ? "2 mi-temps" : "4 quarts"} •{" "}
            {item.period_duration / 60} min
          </Text>

          {/* Sync status badge */}
          {item.isFromServer || item.synced_to_server ? (
            <View style={styles.syncedBadge}>
              <Ionicons name="cloud-done-outline" size={12} color="#4CAF50" />
              <Text style={styles.syncedText}>
                Synchronisé
              </Text>
            </View>
          ) : (
            <View style={styles.notSyncedBadge}>
              <Ionicons name="cloud-offline-outline" size={12} color="#FF9800" />
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
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historique des matchs</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#666" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historique des matchs</Text>
        <View style={styles.backButton} />
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>🏀</Text>
          <Text style={styles.emptyTitle}>Aucun match terminé</Text>
          <Text style={styles.emptySubtitle}>
            Les matchs terminés apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatchItem}
          keyExtractor={(item) => item.isFromServer && item.serverMatchId ? item.serverMatchId : item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Sync Error Modal */}
      <SyncErrorModal
        visible={syncErrorModalVisible}
        reason={syncErrorReason}
        isNotConnected={syncErrorIsNotConnected}
        isFreemium={syncErrorIsFreemium}
        onClose={() => setSyncErrorModalVisible(false)}
        onUpgrade={() => {
          // TODO: Navigate to subscription screen
          console.log("Navigate to subscription");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    width: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    color: "#666",
    fontWeight: "600",
  },
  matchDuration: {
    fontSize: 12,
    color: "#999",
  },
  matchScore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  teamContainer: {
    alignItems: "center",
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    fontWeight: "600",
  },
  score: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  scoreSeparator: {
    fontSize: 24,
    color: "#ccc",
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
