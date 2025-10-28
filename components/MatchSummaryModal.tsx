import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ActionData } from "./ActionSystem";
import BasketballCourtSVG from "./BasketballCourtSVG";

interface MatchSummaryModalProps {
  visible: boolean;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  actions: ActionData[];
  matchFormat: "2_halves" | "4_quarters";
  periodDuration: number;
  teamMode: "A" | "B" | "both";
  onViewDetails: () => void;
  onBackToMenu: () => void;
  onBack?: () => void; // Optional back button when viewing from history
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
  teamMode,
  onViewDetails,
  onBackToMenu,
  onBack,
}: MatchSummaryModalProps) {
  // Local state for adjustable scores
  const [adjustedScoreA, setAdjustedScoreA] = React.useState(scoreA);
  const [adjustedScoreB, setAdjustedScoreB] = React.useState(scoreB);

  // Update local scores when props change
  React.useEffect(() => {
    setAdjustedScoreA(scoreA);
    setAdjustedScoreB(scoreB);
  }, [scoreA, scoreB]);

  // Calculate winner based on adjusted scores
  const winner =
    adjustedScoreA > adjustedScoreB
      ? teamA
      : adjustedScoreB > adjustedScoreA
      ? teamB
      : null;

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

    // Count by points (made)
    const onePointersMade = madeShots.filter(
      (action) => action.points === 1
    ).length;
    const twoPointersMade = madeShots.filter(
      (action) => action.points === 2
    ).length;
    const threePointersMade = madeShots.filter(
      (action) => action.points === 3
    ).length;

    // Count by points (total attempts)
    const onePtShots = teamShots.filter((action) => action.points === 1);
    const twoPtShots = teamShots.filter((action) => action.points === 2);
    const threePtShots = teamShots.filter((action) => action.points === 3);

    // Calculate percentages by point type
    const onePtPercentage =
      onePtShots.length > 0
        ? Math.round((onePointersMade / onePtShots.length) * 100)
        : 0;
    const twoPtPercentage =
      twoPtShots.length > 0
        ? Math.round((twoPointersMade / twoPtShots.length) * 100)
        : 0;
    const threePtPercentage =
      threePtShots.length > 0
        ? Math.round((threePointersMade / threePtShots.length) * 100)
        : 0;

    return {
      made: madeShots.length,
      missed: missedShots.length,
      total: totalShots,
      percentage,
      onePointersMade,
      twoPointersMade,
      threePointersMade,
      onePtTotal: onePtShots.length,
      twoPtTotal: twoPtShots.length,
      threePtTotal: threePtShots.length,
      onePtPercentage,
      twoPtPercentage,
      threePtPercentage,
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

  // Calculate scores by period
  const calculateScoresByPeriod = () => {
    const totalPeriods = matchFormat === "2_halves" ? 2 : 4;
    const periodScoresA: number[] = Array(totalPeriods).fill(0);
    const periodScoresB: number[] = Array(totalPeriods).fill(0);

    // Sort actions by timestamp
    const sortedActions = [...actions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Divide actions into periods based on their position in the timeline
    const actionsPerPeriod = Math.ceil(sortedActions.length / totalPeriods);

    sortedActions.forEach((action, index) => {
      // Determine which period this action belongs to
      const periodIndex = Math.min(
        Math.floor(index / actionsPerPeriod),
        totalPeriods - 1
      );

      // Only count successful shots for scoring
      if (action.type === "tir" && action.specification === "reussi") {
        const points = action.points || 2;
        if (action.team === "A") {
          periodScoresA[periodIndex] += points;
        } else if (action.team === "B") {
          periodScoresB[periodIndex] += points;
        }
      }
    });

    return { periodScoresA, periodScoresB, totalPeriods };
  };

  const { periodScoresA, periodScoresB, totalPeriods } =
    calculateScoresByPeriod();

  // State for court filter
  const [courtFilter, setCourtFilter] = React.useState<"both" | "A" | "B">(
    "both"
  );

  // Helper to get marker color based on action
  const getMarkerColor = (
    actionType: string,
    specification?: string
  ): string => {
    if (actionType === "tir") {
      return specification === "reussi" ? "#4CAF50" : "#F44336";
    }
    if (actionType === "rebond") {
      return specification === "offensif" ? "#FF9800" : "#2196F3";
    }
    if (actionType === "faute") {
      return specification === "technique" ? "#9C27B0" : "#E74C3C";
    }
    return "#757575";
  };

  // Convert actions to markers format
  const actionMarkers = actions.map((action, index) => ({
    id: `marker-${index}`,
    svgX: action.semanticPosition.xNormalized * 615.75,
    svgY: action.semanticPosition.yNormalized * 1146.749971,
    color: getMarkerColor(action.type, action.specification),
    team: action.team,
  }));

  // Filter markers based on selected filter
  const filteredMarkers = actionMarkers.filter((marker) => {
    if (courtFilter === "both") return true;
    return marker.team === courtFilter;
  });

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
                {/* Team A Score */}
                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{teamA}</Text>
                  <View style={styles.scoreAdjustContainer}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() =>
                        setAdjustedScoreA(Math.max(0, adjustedScoreA - 1))
                      }
                    >
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.scoreInput,
                        winner === teamA && styles.winnerScore,
                      ]}
                      value={adjustedScoreA.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setAdjustedScoreA(Math.max(0, value));
                      }}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setAdjustedScoreA(adjustedScoreA + 1)}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.scoreSeparator}>-</Text>

                {/* Team B Score */}
                <View style={styles.teamScore}>
                  <Text style={styles.teamName}>{teamB}</Text>
                  <View style={styles.scoreAdjustContainer}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() =>
                        setAdjustedScoreB(Math.max(0, adjustedScoreB - 1))
                      }
                    >
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.scoreInput,
                        winner === teamB && styles.winnerScore,
                      ]}
                      value={adjustedScoreB.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setAdjustedScoreB(Math.max(0, value));
                      }}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setAdjustedScoreB(adjustedScoreB + 1)}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
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

              {/* Period Scores Table */}
              <View style={styles.periodTable}>
                <View style={styles.periodTableHeader}>
                  <View style={styles.periodTableCellTeam}>
                    <Text style={styles.periodTableHeaderText}></Text>
                  </View>
                  {Array.from({ length: totalPeriods }).map((_, index) => (
                    <View key={index} style={styles.periodTableCell}>
                      <Text style={styles.periodTableHeaderText}>
                        {matchFormat === "2_halves"
                          ? `MT${index + 1}`
                          : `Q${index + 1}`}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.periodTableCell}>
                    <Text style={styles.periodTableHeaderText}>Total</Text>
                  </View>
                </View>

                {/* Team A Row */}
                <View style={styles.periodTableRow}>
                  <View style={styles.periodTableCellTeam}>
                    <Text style={styles.periodTableTeamText}>{teamA}</Text>
                  </View>
                  {periodScoresA.map((score, index) => {
                    // Only highlight winner if managing both teams
                    const isWinner =
                      teamMode === "both" && score > periodScoresB[index];
                    return (
                      <View
                        key={index}
                        style={[
                          styles.periodTableCell,
                          isWinner && styles.periodWinnerCell,
                        ]}
                      >
                        <Text
                          style={[
                            styles.periodTableScoreText,
                            isWinner && styles.periodWinnerText,
                          ]}
                        >
                          {score}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.periodTableCell}>
                    <Text style={styles.periodTableTotalText}>
                      {adjustedScoreA}
                    </Text>
                  </View>
                </View>

                {/* Team B Row - Only show if managing both teams */}
                {teamMode === "both" && (
                  <View style={styles.periodTableRow}>
                    <View style={styles.periodTableCellTeam}>
                      <Text style={styles.periodTableTeamText}>{teamB}</Text>
                    </View>
                    {periodScoresB.map((score, index) => {
                      const isWinner = score > periodScoresA[index];
                      return (
                        <View
                          key={index}
                          style={[
                            styles.periodTableCell,
                            isWinner && styles.periodWinnerCell,
                          ]}
                        >
                          <Text
                            style={[
                              styles.periodTableScoreText,
                              isWinner && styles.periodWinnerText,
                            ]}
                          >
                            {score}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={styles.periodTableCell}>
                      <Text style={styles.periodTableTotalText}>
                        {adjustedScoreB}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Shooting Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques de tir</Text>

              {/* Team A Stats */}
              <View style={styles.teamStatsContainer}>
                <Text style={styles.teamStatsName}>{teamA}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>
                    {statsA.made}/{statsA.total} ({statsA.percentage}%)
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>1 point</Text>
                  <Text style={styles.statValue}>
                    {statsA.onePointersMade}/{statsA.onePtTotal} (
                    {statsA.onePtPercentage}%)
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>2 points</Text>
                  <Text style={styles.statValue}>
                    {statsA.twoPointersMade}/{statsA.twoPtTotal} (
                    {statsA.twoPtPercentage}%)
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>3 points</Text>
                  <Text style={styles.statValue}>
                    {statsA.threePointersMade}/{statsA.threePtTotal} (
                    {statsA.threePtPercentage}%)
                  </Text>
                </View>
              </View>

              {/* Team B Stats - Only show if managing both teams */}
              {teamMode === "both" && (
                <View
                  style={[styles.teamStatsContainer, styles.teamStatsMargin]}
                >
                  <Text style={styles.teamStatsName}>{teamB}</Text>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>
                      {statsB.made}/{statsB.total} ({statsB.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>1 point</Text>
                    <Text style={styles.statValue}>
                      {statsB.onePointersMade}/{statsB.onePtTotal} (
                      {statsB.onePtPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>2 points</Text>
                    <Text style={styles.statValue}>
                      {statsB.twoPointersMade}/{statsB.twoPtTotal} (
                      {statsB.twoPtPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>3 points</Text>
                    <Text style={styles.statValue}>
                      {statsB.threePointersMade}/{statsB.threePtTotal} (
                      {statsB.threePtPercentage}%)
                    </Text>
                  </View>
                </View>
              )}
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
                    <Text style={styles.compactStatValue}>
                      {reboundsA.total}
                    </Text>
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

                {/* Separator - Only show if managing both teams */}
                {teamMode === "both" && (
                  <View style={styles.compactSeparator} />
                )}

                {/* Team B - Only show if managing both teams */}
                {teamMode === "both" && (
                  <View style={styles.compactTeamStats}>
                    <Text style={styles.compactTeamName}>{teamB}</Text>

                    <View style={styles.compactStatItem}>
                      <Text style={styles.compactStatLabel}>Rebonds</Text>
                      <Text style={styles.compactStatValue}>
                        {reboundsB.total}
                      </Text>
                      <Text style={styles.compactStatDetail}>
                        (Off: {reboundsB.offensive} | Def: {reboundsB.defensive}
                        )
                      </Text>
                    </View>

                    <View style={styles.compactStatItem}>
                      <Text style={styles.compactStatLabel}>Fautes</Text>
                      <Text style={styles.compactStatValue}>
                        {foulsB.total}
                      </Text>
                      <Text style={styles.compactStatDetail}>
                        (Pers: {foulsB.personal} | Tech: {foulsB.technical})
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Court Visualization */}
            <View style={styles.courtSection}>
              <Text style={styles.sectionTitle}>Visualisation du match</Text>

              {/* Filter buttons */}
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    courtFilter === "both" && styles.filterButtonActive,
                  ]}
                  onPress={() => setCourtFilter("both")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      courtFilter === "both" && styles.filterButtonTextActive,
                    ]}
                  >
                    Les deux
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    courtFilter === "A" && styles.filterButtonActive,
                  ]}
                  onPress={() => setCourtFilter("A")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      courtFilter === "A" && styles.filterButtonTextActive,
                    ]}
                  >
                    {teamA}
                  </Text>
                </TouchableOpacity>
                {teamMode === "both" && (
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      courtFilter === "B" && styles.filterButtonActive,
                    ]}
                    onPress={() => setCourtFilter("B")}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        courtFilter === "B" && styles.filterButtonTextActive,
                      ]}
                    >
                      {teamB}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Court with markers */}
              <View style={styles.courtContainer}>
                <View style={{ width: 250, height: 465 }}>
                  <BasketballCourtSVG
                    width={300}
                    height={558}
                    onCourtPress={() => {}}
                    markers={filteredMarkers}
                  />
                </View>
              </View>

              {/* Legend */}
              <View style={styles.courtLegend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#4CAF50" }]}
                  />
                  <Text style={styles.legendText}>Tir réussi</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#F44336" }]}
                  />
                  <Text style={styles.legendText}>Tir raté</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#FF9800" }]}
                  />
                  <Text style={styles.legendText}>Rebond Off.</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#2196F3" }]}
                  />
                  <Text style={styles.legendText}>Rebond Def.</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#E74C3C" }]}
                  />
                  <Text style={styles.legendText}>Faute Pers.</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: "#9C27B0" }]}
                  />
                  <Text style={styles.legendText}>Faute Tech.</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            {onBack ? (
              <TouchableOpacity
                style={[styles.button, styles.backButton]}
                onPress={onBack}
              >
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={styles.backButtonText}>Retour</Text>
              </TouchableOpacity>
            ) : (
              <>
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
              </>
            )}
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
  scoreAdjustContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  score: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    minWidth: 80,
    textAlign: "center",
  },
  scoreInput: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    minWidth: 80,
    textAlign: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f9f9f9",
  },
  winnerScore: {
    color: "#4CAF50",
    borderColor: "#4CAF50",
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
  periodTable: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  periodTableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
  },
  periodTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  periodTableCell: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
  },
  periodTableCellTeam: {
    flex: 1.5,
    padding: 8,
    justifyContent: "center",
    paddingLeft: 12,
  },
  periodWinnerCell: {
    backgroundColor: "#e8f5e9",
  },
  periodTableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  periodTableTeamText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  periodTableScoreText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  periodWinnerText: {
    fontWeight: "bold",
    color: "#4CAF50",
  },
  periodTableTotalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
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
  courtSection: {
    marginBottom: 16,
  },
  courtContainer: {
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    overflow: "visible",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  courtLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 0,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
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
  backButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 14,
  },
  backButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
