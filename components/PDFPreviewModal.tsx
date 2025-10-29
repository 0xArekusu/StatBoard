import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

interface Player {
  id: number;
  num: number;
  name: string;
  team: "A" | "B";
}

interface PDFPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  matchDate?: Date;
  periodScoresA: number[];
  periodScoresB: number[];
  cumulativeScoresA: number[];
  cumulativeScoresB: number[];
  statsTeamA: any[];
  statsTeamB: any[];
  periodLabel: string;
  teamMode: "A" | "B" | "BOTH";
  scoreManuallyAdjusted?: boolean;
}

export default function PDFPreviewModal({
  visible,
  onClose,
  teamA,
  teamB,
  scoreA,
  scoreB,
  matchDate = new Date(),
  periodScoresA,
  periodScoresB,
  cumulativeScoresA,
  cumulativeScoresB,
  statsTeamA,
  statsTeamB,
  periodLabel,
  teamMode,
  scoreManuallyAdjusted = false,
}: PDFPreviewModalProps) {
  const dateStr = matchDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const totalPeriods = periodScoresA.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aperçu PDF</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Preview Badge */}
        <View style={styles.previewBadge}>
          <Ionicons name="eye-outline" size={20} color="#FF6B35" />
          <Text style={styles.previewText}>APERÇU - Passez à Premium pour l'export PDF</Text>
        </View>

        {/* PDF Content */}
        <ScrollView style={styles.content}>
          {/* Match Header */}
          <View style={styles.pdfHeader}>
            <Text style={styles.pdfTitle}>🏀 Feuille de Match - Basketball</Text>
            <Text style={styles.pdfDate}>{dateStr}</Text>
          </View>

          {/* Score Summary */}
          <View style={styles.scoreSection}>
            <Text style={styles.matchInfo}>
              {teamA} vs {teamB}
            </Text>
            <View style={styles.finalScore}>
              <Text style={styles.finalScoreText}>
                {scoreA} - {scoreB}
              </Text>
            </View>
            {scoreManuallyAdjusted && (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                  ⚠️ Score ajusté manuellement - Les statistiques peuvent ne pas correspondre au score affiché
                </Text>
              </View>
            )}
          </View>

          {/* Period Scores */}
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>Scores par période</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableHeader]}>Équipe</Text>
                {periodScoresA.map((_, idx) => (
                  <Text key={idx} style={[styles.tableCell, styles.tableHeader]}>
                    {periodLabel}{idx + 1}
                  </Text>
                ))}
                <Text style={[styles.tableCell, styles.tableHeader]}>Total</Text>
              </View>

              {/* Team A */}
              {(teamMode === "A" || teamMode === "BOTH") && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.teamCell]}>{teamA}</Text>
                  {periodScoresA.map((score, idx) => (
                    <Text key={idx} style={styles.tableCell}>
                      {score}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, styles.totalCell]}>{scoreA}</Text>
                </View>
              )}

              {/* Team B */}
              {(teamMode === "B" || teamMode === "BOTH") && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.teamCell]}>{teamB}</Text>
                  {periodScoresB.map((score, idx) => (
                    <Text key={idx} style={styles.tableCell}>
                      {score}
                    </Text>
                  ))}
                  <Text style={[styles.tableCell, styles.totalCell]}>{scoreB}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Score Evolution Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Évolution du score</Text>
            <View style={styles.chartContainer}>
              <LineChart
              data={{
                labels: [
                  "Début",
                  ...Array.from({ length: totalPeriods }).map((_, i) =>
                    periodLabel === "MT" ? `MT${i + 1}` : `Q${i + 1}`
                  ),
                ],
                datasets: [
                  ...(teamMode === "A" || teamMode === "BOTH"
                    ? [
                        {
                          data: [0, ...cumulativeScoresA],
                          color: () => "#FF6B35",
                          strokeWidth: 3,
                        },
                      ]
                    : []),
                  ...(teamMode === "B" || teamMode === "BOTH"
                    ? [
                        {
                          data: [0, ...cumulativeScoresB],
                          color: () => "#004E89",
                          strokeWidth: 3,
                        },
                      ]
                    : []),
                ],
                legend: [
                  ...(teamMode === "A" || teamMode === "BOTH" ? [teamA] : []),
                  ...(teamMode === "B" || teamMode === "BOTH" ? [teamB] : []),
                ],
              }}
              width={Dimensions.get("window").width - 60}
              height={200}
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "4",
                  strokeWidth: "2",
                },
              }}
              bezier
              style={styles.chart}
            />
            {/* Watermark on chart */}
            <View style={styles.chartWatermark}>
              <Text style={styles.chartWatermarkText}>PREVIEW</Text>
            </View>
          </View>
        </View>

          {/* Team A Stats */}
          {statsTeamA.length > 0 && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques - {teamA}</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statsTable}>
                  <View style={styles.statsRow}>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 35 }]}>#</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 100 }]}>Joueur</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>PTS</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>2PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>3PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>LFM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RO</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RD</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RT</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>F</Text>
                  </View>
                  {statsTeamA.map((player) => {
                    const foulDisplay = player.stats.tf > 0
                      ? `${player.stats.pf + player.stats.tf} (${player.stats.tf}T)`
                      : `${player.stats.pf}`;
                    return (
                      <View key={player.id} style={styles.statsRow}>
                        <Text style={[styles.statsCell, { width: 35 }]}>{player.num}</Text>
                        <Text style={[styles.statsCell, { width: 100, textAlign: "left" }]}>{player.name}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.points}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.twopm}/{player.stats.twopa}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.threepm}/{player.stats.threepa}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.ftm}/{player.stats.fta}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.orb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.drb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.trb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{foulDisplay}</Text>
                      </View>
                    );
                  })}
                  {/* Totals row */}
                  <View style={[styles.statsRow, styles.totalsRow]}>
                    <Text style={[styles.statsCell, { width: 35 }]}></Text>
                    <Text style={[styles.statsCell, { width: 100, fontWeight: "bold", textAlign: "left" }]}>TOTAL</Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.points, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.twopm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.twopa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.threepm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.threepa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.ftm, 0)}/{statsTeamA.reduce((sum, p) => sum + p.stats.fta, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.orb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.drb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.trb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamA.reduce((sum, p) => sum + p.stats.pf + p.stats.tf, 0)}
                    </Text>
                  </View>
                </View>
                {/* Watermark on stats table */}
                <View style={styles.statsWatermark}>
                  <Text style={styles.statsWatermarkText}>PREVIEW</Text>
                </View>
              </View>
              <Text style={styles.legend}>
                PTS: Points | 2PM: 2 points | 3PM: 3 points | LFM: Lancers francs{"\n"}
                RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | F: Fautes
              </Text>
            </View>
          )}

          {/* Team B Stats */}
          {statsTeamB.length > 0 && (
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques - {teamB}</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statsTable}>
                  <View style={styles.statsRow}>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 35 }]}>#</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 100 }]}>Joueur</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>PTS</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>2PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>3PM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 50 }]}>LFM</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RO</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RD</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>RT</Text>
                    <Text style={[styles.statsCell, styles.statsHeader, { width: 40 }]}>F</Text>
                  </View>
                  {statsTeamB.map((player) => {
                    const foulDisplay = player.stats.tf > 0
                      ? `${player.stats.pf + player.stats.tf} (${player.stats.tf}T)`
                      : `${player.stats.pf}`;
                    return (
                      <View key={player.id} style={styles.statsRow}>
                        <Text style={[styles.statsCell, { width: 35 }]}>{player.num}</Text>
                        <Text style={[styles.statsCell, { width: 100, textAlign: "left" }]}>{player.name}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.points}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.twopm}/{player.stats.twopa}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.threepm}/{player.stats.threepa}</Text>
                        <Text style={[styles.statsCell, { width: 50 }]}>{player.stats.ftm}/{player.stats.fta}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.orb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.drb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{player.stats.trb}</Text>
                        <Text style={[styles.statsCell, { width: 40 }]}>{foulDisplay}</Text>
                      </View>
                    );
                  })}
                  {/* Totals row */}
                  <View style={[styles.statsRow, styles.totalsRow]}>
                    <Text style={[styles.statsCell, { width: 35 }]}></Text>
                    <Text style={[styles.statsCell, { width: 100, fontWeight: "bold", textAlign: "left" }]}>TOTAL</Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.points, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.twopm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.twopa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.threepm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.threepa, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 50, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.ftm, 0)}/{statsTeamB.reduce((sum, p) => sum + p.stats.fta, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.orb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.drb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.trb, 0)}
                    </Text>
                    <Text style={[styles.statsCell, { width: 40, fontWeight: "bold" }]}>
                      {statsTeamB.reduce((sum, p) => sum + p.stats.pf + p.stats.tf, 0)}
                    </Text>
                  </View>
                </View>
                {/* Watermark on stats table */}
                <View style={styles.statsWatermark}>
                  <Text style={styles.statsWatermarkText}>PREVIEW</Text>
                </View>
              </View>
              <Text style={styles.legend}>
                PTS: Points | 2PM: 2 points | 3PM: 3 points | LFM: Lancers francs{"\n"}
                RO: Rebonds offensifs | RD: Rebonds défensifs | RT: Rebonds totaux | F: Fautes
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B35",
  },
  previewText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  pdfHeader: {
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  pdfTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  pdfDate: {
    fontSize: 14,
    color: "#666",
  },
  scoreSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  matchInfo: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  finalScore: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  finalScoreText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  tableSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f0f0f0",
  },
  table: {
    borderWidth: 1,
    borderColor: "#333",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tableCell: {
    flex: 1,
    padding: 10,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  teamCell: {
    fontWeight: "bold",
    textAlign: "left",
  },
  totalCell: {
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
  },
  statsSection: {
    marginVertical: 20,
  },
  statsTable: {
    borderWidth: 1,
    borderColor: "#333",
  },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  statsCell: {
    flex: 1,
    padding: 8,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#333",
    fontSize: 12,
  },
  statsHeader: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  totalsRow: {
    backgroundColor: "#f9f9f9",
  },
  legend: {
    fontSize: 10,
    color: "#666",
    marginTop: 8,
    paddingHorizontal: 10,
  },
  statsContainer: {
    position: "relative",
    overflow: "hidden",
  },
  statsWatermark: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
    pointerEvents: "none",
    zIndex: 1,
  },
  statsWatermarkText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "rgba(255, 107, 53, 0.2)",
  },
  chartSection: {
    marginVertical: 20,
  },
  chartContainer: {
    position: "relative",
    alignItems: "center",
    overflow: "hidden",
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartWatermark: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    transform: [{ rotate: "-45deg" }],
    pointerEvents: "none",
    zIndex: 1,
  },
  chartWatermarkText: {
    fontSize: 50,
    fontWeight: "bold",
    color: "rgba(255, 107, 53, 0.2)",
  },
  warningBanner: {
    backgroundColor: "#FFF3E0",
    borderWidth: 2,
    borderColor: "#FF9800",
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  warningText: {
    color: "#E65100",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
});
