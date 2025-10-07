import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { ActionData } from "./ActionSystem";

interface MatchSummaryModalProps {
  visible: boolean;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  periodDuration: number;
  onViewDetails: () => void;
  onBackToMenu: () => void;
}

export default function MatchSummaryModal({
  visible,
  teamA,
  teamB,
  scoreA,
  scoreB,
  actions,
  matchFormat,
  periodDuration,
  onViewDetails,
  onBackToMenu,
}: MatchSummaryModalProps) {
  // Calculate winner
  const winner =
    scoreA > scoreB ? teamA : scoreB > scoreA ? teamB : null;

  // Calculate shooting statistics
  const calculateShootingStats = (team: "A" | "B") => {
    const teamShots = actions.filter(
      (action) => action.type === "tir" && action.team === team
    );

    const madeShots = teamShots.filter(
      (action) => action.specification === "reussi"
    );
    const missedShots = teamShots.filter(
      (action) => action.specification === "rate"
    );

    const totalShots = teamShots.length;
    const percentage =
      totalShots > 0 ? Math.round((madeShots.length / totalShots) * 100) : 0;

    // Count by points
    const onePointers = madeShots.filter((action) => action.points === 1).length;
    const twoPointers = madeShots.filter((action) => action.points === 2).length;
    const threePointers = madeShots.filter((action) => action.points === 3).length;

    return {
      made: madeShots.length,
      missed: missedShots.length,
      total: totalShots,
      percentage,
      onePointers,
      twoPointers,
      threePointers,
    };
  };

  const statsA = calculateShootingStats("A");
  const statsB = calculateShootingStats("B");

  // Calculate rebounds statistics
  const calculateReboundsStats = (team: "A" | "B") => {
    const teamRebounds = actions.filter(
      (action) => action.type === "rebond" && action.team === team
    );

    const offensive = teamRebounds.filter(
      (action) => action.specification === "offensif"
    ).length;
    const defensive = teamRebounds.filter(
      (action) => action.specification === "defensif"
    ).length;

    return {
      offensive,
      defensive,
      total: teamRebounds.length,
    };
  };

  const reboundsA = calculateReboundsStats("A");
  const reboundsB = calculateReboundsStats("B");

  // Calculate fouls statistics
  const calculateFoulsStats = (team: "A" | "B") => {
    const teamFouls = actions.filter(
      (action) => action.type === "faute" && action.team === team
    );

    const personal = teamFouls.filter(
      (action) => action.specification === "personnelle"
    ).length;
    const technical = teamFouls.filter(
      (action) => action.specification === "technique"
    ).length;

    return {
      personal,
      technical,
      total: teamFouls.length,
    };
  };

  const foulsA = calculateFoulsStats("A");
  const foulsB = calculateFoulsStats("B");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onBackToMenu}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🏀 Match Terminé</Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Final Score */}
            <View style={styles.scoreSection}>
              <Text style={styles.sectionTitle}>Score Final</Text>

              <View style={styles.scoreContainer}>
                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{teamA}</Text>
                  <Text
                    style={[
                      styles.score,
                      winner === teamA && styles.winnerScore,
                    ]}
                  >
                    {scoreA}
                  </Text>
                </View>

                <Text style={styles.scoreSeparator}>-</Text>

                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{teamB}</Text>
                  <Text
                    style={[
                      styles.score,
                      winner === teamB && styles.winnerScore,
                    ]}
                  >
                    {scoreB}
                  </Text>
                </View>
              </View>

              {/* Winner announcement */}
              {winner ? (
                <View style={styles.winnerBanner}>
                  <Text style={styles.winnerText}>
                    🏆 {winner} remporte le match !
                  </Text>
                </View>
              ) : (
                <View style={styles.drawBanner}>
                  <Text style={styles.drawText}>Match nul</Text>
                </View>
              )}
            </View>

            {/* Shooting Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques de tir</Text>

              {/* Team A Stats */}
              <View style={styles.teamStatsContainer}>
                <Text style={styles.teamStatsName}>{teamA}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Tirs réussis/total</Text>
                  <Text style={styles.statValue}>
                    {statsA.made}/{statsA.total}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Pourcentage de réussite</Text>
                  <Text style={styles.statValue}>{statsA.percentage}%</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Répartition</Text>
                  <Text style={styles.statValue}>
                    1pt: {statsA.onePointers} | 2pts: {statsA.twoPointers} | 3pts: {statsA.threePointers}
                  </Text>
                </View>
              </View>

              {/* Team B Stats */}
              <View style={[styles.teamStatsContainer, styles.teamStatsMargin]}>
                <Text style={styles.teamStatsName}>{teamB}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Tirs réussis/total</Text>
                  <Text style={styles.statValue}>
                    {statsB.made}/{statsB.total}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Pourcentage de réussite</Text>
                  <Text style={styles.statValue}>{statsB.percentage}%</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Répartition</Text>
                  <Text style={styles.statValue}>
                    1pt: {statsB.onePointers} | 2pts: {statsB.twoPointers} | 3pts: {statsB.threePointers}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rebounds and Fouls Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Rebonds & Fautes</Text>

              <View style={styles.compactStatsContainer}>
                {/* Team A */}
                <View style={styles.compactTeamStats}>
                  <Text style={styles.compactTeamName}>{teamA}</Text>

                  <View style={styles.compactStatItem}>
                    <Text style={styles.compactStatLabel}>Rebonds</Text>
                    <Text style={styles.compactStatValue}>{reboundsA.total}</Text>
                    <Text style={styles.compactStatDetail}>
                      (Off: {reboundsA.offensive} | Def: {reboundsA.defensive})
                    </Text>
                  </View>

                  <View style={styles.compactStatItem}>
                    <Text style={styles.compactStatLabel}>Fautes</Text>
                    <Text style={styles.compactStatValue}>{foulsA.total}</Text>
                    <Text style={styles.compactStatDetail}>
                      (Pers: {foulsA.personal} | Tech: {foulsA.technical})
                    </Text>
                  </View>
                </View>

                {/* Separator */}
                <View style={styles.compactSeparator} />

                {/* Team B */}
                <View style={styles.compactTeamStats}>
                  <Text style={styles.compactTeamName}>{teamB}</Text>

                  <View style={styles.compactStatItem}>
                    <Text style={styles.compactStatLabel}>Rebonds</Text>
                    <Text style={styles.compactStatValue}>{reboundsB.total}</Text>
                    <Text style={styles.compactStatDetail}>
                      (Off: {reboundsB.offensive} | Def: {reboundsB.defensive})
                    </Text>
                  </View>

                  <View style={styles.compactStatItem}>
                    <Text style={styles.compactStatLabel}>Fautes</Text>
                    <Text style={styles.compactStatValue}>{foulsB.total}</Text>
                    <Text style={styles.compactStatDetail}>
                      (Pers: {foulsB.personal} | Tech: {foulsB.technical})
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onViewDetails}
            >
              <Text style={styles.secondaryButtonText}>📊 Détails</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onBackToMenu}
            >
              <Text style={styles.primaryButtonText}>🏠 Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxWidth: 600,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    backgroundColor: "#FF6B35",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  scoreSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  teamScore: {
    alignItems: "center",
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  score: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
  },
  winnerScore: {
    color: "#4CAF50",
  },
  scoreSeparator: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ccc",
    marginHorizontal: 16,
  },
  winnerBanner: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  winnerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  drawBanner: {
    backgroundColor: "#FF9800",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  drawText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  statsSection: {
    marginBottom: 16,
  },
  teamStatsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  teamStatsMargin: {
    marginTop: 12,
    borderLeftColor: "#2196F3",
  },
  teamStatsName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  compactStatsContainer: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    gap: 16,
  },
  compactTeamStats: {
    flex: 1,
  },
  compactSeparator: {
    width: 1,
    backgroundColor: "#ddd",
  },
  compactTeamName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  compactStatItem: {
    marginBottom: 8,
  },
  compactStatLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  compactStatValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  compactStatDetail: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },
});
