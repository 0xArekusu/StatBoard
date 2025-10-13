import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MatchRepository } from "../src/services/database/MatchRepository";
import { ActionRepository } from "../src/services/database/ActionRepository";
import { MatchPlayerRepository } from "../src/services/database/MatchPlayerRepository";
import { Match } from "../src/models/types";
import { ActionData } from "../components/ActionSystem";

interface MatchWithDetails extends Match {
  scoreA: number;
  scoreB: number;
  actionsCount: number;
}

export default function MatchHistoryScreen() {
  const navigation = useNavigation();
  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompletedMatches();
  }, []);

  const loadCompletedMatches = async () => {
    try {
      const matchRepository = new MatchRepository();
      const actionRepository = new ActionRepository();

      // Get all completed matches
      const allMatches = await matchRepository.getAllMatches();
      const completedMatches = allMatches.filter(
        (match) => match.status === "completed"
      );

      // Load details for each match
      const matchesWithDetails = await Promise.all(
        completedMatches.map(async (match) => {
          const actions = await actionRepository.getActionsForMatch(match.id);

          // Calculate scores
          const scoreA = actions
            .filter(
              (a) =>
                a.team === "A" &&
                a.action_type === "tir" &&
                a.specification === "reussi"
            )
            .reduce((sum, a) => {
              // Use stored points or default to 2 for backward compatibility
              const points = a.points || 2;
              return sum + points;
            }, 0);

          const scoreB = actions
            .filter(
              (a) =>
                a.team === "B" &&
                a.action_type === "tir" &&
                a.specification === "reussi"
            )
            .reduce((sum, a) => {
              // Use stored points or default to 2 for backward compatibility
              const points = a.points || 2;
              return sum + points;
            }, 0);

          return {
            ...match,
            scoreA,
            scoreB,
            actionsCount: actions.length,
          };
        })
      );

      // Sort by date (most recent first)
      matchesWithDetails.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setMatches(matchesWithDetails);
    } catch (error) {
      console.error("Error loading completed matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchPress = async (match: MatchWithDetails) => {
    try {
      const actionRepository = new ActionRepository();
      const matchPlayerRepository = new MatchPlayerRepository();

      // Load actions and players for this match
      const actions = await actionRepository.getActionsForMatch(match.id);
      const matchPlayers = await matchPlayerRepository.getPlayersForMatch(match.id);

      // Convert actions to ActionData format
      const actionDataList: ActionData[] = actions.map((action) => ({
        type: action.action_type,
        specification: action.specification,
        points: action.points, // Use stored points from DB
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
      const players = matchPlayers.map(mp => ({
        id: mp.id,
        num: mp.player_number,
        name: mp.player_name,
        team: mp.team,
        isSubstitute: mp.is_starter === 0,
      }));

      // Navigate to MatchSummary
      navigation.navigate(
        "MatchSummary" as never,
        {
          teamA: match.team_a_name,
          teamB: match.team_b_name,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          actions: actionDataList,
          matchFormat: match.match_format,
          periodDuration: match.period_duration,
          teamMode: match.team_mode,
          players,
          fromHistory: true, // Indicate this is from history (read-only mode)
        } as never
      );
    } catch (error) {
      console.error("Error loading match details:", error);
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

  const renderMatchItem = ({ item }: { item: MatchWithDetails }) => {
    const winner =
      item.scoreA > item.scoreB ? "A" : item.scoreB > item.scoreA ? "B" : null;

    const isDraw = !winner;

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
              style={[styles.teamName, winner === "A" && styles.winnerText]}
            >
              {item.team_a_name}
            </Text>
            <Text style={[styles.score, winner === "A" && styles.winnerScore]}>
              {item.scoreA}
            </Text>
          </View>

          <Text style={styles.scoreSeparator}>-</Text>

          <View style={styles.teamContainer}>
            <Text
              style={[styles.teamName, winner === "B" && styles.winnerText]}
            >
              {item.team_b_name}
            </Text>
            <Text style={[styles.score, winner === "B" && styles.winnerScore]}>
              {item.scoreB}
            </Text>
          </View>
        </View>

        {winner && (
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerBadgeText}>
              🏆 {winner === "A" ? item.team_a_name : item.team_b_name}
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
            <Text style={styles.backButtonText}>← Retour</Text>
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
          <Text style={styles.backButtonText}>← Retour</Text>
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
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  },
  backButtonText: {
    fontSize: 16,
    color: "#4CAF50",
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
  winnerText: {
    color: "#4CAF50",
  },
  winnerScore: {
    color: "#4CAF50",
  },
  winnerBadge: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  winnerBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
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
  },
  matchInfo: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
